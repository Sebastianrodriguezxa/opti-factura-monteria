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
/**
 * Analiza una factura con lógica detallada de verificación
 * @param {Object} extractedData Datos extraídos de la factura
 * @param {Array} historicalData Datos históricos
 * @param {Object} referenceTariff Objeto de tarifa de referencia (valor, cargoFijo, subsidio, etc)
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

    // 1. ANÁLISIS DE COSTO JUSTO (Shadow Billing)
    // Calcula cuánto debería pagar el usuario exactamente según consumo y tarifa oficial
    if (extractedData.consumption !== undefined &&
      extractedData.totalAmount !== undefined &&
      referenceTariff) {

      const consumo = extractedData.consumption
      const tarifaValor = referenceTariff.valor || 0
      const cargoFijoOficial = referenceTariff.cargoFijo || 0

      // Manejar referenciaTariff.subsidio que puede venir como null, undefined o número
      let subsidioPorcentaje = 0
      if (typeof referenceTariff.subsidio === 'number') {
        subsidioPorcentaje = Math.abs(referenceTariff.subsidio) // Asegurar positivo para cálculo
      }

      // Definir tope de subsistencia según unidad/servicio
      let topeSubsistencia = Infinity
      let unidad = referenceTariff.unidad || extractedData.consumptionUnit || ''

      // Intentar inferir servicio si no viene explícito
      if (unidad.toLowerCase().includes('kwh')) {
        topeSubsistencia = 173 // Electricidad (Costa Caribe < 1000msnm)
      } else if (unidad.toLowerCase().includes('m3') || unidad.toLowerCase().includes('m³')) {
        // Diferenciar Gas vs Agua si es posible, por defecto asume Gas (tope 20)
        // Si el precio es bajo (<2000) probablemente es gas
        if (tarifaValor > 3000) {
          topeSubsistencia = 13 // Agua (aprox promedio)
        } else {
          topeSubsistencia = 20 // Gas
        }
      }

      // Cálculo detallado
      const costoEnergiaBase = consumo * tarifaValor

      // Calcular subsidio (solo aplica al CU, y solo hasta el tope de subsistencia)
      let subsidioValor = 0
      if (subsidioPorcentaje > 0) {
        const consumoSubsidiable = Math.min(consumo, topeSubsistencia)
        subsidioValor = consumoSubsidiable * tarifaValor * (subsidioPorcentaje / 100)
      }

      // Contribución (estratos 5, 6, comercial)
      let contribucionValor = 0
      if (referenceTariff.subsidio < 0) { // Si es negativo es subsidio, si es positivo es contribución
        // Lógica previa manejaba subsidio como negativo. 
        // Si referenceTariff.subsidio > 0 significa contribución (ej: 20%)
      } else if (referenceTariff.subsidio > 0) {
        // Es contribución
        subsidioValor = 0 // No hay subsidio
        const contribucionPorcentaje = referenceTariff.subsidio
        contribucionValor = costoEnergiaBase * (contribucionPorcentaje / 100)
      }

      // Total Esperado (Costo Justo)
      // Fórmula: (Consumo * CU) + Cargo Fijo - Subsidio + Contribución
      const totalEsperado = costoEnergiaBase + cargoFijoOficial - subsidioValor + contribucionValor

      // Comparar con Total Facturado
      const totalFacturado = extractedData.totalAmount
      const diferenciaTotal = totalFacturado - totalEsperado
      const porcentajeErrorTotal = (diferenciaTotal / totalEsperado) * 100

      // Guardar desglose para frontend
      result.shadowBilling = {
        consumo,
        tarifaAplicada: extractedData.unitPrice,
        tarifaOficial: tarifaValor,
        cargoFijoOficial,
        topeSubsistencia: topeSubsistencia === Infinity ? 'Sin límite' : topeSubsistencia,
        subsidioAplicado: subsidioValor,
        contribucionAplicada: contribucionValor,
        totalEsperado,
        totalFacturado,
        diferencia: diferenciaTotal
      }

      // Detectar anomalía de cobro injustificado
      // Umbral de 5% de tolerancia por redondeos o impuestos (alumbrado, aseo en factura de energía, etc)
      // Nota: Idealmente deberíamos restar impuestos del total facturado antes de comparar, 
      // pero como extractedData suele ser el "Total a Pagar", asumimos 5-10% de margen.
      const umbralTolerancia = 10

      if (porcentajeErrorTotal > umbralTolerancia) {
        result.anomalies.push({
          type: "unjustified_charge",
          severity: porcentajeErrorTotal > 20 ? "high" : "medium",
          description: `Te están cobrando un ${porcentajeErrorTotal.toFixed(1)}% más de lo calculado según tarifas oficiales`,
          details: {
            mensaje: "El cálculo basado en tu consumo y las tarifas reguladas no coincide con el total.",
            esperado: totalEsperado,
            cobrado: totalFacturado,
            diferencia: diferenciaTotal,
            desglose: result.shadowBilling
          }
        })

        result.recommendations.push({
          type: "claim_refund",
          description: "Iniciar reclamo por cobro no justificado",
          details: {
            pasos: [
              "Descarga el detalle de este análisis",
              "Contacta a la línea de atención al cliente",
              "Solicita una explicación detallada del cálculo"
            ]
          }
        })
      }
    }

    // 2. ANÁLISIS DE TARIFA UNITARIA (CU)
    // Compara solo el valor unitario por si acaso (útil si la factura no tiene total legible)
    if (extractedData.unitPrice && referenceTariff.valor) {
      // Usar referenciaTariff.valor en lugar de referenceTariff
      const valorReferencia = referenceTariff.valor
      const difference = extractedData.unitPrice - valorReferencia
      const percentageDifference = (difference / valorReferencia) * 100

      result.tarifaDifference = difference
      result.tarifaPercentageDifference = percentageDifference

      // Detectar anomalía si la diferencia es significativa (> 5%)
      if (percentageDifference > 5) {
        result.anomalies.push({
          type: "tariff_overcharge",
          severity: percentageDifference > 10 ? "high" : "medium",
          description: `La tarifa por unidad ($${extractedData.unitPrice}) es ${percentageDifference.toFixed(1)}% mayor a la oficial ($${valorReferencia})`,
          details: {
            appliedTariff: extractedData.unitPrice,
            referenceTariff: valorReferencia,
            difference,
            percentageDifference,
          },
        })
      }
    }

    // 3. ANÁLISIS DE CONSUMO HISTÓRICO
    if (extractedData.consumption && historicalData && historicalData.length > 0) {
      // Calcular promedio de consumo histórico
      const historicalConsumption = historicalData.map((item) => item.consumo)
      const averageConsumption =
        historicalConsumption.reduce((sum, value) => sum + value, 0) / historicalConsumption.length

      // Calcular diferencia con el consumo actual
      const consumptionDifference = extractedData.consumption - averageConsumption
      const consumptionPercentageDifference = (consumptionDifference / averageConsumption) * 100

      // Guardar análisis de consumo
      result.consumptionAnalysis = {
        currentConsumption: extractedData.consumption,
        averageConsumption,
        consumptionDifference,
        consumptionPercentageDifference,
      }

      // Detectar anomalía si el consumo es significativamente mayor
      if (consumptionPercentageDifference > 30) {
        result.anomalies.push({
          type: "high_consumption",
          severity: consumptionPercentageDifference > 50 ? "high" : "medium",
          description: `Tu consumo aumentó un ${consumptionPercentageDifference.toFixed(0)}% frente a tu promedio`,
          details: {
            currentConsumption: extractedData.consumption,
            averageConsumption,
            difference: consumptionDifference,
          }
        })

        result.recommendations.push({
          type: "check_consumption",
          description: "Revisar electrodomésticos o posibles fugas internas",
          details: {}
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
