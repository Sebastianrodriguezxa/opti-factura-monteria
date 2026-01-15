/**
 * Motor de Análisis - OptiFactura Montería
 * Analiza facturas y detecta anomalías
 */

/**
 * Analiza una factura
 * @param {Object} extractedData Datos extraídos de la factura
 * @param {Array} historicalData Datos históricos
 * @param {number} referenceTariff Tarifa de referencia
 * @param {string} userId ID del usuario
 * @returns {Promise<Object>} Resultado del análisis
 */
async function analyzeBill(extractedData, historicalData, referenceTariff, userId) {
  try {
    console.log(`Analizando factura para usuario ${userId}`)

    const result = {
      anomalies: [],
      recommendations: [],
      consumptionAnalysis: {},
      tarifaDifference: 0,
      tarifaPercentageDifference: 0,
    }

    // Analizar tarifa
    if (extractedData.unitPrice && referenceTariff) {
      const difference = extractedData.unitPrice - referenceTariff
      const percentageDifference = (difference / referenceTariff) * 100

      result.tarifaDifference = difference
      result.tarifaPercentageDifference = percentageDifference

      // Detectar anomalía si la diferencia es significativa
      if (percentageDifference > 5) {
        result.anomalies.push({
          type: "tariff_overcharge",
          severity: percentageDifference > 10 ? "high" : "medium",
          description: `La tarifa aplicada es ${percentageDifference.toFixed(2)}% mayor que la tarifa de referencia`,
          details: {
            appliedTariff: extractedData.unitPrice,
            referenceTariff,
            difference,
            percentageDifference,
          },
        })

        result.recommendations.push({
          type: "verify_tariff",
          description: "Verificar la tarifa aplicada con el proveedor",
          details: {
            appliedTariff: extractedData.unitPrice,
            referenceTariff,
            difference,
            percentageDifference,
          },
        })
      }
    }

    // Analizar consumo histórico
    if (extractedData.consumption && historicalData && historicalData.length > 0) {
      // Calcular promedio de consumo histórico
      const historicalConsumption = historicalData.map((item) => item.consumo)
      const averageConsumption =
        historicalConsumption.reduce((sum, value) => sum + value, 0) / historicalConsumption.length

      // Calcular desviación estándar
      const squaredDifferences = historicalConsumption.map((value) => Math.pow(value - averageConsumption, 2))
      const variance = squaredDifferences.reduce((sum, value) => sum + value, 0) / historicalConsumption.length
      const standardDeviation = Math.sqrt(variance)

      // Calcular diferencia con el consumo actual
      const consumptionDifference = extractedData.consumption - averageConsumption
      const consumptionPercentageDifference = (consumptionDifference / averageConsumption) * 100

      // Guardar análisis de consumo
      result.consumptionAnalysis = {
        currentConsumption: extractedData.consumption,
        averageConsumption,
        standardDeviation,
        consumptionDifference,
        consumptionPercentageDifference,
      }

      // Detectar anomalía si el consumo es significativamente mayor
      if (consumptionPercentageDifference > 30) {
        result.anomalies.push({
          type: "high_consumption",
          severity: consumptionPercentageDifference > 50 ? "high" : "medium",
          description: `El consumo actual es ${consumptionPercentageDifference.toFixed(2)}% mayor que tu consumo promedio`,
          details: {
            currentConsumption: extractedData.consumption,
            averageConsumption,
            difference: consumptionDifference,
            percentageDifference: consumptionPercentageDifference,
          },
        })

        result.recommendations.push({
          type: "check_consumption",
          description: "Verificar posibles fugas o consumos no autorizados",
          details: {
            currentConsumption: extractedData.consumption,
            averageConsumption,
            difference: consumptionDifference,
            percentageDifference: consumptionPercentageDifference,
          },
        })
      }

      // Detectar anomalía si el consumo es significativamente menor (posible error de lectura)
      if (consumptionPercentageDifference < -50) {
        result.anomalies.push({
          type: "low_consumption",
          severity: "low",
          description: `El consumo actual es ${Math.abs(consumptionPercentageDifference).toFixed(2)}% menor que tu consumo promedio`,
          details: {
            currentConsumption: extractedData.consumption,
            averageConsumption,
            difference: consumptionDifference,
            percentageDifference: consumptionPercentageDifference,
          },
        })

        result.recommendations.push({
          type: "verify_meter_reading",
          description: "Verificar la lectura del medidor",
          details: {
            currentConsumption: extractedData.consumption,
            averageConsumption,
            difference: consumptionDifference,
            percentageDifference: consumptionPercentageDifference,
          },
        })
      }
    }

    // Verificar coherencia entre consumo, tarifa y total
    if (extractedData.consumption && extractedData.unitPrice && extractedData.totalAmount) {
      const calculatedTotal = extractedData.consumption * extractedData.unitPrice
      const totalDifference = extractedData.totalAmount - calculatedTotal
      const totalPercentageDifference = (totalDifference / calculatedTotal) * 100

      // Detectar anomalía si hay diferencia significativa
      if (Math.abs(totalPercentageDifference) > 5) {
        result.anomalies.push({
          type: "billing_inconsistency",
          severity: Math.abs(totalPercentageDifference) > 10 ? "high" : "medium",
          description: `El total facturado no coincide con el consumo y la tarifa (diferencia de ${totalPercentageDifference.toFixed(2)}%)`,
          details: {
            billedTotal: extractedData.totalAmount,
            calculatedTotal,
            difference: totalDifference,
            percentageDifference: totalPercentageDifference,
          },
        })

        result.recommendations.push({
          type: "verify_bill_calculation",
          description: "Verificar el cálculo del total de la factura",
          details: {
            billedTotal: extractedData.totalAmount,
            calculatedTotal,
            difference: totalDifference,
            percentageDifference: totalPercentageDifference,
          },
        })
      }
    }

    return result
  } catch (error) {
    console.error(`Error al analizar factura: ${error.message}`)
    throw error
  }
}

module.exports = {
  analyzeBill,
}
