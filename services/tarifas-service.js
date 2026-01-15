const TarifasScraper = require("../lib/tarifas-scraper")
const cron = require("node-cron")
const path = require("path")
const fs = require("fs").promises

class TarifasService {
  constructor(options = {}) {
    this.options = {
      dirTarifas: options.dirTarifas || "./datos_tarifas",
      expresionCron: options.expresionCron || "0 0 1 * *", // Primer día de cada mes
      umbralDiferencia: options.umbralDiferencia || 5, // 5% de diferencia máxima permitida
      ...options,
    }

    this.prisma = options.prisma

    this.scraper = new TarifasScraper({
      headless: true,
      outputDir: this.options.dirTarifas,
      logLevel: options.logLevel || "info",
    })

    this.tarifasCacheadas = {
      afinia: null,
      veolia: null,
      surtigas: null,
    }

    this.inicializado = false
    this.tareaActualizacion = null
  }

  /**
   * Inicializa el servicio de tarifas
   */
  async inicializar() {
    if (this.inicializado) return

    try {
      console.log("Inicializando servicio de tarifas...")

      // Crear directorio de tarifas si no existe
      await fs.mkdir(this.options.dirTarifas, { recursive: true })

      // Cargar tarifas desde la base de datos
      await this.cargarTarifasDesdeDB()

      // Verificar si es necesario actualizar tarifas
      const ultimaActualizacion = await this.obtenerUltimaActualizacion()
      const ahora = new Date()
      const diferenciaDias = Math.floor((ahora - ultimaActualizacion) / (1000 * 60 * 60 * 24))

      if (diferenciaDias > 30) {
        console.log("Han pasado más de 30 días desde la última actualización. Actualizando tarifas...")
        await this.actualizarTodasLasTarifas()
      } else {
        console.log(`Última actualización hace ${diferenciaDias} días. No es necesario actualizar.`)
      }

      this.inicializado = true
      console.log("Servicio de tarifas inicializado correctamente")
    } catch (error) {
      console.error(`Error al inicializar servicio de tarifas: ${error.message}`)
      throw error
    }
  }

  /**
   * Carga las tarifas desde la base de datos
   */
  async cargarTarifasDesdeDB() {
    try {
      console.log("Cargando tarifas desde la base de datos...")

      const proveedores = ["afinia", "veolia", "surtigas"]

      for (const proveedor of proveedores) {
        // Determinar servicio según proveedor
        let servicio
        if (proveedor === "afinia") {
          servicio = "electricidad"
        } else if (proveedor === "veolia") {
          servicio = "agua"
        } else if (proveedor === "surtigas") {
          servicio = "gas"
        }

        // Obtener tarifas vigentes
        const tarifas = await this.prisma.tarifaReferencia.findMany({
          where: {
            proveedor: proveedor.charAt(0).toUpperCase() + proveedor.slice(1),
            servicio,
            fechaFin: null, // Tarifas vigentes
          },
          orderBy: {
            fechaInicio: "desc",
          },
        })

        // Obtener subsidios vigentes
        const subsidios = await this.prisma.subsidioTarifa.findMany({
          where: {
            proveedor: proveedor.charAt(0).toUpperCase() + proveedor.slice(1),
            servicio,
            fechaFin: null, // Subsidios vigentes
          },
          orderBy: {
            fechaInicio: "desc",
          },
        })

        // Obtener componentes de tarifa
        const componentes = await this.prisma.componenteTarifa.findMany({
          where: {
            proveedor: proveedor.charAt(0).toUpperCase() + proveedor.slice(1),
            servicio,
          },
          orderBy: {
            fechaRegistro: "desc",
          },
          distinct: ["nombre"],
        })

        // Obtener última actualización
        const ultimaActualizacion = await this.prisma.actualizacionTarifas.findFirst({
          where: {
            proveedor: proveedor.charAt(0).toUpperCase() + proveedor.slice(1),
            servicio,
          },
          orderBy: {
            fechaActualizacion: "desc",
          },
        })

        // Estructurar resultado
        this.tarifasCacheadas[proveedor] = {
          proveedor: proveedor.charAt(0).toUpperCase() + proveedor.slice(1),
          servicio,
          tarifas,
          subsidios,
          componentes,
          fechaActualizacion: ultimaActualizacion?.fechaActualizacion || new Date(0),
        }

        console.log(`Tarifas de ${proveedor} cargadas desde la base de datos`)
      }
    } catch (error) {
      console.error(`Error al cargar tarifas desde la base de datos: ${error.message}`)
      throw error
    }
  }

