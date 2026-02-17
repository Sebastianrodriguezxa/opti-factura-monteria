const TarifasScraper = require("../lib/tarifas-scraper")
const cron = require("node-cron")
const path = require("path")
const fs = require("fs").promises

// Tarifas de referencia CREG/CRA (datos oficiales de regulación colombiana)
// Estos se usan como fallback cuando la DB está vacía o los scrapers fallan
const TARIFAS_REFERENCIA_FALLBACK = {
  afinia: {
    proveedor: "Afinia",
    servicio: "electricidad",
    tarifas: [
      { estrato: "1", valorConsumo: 487.37, cargoFijo: 5200 },
      { estrato: "2", valorConsumo: 609.22, cargoFijo: 6500 },
      { estrato: "3", valorConsumo: 731.06, cargoFijo: 7800 },
      { estrato: "4", valorConsumo: 812.29, cargoFijo: 8700 },
      { estrato: "5", valorConsumo: 974.74, cargoFijo: 10400 },
      { estrato: "6", valorConsumo: 974.74, cargoFijo: 10400 },
    ],
    subsidios: [
      { estrato: "1", porcentaje: -60 },
      { estrato: "2", porcentaje: -50 },
      { estrato: "3", porcentaje: -15 },
      { estrato: "4", porcentaje: 0 },
      { estrato: "5", porcentaje: 20 },
      { estrato: "6", porcentaje: 20 },
    ],
    componentes: [],
    fechaActualizacion: new Date(),
    aproximado: true,
  },
  veolia: {
    proveedor: "Veolia",
    servicio: "agua",
    tarifas: [
      { estrato: "1", valorConsumo: 875.50, cargoFijo: 4200 },
      { estrato: "2", valorConsumo: 1751.00, cargoFijo: 8400 },
      { estrato: "3", valorConsumo: 2480.58, cargoFijo: 11900 },
      { estrato: "4", valorConsumo: 2918.33, cargoFijo: 14000 },
      { estrato: "5", valorConsumo: 3501.99, cargoFijo: 16800 },
      { estrato: "6", valorConsumo: 3501.99, cargoFijo: 16800 },
    ],
    subsidios: [
      { estrato: "1", porcentaje: -70 },
      { estrato: "2", porcentaje: -40 },
      { estrato: "3", porcentaje: -15 },
      { estrato: "4", porcentaje: 0 },
      { estrato: "5", porcentaje: 20 },
      { estrato: "6", porcentaje: 20 },
    ],
    componentes: [],
    fechaActualizacion: new Date(),
    aproximado: true,
  },
  surtigas: {
    proveedor: "Surtigas",
    servicio: "gas",
    tarifas: [
      { estrato: "1", valorConsumo: 813.47, cargoFijo: 3800 },
      { estrato: "2", valorConsumo: 1016.84, cargoFijo: 4750 },
      { estrato: "3", valorConsumo: 2033.68, cargoFijo: 9500 },
      { estrato: "4", valorConsumo: 2033.68, cargoFijo: 9500 },
      { estrato: "5", valorConsumo: 2440.42, cargoFijo: 11400 },
      { estrato: "6", valorConsumo: 2440.42, cargoFijo: 11400 },
    ],
    subsidios: [
      { estrato: "1", porcentaje: -60 },
      { estrato: "2", porcentaje: -50 },
      { estrato: "3", porcentaje: 0 },
      { estrato: "4", porcentaje: 0 },
      { estrato: "5", porcentaje: 20 },
      { estrato: "6", porcentaje: 20 },
    ],
    componentes: [],
    fechaActualizacion: new Date(),
    aproximado: true,
  },
}

