const { processFileWithOCR, extractStructuredData } = require("../lib/ocr/processor")
const { analyzeBill } = require("../lib/analysis/engine")
const path = require("path")
const fs = require("fs").promises

class AnalisisService {
  constructor(options = {}) {
    this.options = {
      dirResultados: options.dirResultados || "./resultados_analisis",
      ...options,
    }

    this.prisma = options.prisma
    this.tarifasService = options.tarifasService
    this.inicializado = false
  }

  /**
   * Inicializa el servicio de análisis
   */
  async inicializar() {
    if (this.inicializado) return

    try {
      console.log("Inicializando servicio de análisis...")

      // Crear directorio de resultados si no existe
      await fs.mkdir(this.options.dirResultados, { recursive: true })

      this.inicializado = true
      console.log("Servicio de análisis inicializado correctamente")
    } catch (error) {
      console.error(`Error al inicializar servicio de análisis: ${error.message}`)
      throw error
    }
  }

  /**
   * Analiza una factura
   * @param {string} rutaArchivo Ruta del archivo de la factura
   * @param {string} userId ID del usuario
   * @param {Object} opciones Opciones adicionales
   * @returns {Promise<Object>} Resultado del análisis
   */
  async analizarFactura(rutaArchivo, userId, opciones = {}) {
    if (!this.inicializado) {
      await this.inicializar()
    }

    try {
      console.log(`Analizando factura: ${rutaArchivo}`)

      // Paso 1: Procesar archivo con OCR
      const fileType = rutaArchivo.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"
      const ocrText = await processFileWithOCR(rutaArchivo, fileType)

      // Paso 2: Extraer datos estructurados
      const serviceType = opciones.tipoServicio || "electricity" // Por defecto electricidad
      const extractedData = await extractStructuredData(ocrText, serviceType, userId)

      // Paso 3: Obtener tarifa de referencia
      let proveedor, tipoServicio

      // Mapear proveedor detectado a los proveedores del scraper
      if (
        extractedData.provider.name.toLowerCase().includes("afinia") ||
        extractedData.provider.name.toLowerCase().includes("air-e")
      ) {
        proveedor = "afinia"
        tipoServicio = "electricidad"
      } else if (
        extractedData.provider.name.toLowerCase().includes("veolia") ||
        extractedData.provider.name.toLowerCase().includes("aguas")
      ) {
        proveedor = "veolia"
        tipoServicio = "agua"
      } else if (
        extractedData.provider.name.toLowerCase().includes("surtigas") ||
        extractedData.provider.name.toLowerCase().includes("gas")
      ) {
        proveedor = "surtigas"
        tipoServicio = "gas"
      } else {
        throw new Error(`Proveedor no soportado: ${extractedData.provider.name}`)
      }

      // Determinar estrato o tipo de usuario
      let estrato = "1" // Valor por defecto
      let tipoUsuario = "Residencial" // Valor por defecto

      if (extractedData.tariffType) {
        const tipoTarifa = extractedData.tariffType.toLowerCase()

        if (tipoTarifa.includes("estrato")) {
          // Extraer número de estrato
          const match = tipoTarifa.match(/\d+/)
          if (match) {
            estrato = match[0]
          }
          tipoUsuario = "Residencial"
        } else if (tipoTarifa.includes("comercial")) {
          tipoUsuario = "Comercial"
          estrato = "N/A"
        } else if (tipoTarifa.includes("industrial")) {
          tipoUsuario = "Industrial"
          estrato = "N/A"
        } else if (tipoTarifa.includes("oficial")) {
          tipoUsuario = "Oficial"
          estrato = "N/A"
        }
      }

      console.log(
        `Consultando tarifa de referencia para ${proveedor}, ${tipoServicio}, estrato ${estrato}, tipo ${tipoUsuario}`,
      )

      // Obtener tarifa de referencia
      const tarifaReferencia = await this.tarifasService.obtenerTarifaReferencia(
        proveedor,
        tipoServicio,
        estrato,
        tipoUsuario,
      )

      console.log(
        `Tarifa de referencia obtenida: ${tarifaReferencia.valor} ${tarifaReferencia.moneda}/${tarifaReferencia.unidad}`,
      )

      // Paso 4: Obtener datos históricos
      const historicalData = await this.obtenerDatosHistoricos(userId, proveedor)

      // Paso 5: Analizar la factura con la tarifa de referencia
      const analysisResult = await analyzeBill(extractedData, historicalData, tarifaReferencia.valor, userId)

      // Paso 6: Guardar resultado del análisis
      const resultadoGuardado = await this.guardarResultadoAnalisis(
        userId,
        extractedData,
        tarifaReferencia,
        analysisResult,
      )

      // Enriquecer el resultado con información de la tarifa de referencia
      analysisResult.tarifaReferencia = {
        valor: tarifaReferencia.valor,
        cargoFijo: tarifaReferencia.cargoFijo,
        unidad: tarifaReferencia.unidad,
        moneda: tarifaReferencia.moneda,
        fechaActualizacion: tarifaReferencia.fechaActualizacion,
        subsidio: tarifaReferencia.subsidio,
        aproximado: tarifaReferencia.aproximado,
      }

      return {
        extractedData,
        analysisResult,
        id: resultadoGuardado.id,
      }
    } catch (error) {
      console.error(`Error al analizar factura: ${error.message}`)
      throw error
    }
  }