  /**
   * Obtiene la fecha de la última actualización de tarifas
   * @returns {Date} Fecha de la última actualización
   */
  async obtenerUltimaActualizacion() {
    try {
      const ultimaActualizacion = await this.prisma.actualizacionTarifas.findFirst({
        orderBy: {
          fechaActualizacion: "desc",
        },
      })

      return ultimaActualizacion?.fechaActualizacion || new Date(0)
    } catch (error) {
      console.error(`Error al obtener última actualización: ${error.message}`)
      return new Date(0)
    }
  }

  /**
   * Programa la actualización automática de tarifas
   */
  programarActualizacionTarifas() {
    if (this.tareaActualizacion) {
      this.tareaActualizacion.stop()
    }

    this.tareaActualizacion = cron.schedule(this.options.expresionCron, async () => {
      try {
        console.log("Ejecutando actualización programada de tarifas...")
        await this.actualizarTodasLasTarifas()
        console.log("Actualización programada completada")
      } catch (error) {
        console.error(`Error en actualización programada: ${error.message}`)
      }
    })

    console.log(`Actualización de tarifas programada con expresión: ${this.options.expresionCron}`)
  }

  /**
   * Actualiza todas las tarifas
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async actualizarTodasLasTarifas() {
    try {
      console.log("Actualizando todas las tarifas...")

      // Inicializar scraper si es necesario
      if (!this.scraper.browser) {
        await this.scraper.inicializar()
      }

      // Extraer tarifas
      const resultado = {
        afinia: null,
        veolia: null,
        surtigas: null,
        errores: [],
      }

      // Extraer tarifas de Afinia
      try {
        console.log("Extrayendo tarifas de Afinia...")
        const tarifasAfinia = await this.scraper.extraerTarifasAfinia()
        resultado.afinia = tarifasAfinia
        await this.guardarTarifasEnDB("Afinia", "electricidad", tarifasAfinia)
      } catch (error) {
        console.error(`Error al extraer tarifas de Afinia: ${error.message}`)
        resultado.errores.push({
          proveedor: "Afinia",
          error: error.message,
        })
      }

      // Extraer tarifas de Veolia
      try {
        console.log("Extrayendo tarifas de Veolia...")
        const tarifasVeolia = await this.scraper.extraerTarifasVeolia()
        resultado.veolia = tarifasVeolia
        await this.guardarTarifasEnDB("Veolia", "agua", tarifasVeolia)
      } catch (error) {
        console.error(`Error al extraer tarifas de Veolia: ${error.message}`)
        resultado.errores.push({
          proveedor: "Veolia",
          error: error.message,
        })
      }

      // Extraer tarifas de Surtigas
      try {
        console.log("Extrayendo tarifas de Surtigas...")
        const tarifasSurtigas = await this.scraper.extraerTarifasSurtigas()
        resultado.surtigas = tarifasSurtigas
        await this.guardarTarifasEnDB("Surtigas", "gas", tarifasSurtigas)
      } catch (error) {
        console.error(`Error al extraer tarifas de Surtigas: ${error.message}`)
        resultado.errores.push({
          proveedor: "Surtigas",
          error: error.message,
        })
      }

      // Actualizar caché
      await this.cargarTarifasDesdeDB()

      console.log("Todas las tarifas actualizadas correctamente")
      return resultado
    } catch (error) {
      console.error(`Error al actualizar tarifas: ${error.message}`)
      throw error
    }
  }

  /**
   * Guarda las tarifas extraídas en la base de datos
   * @param {string} proveedor Nombre del proveedor
   * @param {string} servicio Tipo de servicio
   * @param {Object} datos Datos extraídos
   */
  async guardarTarifasEnDB(proveedor, servicio, datos) {
    try {
      console.log(`Guardando tarifas de ${proveedor} en la base de datos...`)

      // Crear registro de actualización
      const actualizacion = await this.prisma.actualizacionTarifas.create({
        data: {
          proveedor,
          servicio,
          fechaActualizacion: new Date(),
          url: datos.url || null,
          metadatos: JSON.stringify({
            fechaExtraccion: new Date(),
            version: "1.0",
          }),
        },
      })

      // Marcar tarifas anteriores como no vigentes
      await this.prisma.tarifaReferencia.updateMany({
        where: {
          proveedor,
          servicio,
          fechaFin: null,
        },
        data: {
          fechaFin: new Date(),
        },
      })

      // Guardar nuevas tarifas
      for (const tarifa of datos.tarifas) {
        await this.prisma.tarifaReferencia.create({
          data: {
            actualizacionId: actualizacion.id,
            proveedor,
            servicio,
            estrato: tarifa.estrato,
            cargoFijo: tarifa.cargoFijo || 0,
            valorConsumo: tarifa.tarifa,
            unidad: servicio === "electricidad" ? "kWh" : "m³",
            fechaInicio: new Date(),
            region: "Montería",
          },
        })
      }

      // Guardar subsidios
      if (datos.subsidios && datos.subsidios.length > 0) {
        // Marcar subsidios anteriores como no vigentes
        await this.prisma.subsidioTarifa.updateMany({
          where: {
            proveedor,
            servicio,
            fechaFin: null,
          },
          data: {
            fechaFin: new Date(),
          },
        })

        // Guardar nuevos subsidios
        for (const subsidio of datos.subsidios) {
          await this.prisma.subsidioTarifa.create({
            data: {
              actualizacionId: actualizacion.id,
              proveedor,
              servicio,
              estrato: subsidio.estrato,
              porcentaje: subsidio.porcentaje,
              fechaInicio: new Date(),
              region: "Montería",
            },
          })
        }
      }

      // Guardar componentes
      if (datos.componentes && Object.keys(datos.componentes).length > 0) {
        for (const [nombre, valor] of Object.entries(datos.componentes)) {
          await this.prisma.componenteTarifa.create({
            data: {
              actualizacionId: actualizacion.id,
              proveedor,
              servicio,
              nombre,
              valor: Number.parseFloat(valor),
              fechaRegistro: new Date(),
            },
          })
        }
      }

      console.log(`Tarifas de ${proveedor} guardadas correctamente`)
    } catch (error) {
      console.error(`Error al guardar tarifas en la base de datos: ${error.message}`)
      throw error
    }
  }