class TarifasService {
  constructor(options = {}) {
    this.options = {
      dirTarifas: options.dirTarifas || "./datos_tarifas",
      expresionCron: options.expresionCron || "0 6 * * 0",
      umbralDiferencia: options.umbralDiferencia || 5,
      umbralAlertaCambio: options.umbralAlertaCambio || 5,
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

      this.inicializado = true
      console.log("✅ Servicio de tarifas inicializado correctamente")
    } catch (error) {
      console.error(`Error al inicializar servicio de tarifas: ${error.message}`)
      // Cargar datos de fallback para que el sistema funcione
      this.cargarDatosFallback()
      this.inicializado = true
      console.log("⚠️ Servicio de tarifas inicializado con datos de referencia (fallback)")
    }
  }

  /**
   * Carga datos de referencia como fallback cuando la DB no está disponible
   */
  cargarDatosFallback() {
    console.log("Cargando tarifas de referencia como fallback...")
    for (const [proveedor, datos] of Object.entries(TARIFAS_REFERENCIA_FALLBACK)) {
      this.tarifasCacheadas[proveedor] = { ...datos }
    }
    console.log("✅ Tarifas de referencia cargadas (Afinia, Veolia, Surtigas)")
  }

  /**
   * Carga las tarifas desde la base de datos
   */
  async cargarTarifasDesdeDB() {
    try {
      console.log("Cargando tarifas desde la base de datos...")

      const proveedores = ["afinia", "veolia", "surtigas"]
      let tieneDatos = false

      for (const proveedor of proveedores) {
        let servicio
        if (proveedor === "afinia") servicio = "electricidad"
        else if (proveedor === "veolia") servicio = "agua"
        else if (proveedor === "surtigas") servicio = "gas"

        // Obtener tarifas vigentes
        const tarifas = await this.prisma.tarifaReferencia.findMany({
          where: {
            proveedor: proveedor.charAt(0).toUpperCase() + proveedor.slice(1),
            servicio,
            fechaFin: null,
          },
          orderBy: { fechaInicio: "desc" },
        })

        if (tarifas.length > 0) {
          tieneDatos = true

          // Obtener subsidios vigentes
          const subsidios = await this.prisma.subsidioTarifa.findMany({
            where: {
              proveedor: proveedor.charAt(0).toUpperCase() + proveedor.slice(1),
              servicio,
              fechaFin: null,
            },
            orderBy: { fechaInicio: "desc" },
          })

          // Obtener componentes
          const componentes = await this.prisma.componenteTarifa.findMany({
            where: {
              proveedor: proveedor.charAt(0).toUpperCase() + proveedor.slice(1),
              servicio,
            },
            orderBy: { fechaRegistro: "desc" },
            distinct: ["nombre"],
          })

          // Obtener última actualización
          const ultimaActualizacion = await this.prisma.actualizacionTarifas.findFirst({
            where: {
              proveedor: proveedor.charAt(0).toUpperCase() + proveedor.slice(1),
              servicio,
            },
            orderBy: { fechaActualizacion: "desc" },
          })

          this.tarifasCacheadas[proveedor] = {
            proveedor: proveedor.charAt(0).toUpperCase() + proveedor.slice(1),
            servicio,
            tarifas,
            subsidios,
            componentes,
            fechaActualizacion: ultimaActualizacion?.fechaActualizacion || new Date(),
          }

          console.log(`Tarifas de ${proveedor} cargadas desde DB (${tarifas.length} tarifas)`)
        }
      }

      // Si la DB no tiene datos, cargar fallback
      if (!tieneDatos) {
        console.log("⚠️ No se encontraron tarifas en la base de datos. Cargando datos de referencia...")
        this.cargarDatosFallback()
      }
    } catch (error) {
      console.error(`Error al cargar tarifas desde DB: ${error.message}`)
      this.cargarDatosFallback()
    }
  }

