const TarifasScraper = require("./tarifas-scraper")
const ConsultaTarifas = require("./consulta-tarifas")
const { prisma } = require("./db")
const fs = require("fs/promises")
const path = require("path")

/**
 * Verificador de tarifas extraídas
 * Fase 2 - OptiFactura Montería
 */
class VerificadorTarifas {
  constructor(options = {}) {
    this.options = {
      umbralDiferencia: options.umbralDiferencia || 5, // 5% de diferencia máxima permitida
      dirResultados: options.dirResultados || "./verificacion_tarifas",
      logLevel: options.logLevel || "info",
      ...options,
    }

    this.scraper = new TarifasScraper({
      headless: true,
      logLevel: this.options.logLevel,
    })

    this.consultaTarifas = new ConsultaTarifas()
  }

  /**
   * Verifica la precisión de las tarifas extraídas
   * @returns {Promise<Object>} Resultado de la verificación
   */
  async verificarTarifas() {
    try {
      console.log("Iniciando verificación de tarifas...")

      // Crear directorio de resultados si no existe
      await fs.mkdir(this.options.dirResultados, { recursive: true })

      // Inicializar scraper
      await this.scraper.inicializar()

      // Obtener tarifas actuales de la base de datos
      const tarifasDB = await this.obtenerTarifasActuales()

      // Extraer tarifas actuales de los sitios web
      const tarifasExtraidas = await this.extraerTarifasActuales()

      // Comparar tarifas
      const resultadosComparacion = await this.compararTarifas(tarifasDB, tarifasExtraidas)

      // Generar informe de verificación
      const informe = await this.generarInformeVerificacion(resultadosComparacion)

      // Guardar informe
      await fs.writeFile(
        path.join(this.options.dirResultados, `informe_verificacion_${new Date().toISOString().split("T")[0]}.json`),
        JSON.stringify(informe, null, 2),
      )

      // Cerrar scraper
      await this.scraper.cerrar()

      console.log("Verificación de tarifas completada")
      return informe
    } catch (error) {
      console.error(`Error al verificar tarifas: ${error.message}`)

      // Cerrar scraper en caso de error
      if (this.scraper.browser) {
        await this.scraper.cerrar()
      }

      throw error
    }
  }

  /**
   * Obtiene las tarifas actuales de la base de datos
   * @returns {Promise<Object>} Tarifas actuales
   */
  async obtenerTarifasActuales() {
    try {
      const proveedores = ["Afinia", "Veolia", "Surtigas"]
      const resultado = {}

      for (const proveedor of proveedores) {
        // Determinar servicio según proveedor
        let servicio
        if (proveedor === "Afinia") {
          servicio = "electricidad"
        } else if (proveedor === "Veolia") {
          servicio = "agua"
        } else if (proveedor === "Surtigas") {
          servicio = "gas"
        }

        // Obtener tarifas vigentes
        const tarifas = await prisma.tarifaReferencia.findMany({
          where: {
            proveedor,
            servicio,
            fechaFin: null, // Tarifas vigentes
          },
          orderBy: {
            fechaInicio: "desc",
          },
        })

        // Obtener subsidios vigentes
        const subsidios = await prisma.subsidioTarifa.findMany({
          where: {
            proveedor,
            servicio,
            fechaFin: null, // Subsidios vigentes
          },
          orderBy: {
            fechaInicio: "desc",
          },
        })

        // Obtener componentes de tarifa
        const componentes = await prisma.componenteTarifa.findMany({
          where: {
            proveedor,
            servicio,
          },
          orderBy: {
            fechaRegistro: "desc",
          },
          distinct: ["nombre"],
        })

        // Estructurar resultado
        resultado[proveedor.toLowerCase()] = {
          proveedor,
          servicio,
          tarifas,
          subsidios,
          componentes,
        }
      }

      return resultado
    } catch (error) {
      console.error(`Error al obtener tarifas actuales: ${error.message}`)
      throw error
    }
  }

  /**
   * Extrae las tarifas actuales de los sitios web
   * @returns {Promise<Object>} Tarifas extraídas
   */
  async extraerTarifasActuales() {
    try {
      const resultado = {}

      // Extraer tarifas de Afinia
      try {
        const tarifasAfinia = await this.scraper.extraerTarifasAfinia()
        resultado.afinia = tarifasAfinia
      } catch (error) {
        console.error(`Error al extraer tarifas de Afinia: ${error.message}`)
        resultado.afinia = { error: error.message }
      }

      // Extraer tarifas de Veolia
      try {
        const tarifasVeolia = await this.scraper.extraerTarifasVeolia()
        resultado.veolia = tarifasVeolia
      } catch (error) {
        console.error(`Error al extraer tarifas de Veolia: ${error.message}`)
        resultado.veolia = { error: error.message }
      }

      // Extraer tarifas de Surtigas
      try {
        const tarifasSurtigas = await this.scraper.extraerTarifasSurtigas()
        resultado.surtigas = tarifasSurtigas
      } catch (error) {
        console.error(`Error al extraer tarifas de Surtigas: ${error.message}`)
        resultado.surtigas = { error: error.message }
      }

      return resultado
    } catch (error) {
      console.error(`Error al extraer tarifas actuales: ${error.message}`)
      throw error
    }
  }

