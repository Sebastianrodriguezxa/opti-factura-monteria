class DashboardService {
  constructor(options = {}) {
    this.prisma = options.prisma
    this.inicializado = false
  }

  /**
   * Inicializa el servicio de dashboard
   */
  async inicializar() {
    if (this.inicializado) return

    try {
      console.log("Inicializando servicio de dashboard...")
      this.inicializado = true
      console.log("✅ Servicio de dashboard inicializado correctamente")
    } catch (error) {
      console.error("❌ Error al inicializar servicio de dashboard:", error.message)
      throw error
    }
  }

  /**
   * Obtiene estadísticas generales del usuario
   * @param {string} userId ID del usuario
   * @returns {Promise<Object>} Estadísticas generales
   */
  async obtenerEstadisticasGenerales(userId) {
    try {
      const [totalFacturas, facturasMesActual, ahorroTotal, anomaliasDetectadas] = await Promise.all([
        this.prisma.analisisFactura.count({
          where: { userId },
        }),

        this.prisma.analisisFactura.count({
          where: {
            userId,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),

        this.prisma.analisisFactura.aggregate({
          where: {
            userId,
            diferenciaTarifa: { gt: 0 },
          },
          _sum: {
            diferenciaTarifa: true,
          },
        }),

        this.prisma.analisisFactura.count({
          where: {
            userId,
            anomalias: {
              not: "[]",
            },
          },
        }),
      ])

      return {
        totalFacturas,
        facturasMesActual,
        ahorroTotal: ahorroTotal._sum.diferenciaTarifa || 0,
        anomaliasDetectadas,
        porcentajeAnomalias: totalFacturas > 0 ? ((anomaliasDetectadas / totalFacturas) * 100).toFixed(1) : 0,
      }
    } catch (error) {
      console.error("Error al obtener estadísticas generales:", error.message)
      // Retornar datos vacíos en lugar de fallar
      return {
        totalFacturas: 0,
        facturasMesActual: 0,
        ahorroTotal: 0,
        anomaliasDetectadas: 0,
        porcentajeAnomalias: 0,
      }
    }
  }

  /**
   * Obtiene datos de consumo por mes
   * @param {string} userId ID del usuario
   * @param {number} meses Número de meses hacia atrás
   * @returns {Promise<Object>} Datos de consumo mensual
   */
  async obtenerConsumoMensual(userId, meses = 12) {
    try {
      const fechaInicio = new Date()
      fechaInicio.setMonth(fechaInicio.getMonth() - meses)

      const facturas = await this.prisma.analisisFactura.findMany({
        where: {
          userId,
          fechaFactura: {
            gte: fechaInicio,
          },
        },
        orderBy: {
          fechaFactura: "asc",
        },
        select: {
          fechaFactura: true,
          consumo: true,
          valorTotal: true,
          proveedor: true,
          unidadConsumo: true,
        },
      })

      // Agrupar por mes y proveedor
      const consumoPorMes = {}

      facturas.forEach((factura) => {
        const mes = factura.fechaFactura.toISOString().substring(0, 7) // YYYY-MM
        const proveedor = factura.proveedor.toLowerCase()

        if (!consumoPorMes[mes]) {
          consumoPorMes[mes] = {}
        }

        if (!consumoPorMes[mes][proveedor]) {
          consumoPorMes[mes][proveedor] = {
            consumo: 0,
            valor: 0,
            unidad: factura.unidadConsumo,
            facturas: 0,
          }
        }

        consumoPorMes[mes][proveedor].consumo += factura.consumo
        consumoPorMes[mes][proveedor].valor += factura.valorTotal
        consumoPorMes[mes][proveedor].facturas += 1
      })

      return consumoPorMes
    } catch (error) {
      console.error("Error al obtener consumo mensual:", error.message)
      return {}
    }
  }

  /**
   * Obtiene distribución de gastos por proveedor
   * @param {string} userId ID del usuario
   * @param {number} meses Número de meses hacia atrás
   * @returns {Promise<Array>} Distribución de gastos
   */
  async obtenerDistribucionGastos(userId, meses = 12) {
    try {
      const fechaInicio = new Date()
      fechaInicio.setMonth(fechaInicio.getMonth() - meses)

      const gastosPorProveedor = await this.prisma.analisisFactura.groupBy({
        by: ["proveedor"],
        where: {
          userId,
          fechaFactura: {
            gte: fechaInicio,
          },
        },
        _sum: {
          valorTotal: true,
        },
        _count: {
          id: true,
        },
      })

      const total = gastosPorProveedor.reduce((sum, item) => sum + (item._sum.valorTotal || 0), 0)

      return gastosPorProveedor.map((item) => ({
        proveedor: item.proveedor,
        valor: item._sum.valorTotal || 0,
        porcentaje: total > 0 ? (((item._sum.valorTotal || 0) / total) * 100).toFixed(1) : 0,
        facturas: item._count.id,
      }))
    } catch (error) {
      console.error("Error al obtener distribución de gastos:", error.message)
      return []
    }
  }

  /**
   * Obtiene las últimas anomalías detectadas
   * @param {string} userId ID del usuario
   * @param {number} limite Número máximo de anomalías
   * @returns {Promise<Array>} Últimas anomalías
   */
  async obtenerUltimasAnomalias(userId, limite = 10) {
    try {
      const facturas = await this.prisma.analisisFactura.findMany({
        where: {
          userId,
          anomalias: {
            not: "[]",
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limite,
        select: {
          id: true,
          proveedor: true,
          numeroFactura: true,
          fechaFactura: true,
          anomalias: true,
          valorTotal: true,
          createdAt: true,
        },
      })

      const anomalias = []

      facturas.forEach((factura) => {
        try {
          const anomaliasFactura = JSON.parse(factura.anomalias || "[]")
          anomaliasFactura.forEach((anomalia) => {
            anomalias.push({
              id: factura.id,
              proveedor: factura.proveedor,
              numeroFactura: factura.numeroFactura,
              fechaFactura: factura.fechaFactura,
              valorTotal: factura.valorTotal,
              tipo: anomalia.type,
              descripcion: anomalia.description,
              severidad: anomalia.severity,
              fechaDeteccion: factura.createdAt,
            })
          })
        } catch (error) {
          console.error("Error al parsear anomalías:", error.message)
        }
      })

      return anomalias.slice(0, limite)
    } catch (error) {
      console.error("Error al obtener últimas anomalías:", error.message)
      return []
    }
  }

  /**
   * Obtiene comparación de tarifas actuales vs históricas
   * @param {string} userId ID del usuario
   * @returns {Promise<Object>} Comparación de tarifas
   */
  async obtenerComparacionTarifas(userId) {
    try {
      const facturas = await this.prisma.analisisFactura.findMany({
        where: { userId },
        orderBy: {
          fechaFactura: "desc",
        },
        take: 50,
        select: {
          proveedor: true,
          fechaFactura: true,
          valorUnitario: true,
          tarifaReferencia: true,
          diferenciaTarifa: true,
          porcentajeDiferencia: true,
        },
      })

      const comparacion = {}

      facturas.forEach((factura) => {
        const proveedor = factura.proveedor.toLowerCase()

        if (!comparacion[proveedor]) {
          comparacion[proveedor] = {
            tarifaPromedio: 0,
            tarifaReferenciaPromedio: 0,
            diferenciaPromedio: 0,
            facturas: 0,
            ultimaTarifa: null,
            ultimaFecha: null,
          }
        }

        const datos = comparacion[proveedor]
        datos.tarifaPromedio = (datos.tarifaPromedio * datos.facturas + factura.valorUnitario) / (datos.facturas + 1)
        datos.tarifaReferenciaPromedio =
          (datos.tarifaReferenciaPromedio * datos.facturas + factura.tarifaReferencia) / (datos.facturas + 1)
        datos.diferenciaPromedio =
          (datos.diferenciaPromedio * datos.facturas + (factura.porcentajeDiferencia || 0)) / (datos.facturas + 1)
        datos.facturas += 1

        if (!datos.ultimaFecha || factura.fechaFactura > datos.ultimaFecha) {
          datos.ultimaTarifa = factura.valorUnitario
          datos.ultimaFecha = factura.fechaFactura
        }
      })

      return comparacion
    } catch (error) {
      console.error("Error al obtener comparación de tarifas:", error.message)
      return {}
    }
  }

  /**
   * Obtiene recomendaciones personalizadas
   * @param {string} userId ID del usuario
   * @returns {Promise<Array>} Recomendaciones
   */
  async obtenerRecomendaciones(userId) {
    try {
      const estadisticas = await this.obtenerEstadisticasGenerales(userId)
      const anomalias = await this.obtenerUltimasAnomalias(userId, 5)
      const consumoMensual = await this.obtenerConsumoMensual(userId, 6)

      const recomendaciones = []

      // Recomendación basada en anomalías frecuentes
      if (estadisticas.porcentajeAnomalias > 20) {
        recomendaciones.push({
          tipo: "anomalias_frecuentes",
          titulo: "Anomalías Frecuentes Detectadas",
          descripcion: `El ${estadisticas.porcentajeAnomalias}% de tus facturas presentan anomalías. Te recomendamos contactar a tus proveedores para verificar los cobros.`,
          prioridad: "alta",
          accion: "Contactar proveedores",
        })
      }

      // Recomendación basada en ahorro potencial
      if (estadisticas.ahorroTotal > 50000) {
        recomendaciones.push({
          tipo: "ahorro_potencial",
          titulo: "Potencial de Ahorro Significativo",
          descripcion: `Hemos detectado un potencial de ahorro de $${estadisticas.ahorroTotal.toLocaleString()} en tus facturas. Considera presentar reclamos formales.`,
          prioridad: "alta",
          accion: "Presentar reclamos",
        })
      }

      // Recomendación basada en consumo
      const mesesConDatos = Object.keys(consumoMensual).length
      if (mesesConDatos >= 3) {
        const consumos = Object.values(consumoMensual).map((mes) => {
          return Object.values(mes).reduce((total, proveedor) => total + proveedor.consumo, 0)
        })

        const promedioConsumo = consumos.reduce((sum, val) => sum + val, 0) / consumos.length
        const ultimoConsumo = consumos[consumos.length - 1]

        if (ultimoConsumo > promedioConsumo * 1.2) {
          recomendaciones.push({
            tipo: "consumo_alto",
            titulo: "Consumo Elevado Detectado",
            descripcion: `Tu consumo del último mes fue ${((ultimoConsumo / promedioConsumo - 1) * 100).toFixed(1)}% mayor que tu promedio. Revisa posibles fugas o equipos defectuosos.`,
            prioridad: "media",
            accion: "Revisar instalaciones",
          })
        }
      }

      // Recomendación de análisis regular
      if (estadisticas.facturasMesActual === 0) {
        recomendaciones.push({
          tipo: "analisis_regular",
          titulo: "Mantén tu Análisis Actualizado",
          descripcion:
            "No has analizado facturas este mes. Te recomendamos analizar tus facturas regularmente para detectar anomalías a tiempo.",
          prioridad: "baja",
          accion: "Subir nueva factura",
        })
      }

      // Si no hay recomendaciones, dar una general
      if (recomendaciones.length === 0) {
        recomendaciones.push({
          tipo: "bienvenida",
          titulo: "¡Bienvenido a OptiFactura!",
          descripcion:
            "Sube tu primera factura de servicios públicos (Afinia, Veolia, Surtigas) para comenzar a detectar cobros excesivos y optimizar tus gastos.",
          prioridad: "baja",
          accion: "Analizar primera factura",
        })
      }

      return recomendaciones
    } catch (error) {
      console.error("Error al obtener recomendaciones:", error.message)
      return [
        {
          tipo: "bienvenida",
          titulo: "¡Bienvenido a OptiFactura!",
          descripcion:
            "Sube tu primera factura de servicios públicos para comenzar a detectar cobros excesivos.",
          prioridad: "baja",
          accion: "Analizar primera factura",
        },
      ]
    }
  }
}

module.exports = DashboardService