  /**
   * Obtiene datos históricos de facturas para un usuario y proveedor
   * @param {string} userId ID del usuario
   * @param {string} proveedor Nombre del proveedor
   * @returns {Promise<Array>} Datos históricos
   */
  async obtenerDatosHistoricos(userId, proveedor) {
    try {
      const historicalData = await this.prisma.analisisFactura.findMany({
        where: {
          userId,
          proveedor: {
            contains: proveedor,
            mode: "insensitive",
          },
        },
        orderBy: {
          fechaFactura: "desc",
        },
        take: 12, // Último año
      })

      return historicalData.map((item) => ({
        fecha: item.fechaFactura,
        consumo: item.consumo,
        valorFactura: item.valorTotal,
        valorUnitario: item.valorUnitario,
      }))
    } catch (error) {
      console.error(`Error al obtener datos históricos: ${error.message}`)
      return []
    }
  }

  /**
   * Guarda el resultado del análisis en la base de datos
   * @param {string} userId ID del usuario
   * @param {Object} extractedData Datos extraídos de la factura
   * @param {Object} tarifaReferencia Tarifa de referencia
   * @param {Object} analysisResult Resultado del análisis
   * @returns {Promise<Object>} Resultado guardado
   */
  async guardarResultadoAnalisis(userId, extractedData, tarifaReferencia, analysisResult) {
    try {
      const resultado = await this.prisma.analisisFactura.create({
        data: {
          userId,
          proveedor: extractedData.provider.name,
          numeroFactura: extractedData.billNumber,
          fechaFactura: extractedData.billDate || new Date(),
          fechaVencimiento: extractedData.dueDate || new Date(),
          consumo: extractedData.consumption,
          unidadConsumo: extractedData.consumptionUnit,
          valorUnitario: extractedData.unitPrice,
          valorTotal: extractedData.totalAmount,
          tarifaReferencia: tarifaReferencia.valor,
          diferenciaTarifa: analysisResult.tarifaDifference || 0,
          porcentajeDiferencia: analysisResult.tarifaPercentageDifference || 0,
          anomalias: JSON.stringify(analysisResult.anomalies || []),
          recomendaciones: JSON.stringify(analysisResult.recommendations || []),
          metadatos: JSON.stringify({
            subsidio: tarifaReferencia.subsidio,
            cargoFijo: tarifaReferencia.cargoFijo,
            aproximado: tarifaReferencia.aproximado,
          }),
        },
      })

      return resultado
    } catch (error) {
      console.error(`Error al guardar resultado del análisis: ${error.message}`)
      throw error
    }
  }