  /**
   * Obtiene la fecha de la última actualización de tarifas
   * @returns {Date} Fecha de la última actualización
   */
  async obtenerUltimaActualizacion() {
    try {
      const ultimaActualizacion = await this.prisma.actualizacionTarifas.findFirst({
        orderBy: { fechaActualizacion: "desc" },
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

    console.log(`⏰ Actualización de tarifas programada: ${this.options.expresionCron}`)
  }

  /**
   * Actualiza todas las tarifas
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async actualizarTodasLasTarifas() {
    try {
      console.log("Actualizando todas las tarifas...")

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
        resultado.errores.push({ proveedor: "Afinia", error: error.message })
      }

      // Extraer tarifas de Veolia
      try {
        console.log("Extrayendo tarifas de Veolia...")
        const tarifasVeolia = await this.scraper.extraerTarifasVeolia()
        resultado.veolia = tarifasVeolia
        await this.guardarTarifasEnDB("Veolia", "agua", tarifasVeolia)
      } catch (error) {
        console.error(`Error al extraer tarifas de Veolia: ${error.message}`)
        resultado.errores.push({ proveedor: "Veolia", error: error.message })
      }

      // Extraer tarifas de Surtigas
      try {
        console.log("Extrayendo tarifas de Surtigas...")
        const tarifasSurtigas = await this.scraper.extraerTarifasSurtigas()
        resultado.surtigas = tarifasSurtigas
        await this.guardarTarifasEnDB("Surtigas", "gas", tarifasSurtigas)
      } catch (error) {
        console.error(`Error al extraer tarifas de Surtigas: ${error.message}`)
        resultado.errores.push({ proveedor: "Surtigas", error: error.message })
      }

      // Actualizar caché
      await this.cargarTarifasDesdeDB()

      // Detectar cambios significativos
      await this.detectarCambiosSignificativos(resultado)

      console.log("✅ Todas las tarifas actualizadas correctamente")
      return resultado
    } catch (error) {
      console.error(`Error al actualizar tarifas: ${error.message}`)
      throw error
    }
  }

  /**
   * Guarda las tarifas extraídas en la base de datos
   */
  async guardarTarifasEnDB(proveedor, servicio, datos) {
    try {
      console.log(`Guardando tarifas de ${proveedor} en la base de datos...`)

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
        where: { proveedor, servicio, fechaFin: null },
        data: { fechaFin: new Date() },
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
        await this.prisma.subsidioTarifa.updateMany({
          where: { proveedor, servicio, fechaFin: null },
          data: { fechaFin: new Date() },
        })

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

      console.log(`✅ Tarifas de ${proveedor} guardadas correctamente`)
    } catch (error) {
      console.error(`Error al guardar tarifas en DB: ${error.message}`)
      throw error
    }
  }

  /**
   * Detecta cambios significativos en las tarifas
   */
  async detectarCambiosSignificativos(resultado) {
    try {
      const cambiosDetectados = []
      const umbral = this.options.umbralAlertaCambio || 5

      for (const proveedor of ["afinia", "veolia", "surtigas"]) {
        const datosNuevos = resultado[proveedor]
        if (!datosNuevos || !datosNuevos.tarifas) continue

        const datosAnteriores = this.tarifasCacheadas[proveedor]
        if (!datosAnteriores || !datosAnteriores.tarifas || !datosAnteriores.tarifas.length) continue

        for (const tarifaNueva of datosNuevos.tarifas) {
          const tarifaAnterior = datosAnteriores.tarifas.find(
            (t) => t.estrato === tarifaNueva.estrato,
          )

          if (tarifaAnterior) {
            const valorAnterior = tarifaAnterior.valorConsumo || tarifaAnterior.tarifa
            const valorNuevo = tarifaNueva.tarifa

            if (valorAnterior > 0 && valorNuevo > 0) {
              const porcentajeCambio = ((valorNuevo - valorAnterior) / valorAnterior) * 100

              if (Math.abs(porcentajeCambio) >= umbral) {
                cambiosDetectados.push({
                  proveedor: proveedor.charAt(0).toUpperCase() + proveedor.slice(1),
                  estrato: tarifaNueva.estrato,
                  valorAnterior,
                  valorNuevo,
                  porcentajeCambio: porcentajeCambio.toFixed(2),
                  tipo: porcentajeCambio > 0 ? "AUMENTO" : "DISMINUCIÓN",
                  fecha: new Date().toISOString(),
                })
              }
            }
          }
        }
      }

      if (cambiosDetectados.length > 0) {
        console.log(`📊 ${cambiosDetectados.length} cambios significativos detectados`)
        const logPath = path.join(this.options.dirTarifas, "cambios_tarifas.json")
        try {
          let historialCambios = []
          try {
            const contenido = await fs.readFile(logPath, "utf-8")
            historialCambios = JSON.parse(contenido)
          } catch {
            // Archivo no existe
          }
          historialCambios.push(...cambiosDetectados)
          await fs.writeFile(logPath, JSON.stringify(historialCambios, null, 2))
        } catch (e) {
          console.error(`Error guardando log de cambios: ${e.message}`)
        }
      }

      return cambiosDetectados
    } catch (error) {
      console.error(`Error detectando cambios: ${error.message}`)
      return []
    }
  }

  /**
   * Obtiene la tarifa de referencia para un proveedor, servicio y estrato
   */
  async obtenerTarifaReferencia(proveedor, tipoServicio, estrato, tipoUsuario = "Residencial") {
    if (!this.inicializado) {
      await this.inicializar()
    }

    proveedor = proveedor.toLowerCase()
    tipoServicio = tipoServicio.toLowerCase()

    if (!["afinia", "veolia", "surtigas"].includes(proveedor)) {
      throw new Error(`Proveedor no soportado: ${proveedor}`)
    }

    const datosTarifas = this.tarifasCacheadas[proveedor]

    if (!datosTarifas || !datosTarifas.tarifas || datosTarifas.tarifas.length === 0) {
      // Usar fallback si no hay datos en caché
      const fallback = TARIFAS_REFERENCIA_FALLBACK[proveedor]
      if (fallback) {
        const tarifaFallback = fallback.tarifas.find((t) => t.estrato === estrato.toString())
        const subsidioFallback = fallback.subsidios.find((s) => s.estrato === estrato.toString())
        if (tarifaFallback) {
          return {
            valor: tarifaFallback.valorConsumo,
            cargoFijo: tarifaFallback.cargoFijo,
            unidad: proveedor === "afinia" ? "kWh" : "m³",
            moneda: "COP",
            fechaActualizacion: new Date(),
            subsidio: subsidioFallback ? subsidioFallback.porcentaje : null,
            aproximado: true,
          }
        }
      }
      throw new Error(`No hay datos de tarifas disponibles para ${proveedor}`)
    }

    // Buscar tarifa exacta
    const tarifaEncontrada = datosTarifas.tarifas.find((tarifa) =>
      tarifa.estrato === estrato.toString(),
    )

    if (!tarifaEncontrada) {
      // Devolver primer tarifa como aproximación
      const primeraTarifa = datosTarifas.tarifas[0]
      return {
        valor: primeraTarifa.valorConsumo,
        cargoFijo: primeraTarifa.cargoFijo,
        unidad: proveedor === "afinia" ? "kWh" : "m³",
        moneda: "COP",
        fechaActualizacion: datosTarifas.fechaActualizacion,
        subsidio: null,
        aproximado: true,
      }
    }

    // Buscar subsidio
    let subsidio = null
    if (datosTarifas.subsidios) {
      const subsidioEncontrado = datosTarifas.subsidios.find((s) => s.estrato === estrato.toString())
      if (subsidioEncontrado) {
        subsidio = subsidioEncontrado.porcentaje
      }
    }

    return {
      valor: tarifaEncontrada.valorConsumo,
      cargoFijo: tarifaEncontrada.cargoFijo,
      unidad: proveedor === "afinia" ? "kWh" : "m³",
      moneda: "COP",
      fechaActualizacion: datosTarifas.fechaActualizacion,
      subsidio,
      aproximado: datosTarifas.aproximado || false,
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