  /**
   * Obtiene la tarifa de referencia para un proveedor, servicio y estrato
   * @param {string} proveedor Nombre del proveedor
   * @param {string} tipoServicio Tipo de servicio
   * @param {string} estrato Estrato
   * @param {string} tipoUsuario Tipo de usuario (Residencial, Comercial, etc.)
   * @returns {Promise<Object>} Tarifa de referencia
   */
  async obtenerTarifaReferencia(proveedor, tipoServicio, estrato, tipoUsuario = "Residencial") {
    if (!this.inicializado) {
      await this.inicializar()
    }

    // Normalizar parámetros
    proveedor = proveedor.toLowerCase()
    tipoServicio = tipoServicio.toLowerCase()
    tipoUsuario = tipoUsuario.charAt(0).toUpperCase() + tipoUsuario.slice(1).toLowerCase()

    // Validar proveedor
    if (!["afinia", "veolia", "surtigas"].includes(proveedor)) {
      throw new Error(`Proveedor no soportado: ${proveedor}`)
    }

    // Obtener datos de tarifas
    const datosTarifas = this.tarifasCacheadas[proveedor]

    if (!datosTarifas) {
      throw new Error(`No hay datos de tarifas disponibles para ${proveedor}`)
    }

    // Buscar tarifa específica
    const tarifaEncontrada = datosTarifas.tarifas.find((tarifa) =>
      tipoUsuario === "Residencial" ? tarifa.estrato === estrato.toString() : true,
    )

    if (!tarifaEncontrada) {
      // Si no se encuentra la tarifa específica, buscar una similar
      const tarifasSimilares = datosTarifas.tarifas

      if (tarifasSimilares.length > 0) {
        // Devolver la primera tarifa similar
        return {
          valor: tarifasSimilares[0].valorConsumo,
          cargoFijo: tarifasSimilares[0].cargoFijo,
          unidad: proveedor === "afinia" ? "kWh" : "m³",
          moneda: "COP",
          fechaActualizacion: datosTarifas.fechaActualizacion,
          aproximado: true,
        }
      }

      throw new Error(`No se encontró tarifa para ${tipoUsuario} estrato ${estrato} en ${proveedor}`)
    }

    // Buscar subsidio si aplica
    let subsidio = null
    if (tipoUsuario === "Residencial" && estrato <= 3) {
      subsidio = datosTarifas.subsidios.find((s) => s.estrato === estrato.toString())
    }

    // Devolver la tarifa encontrada
    return {
      valor: tarifaEncontrada.valorConsumo,
      cargoFijo: tarifaEncontrada.cargoFijo,
      unidad: proveedor === "afinia" ? "kWh" : "m³",
      moneda: "COP",
      fechaActualizacion: datosTarifas.fechaActualizacion,
      subsidio: subsidio ? subsidio.porcentaje : null,
      aproximado: false,
    }
  }

  /**
   * Obtiene todas las tarifas
   * @returns {Promise<Object>} Todas las tarifas
   */
  async obtenerTodasLasTarifas() {
    if (!this.inicializado) {
      await this.inicializar()
    }

    return this.tarifasCacheadas
  }

  /**
   * Cierra el servicio de tarifas
   */
  async cerrar() {
    if (this.tareaActualizacion) {
      this.tareaActualizacion.stop()
    }

    if (this.scraper.browser) {
      await this.scraper.cerrar()
    }
  }
}

module.exports = TarifasService