  /**
   * Obtiene los análisis de facturas de un usuario
   * @param {string} userId ID del usuario
   * @param {Object} opciones Opciones de filtrado
   * @returns {Promise<Array>} Análisis de facturas
   */
  async obtenerAnalisisUsuario(userId, opciones = {}) {
    try {
      const { proveedor, fechaInicio, fechaFin, limite = 10, pagina = 1 } = opciones

      const filtro = {
        userId,
      }

      if (proveedor) {
        filtro.proveedor = {
          contains: proveedor,
          mode: "insensitive",
        }
      }

      if (fechaInicio || fechaFin) {
        filtro.fechaFactura = {}

        if (fechaInicio) {
          filtro.fechaFactura.gte = new Date(fechaInicio)
        }

        if (fechaFin) {
          filtro.fechaFactura.lte = new Date(fechaFin)
        }
      }

      const analisis = await this.prisma.analisisFactura.findMany({
        where: filtro,
        orderBy: {
          fechaFactura: "desc",
        },
        skip: (pagina - 1) * limite,
        take: limite,
      })

      const total = await this.prisma.analisisFactura.count({
        where: filtro,
      })

      return {
        analisis,
        total,
        pagina,
        limite,
        paginas: Math.ceil(total / limite),
      }
    } catch (error) {
      console.error(`Error al obtener análisis de usuario: ${error.message}`)
      throw error
    }
  }

  /**
   * Obtiene estadísticas de consumo y gasto para un usuario
   * @param {string} userId ID del usuario
   * @param {Object} opciones Opciones de filtrado
   * @returns {Promise<Object>} Estadísticas
   */
  async obtenerEstadisticas(userId, opciones = {}) {
    try {
      const { proveedor, periodo = 12 } = opciones

      const filtro = {
        userId,
      }

      if (proveedor) {
        filtro.proveedor = {
          contains: proveedor,
          mode: "insensitive",
        }
      }

      // Obtener fecha límite (hace X meses)
      const fechaLimite = new Date()
      fechaLimite.setMonth(fechaLimite.getMonth() - periodo)

      filtro.fechaFactura = {
        gte: fechaLimite,
      }

      // Obtener datos para estadísticas
      const analisis = await this.prisma.analisisFactura.findMany({
        where: filtro,
        orderBy: {
          fechaFactura: "asc",
        },
      })

      // Calcular estadísticas
      const estadisticas = {
        consumoPromedio: 0,
        gastoPromedio: 0,
        consumoTotal: 0,
        gastoTotal: 0,
        tendenciaConsumo: [],
        tendenciaGasto: [],
        ahorroEstimado: 0,
        anomaliasMasComunes: [],
      }

      if (analisis.length > 0) {
        // Calcular totales y promedios
        estadisticas.consumoTotal = analisis.reduce((sum, item) => sum + item.consumo, 0)
        estadisticas.gastoTotal = analisis.reduce((sum, item) => sum + item.valorTotal, 0)
        estadisticas.consumoPromedio = estadisticas.consumoTotal / analisis.length
        estadisticas.gastoPromedio = estadisticas.gastoTotal / analisis.length

        // Calcular tendencias
        estadisticas.tendenciaConsumo = analisis.map((item) => ({
          fecha: item.fechaFactura,
          valor: item.consumo,
        }))

        estadisticas.tendenciaGasto = analisis.map((item) => ({
          fecha: item.fechaFactura,
          valor: item.valorTotal,
        }))

        // Calcular ahorro estimado
        const ahorroTotal = analisis.reduce((sum, item) => {
          const diferencia = item.diferenciaTarifa > 0 ? item.diferenciaTarifa * item.consumo : 0
          return sum + diferencia
        }, 0)

        estadisticas.ahorroEstimado = ahorroTotal

        // Calcular anomalías más comunes
        const anomalias = {}

        analisis.forEach((item) => {
          const anomaliasItem = JSON.parse(item.anomalias || "[]")

          anomaliasItem.forEach((anomalia) => {
            if (!anomalias[anomalia.type]) {
              anomalias[anomalia.type] = 0
            }

            anomalias[anomalia.type]++
          })
        })

        estadisticas.anomaliasMasComunes = Object.entries(anomalias)
          .map(([tipo, cantidad]) => ({ tipo, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad)
      }

      return estadisticas
    } catch (error) {
      console.error(`Error al obtener estadísticas: ${error.message}`)
      throw error
    }
  }
}

module.exports = AnalisisService