  /**
   * Compara las tarifas de la base de datos con las extraídas
   * @param {Object} tarifasDB Tarifas de la base de datos
   * @param {Object} tarifasExtraidas Tarifas extraídas
   * @returns {Promise<Object>} Resultado de la comparación
   */
  async compararTarifas(tarifasDB, tarifasExtraidas) {
    try {
      const resultado = {
        afinia: { diferencias: [], errores: [] },
        veolia: { diferencias: [], errores: [] },
        surtigas: { diferencias: [], errores: [] },
      }

      // Comparar tarifas de Afinia
      if (tarifasExtraidas.afinia && !tarifasExtraidas.afinia.error) {
        const tarifasDBAfinia = tarifasDB.afinia
        const tarifasExtraidasAfinia = tarifasExtraidas.afinia

        // Comparar tarifas por estrato
        for (const tarifaExtraida of tarifasExtraidasAfinia.tarifas) {
          const tarifaDB = tarifasDBAfinia.tarifas.find((t) => t.estrato === tarifaExtraida.estrato)

          if (!tarifaDB) {
            resultado.afinia.diferencias.push({
              tipo: "tarifa_no_encontrada",
              estrato: tarifaExtraida.estrato,
              valorExtraido: tarifaExtraida.tarifa,
            })
            continue
          }

          // Comparar valor de tarifa
          const valorExtraido = tarifaExtraida.tarifa
          const valorDB = tarifaDB.valorConsumo
          const diferenciaPorcentaje = Math.abs(((valorExtraido - valorDB) / valorDB) * 100)

          if (diferenciaPorcentaje > this.options.umbralDiferencia) {
            resultado.afinia.diferencias.push({
              tipo: "diferencia_tarifa",
              estrato: tarifaExtraida.estrato,
              valorDB: valorDB,
              valorExtraido: valorExtraido,
              diferenciaPorcentaje: diferenciaPorcentaje.toFixed(2),
            })
          }
        }
      }

      // Comparar tarifas de Veolia
      if (tarifasExtraidas.veolia && !tarifasExtraidas.veolia.error) {
        const tarifasDBVeolia = tarifasDB.veolia
        const tarifasExtraidasVeolia = tarifasExtraidas.veolia

        for (const tarifaExtraida of tarifasExtraidasVeolia.tarifas) {
          const tarifaDB = tarifasDBVeolia.tarifas.find((t) => t.estrato === tarifaExtraida.estrato)

          if (!tarifaDB) {
            resultado.veolia.diferencias.push({
              tipo: "tarifa_no_encontrada",
              estrato: tarifaExtraida.estrato,
              valorExtraido: tarifaExtraida.tarifa,
            })
            continue
          }

          const valorExtraido = tarifaExtraida.tarifa
          const valorDB = tarifaDB.valorConsumo
          const diferenciaPorcentaje = Math.abs(((valorExtraido - valorDB) / valorDB) * 100)

          if (diferenciaPorcentaje > this.options.umbralDiferencia) {
            resultado.veolia.diferencias.push({
              tipo: "diferencia_tarifa",
              estrato: tarifaExtraida.estrato,
              valorDB: valorDB,
              valorExtraido: valorExtraido,
              diferenciaPorcentaje: diferenciaPorcentaje.toFixed(2),
            })
          }
        }
      }

      // Comparar tarifas de Surtigas
      if (tarifasExtraidas.surtigas && !tarifasExtraidas.surtigas.error) {
        const tarifasDBSurtigas = tarifasDB.surtigas
        const tarifasExtrairadasSurtigas = tarifasExtraidas.surtigas

        for (const tarifaExtraida of tarifasExtrairadasSurtigas.tarifas) {
          const tarifaDB = tarifasDBSurtigas.tarifas.find((t) => t.estrato === tarifaExtraida.estrato)

          if (!tarifaDB) {
            resultado.surtigas.diferencias.push({
              tipo: "tarifa_no_encontrada",
              estrato: tarifaExtraida.estrato,
              valorExtraido: tarifaExtraida.tarifa,
            })
            continue
          }

          const valorExtraido = tarifaExtraida.tarifa
          const valorDB = tarifaDB.valorConsumo
          const diferenciaPorcentaje = Math.abs(((valorExtraido - valorDB) / valorDB) * 100)

          if (diferenciaPorcentaje > this.options.umbralDiferencia) {
            resultado.surtigas.diferencias.push({
              tipo: "diferencia_tarifa",
              estrato: tarifaExtraida.estrato,
              valorDB: valorDB,
              valorExtraido: valorExtraido,
              diferenciaPorcentaje: diferenciaPorcentaje.toFixed(2),
            })
          }
        }
      }

      return resultado
    } catch (error) {
      console.error(`Error al comparar tarifas: ${error.message}`)
      throw error
    }
  }

  /**
   * Genera un informe de verificación
   * @param {Object} resultadosComparacion Resultados de la comparación
   * @returns {Promise<Object>} Informe de verificación
   */
  async generarInformeVerificacion(resultadosComparacion) {
    try {
      return {
        fecha: new Date().toISOString(),
        resumen: {
          proveedoresVerificados: 3,
          diferenciasDetectadas: Object.values(resultadosComparacion).reduce(
            (total, prov) => total + prov.diferencias.length,
            0,
          ),
          erroresDetectados: Object.values(resultadosComparacion).reduce(
            (total, prov) => total + prov.errores.length,
            0,
          ),
        },
        detalles: resultadosComparacion,
      }
    } catch (error) {
      console.error(`Error al generar informe: ${error.message}`)
      throw error
    }
  }
}

module.exports = VerificadorTarifas
