class NotificacionesService {
  constructor(options = {}) {
    this.options = {
      ...options,
    }

    this.canales = {
      email: options.emailService,
      push: options.pushService,
      sms: options.smsService,
    }
  }

  /**
   * Envía una notificación a un usuario
   * @param {string} userId ID del usuario
   * @param {string} tipo Tipo de notificación
   * @param {Object} datos Datos de la notificación
   * @param {Array} canales Canales de notificación
   * @returns {Promise<Object>} Resultado del envío
   */
  async enviarNotificacion(userId, tipo, datos, canales = ["email"]) {
    try {
      console.log(`Enviando notificación de tipo ${tipo} a usuario ${userId}`)

      const resultados = {}

      // Preparar contenido según tipo
      const contenido = this.prepararContenido(tipo, datos)

      // Enviar por cada canal solicitado
      for (const canal of canales) {
        if (this.canales[canal]) {
          try {
            const resultado = await this.canales[canal].enviar(userId, contenido)
            resultados[canal] = {
              exito: true,
              resultado,
            }
          } catch (error) {
            console.error(`Error al enviar notificación por ${canal}: ${error.message}`)
            resultados[canal] = {
              exito: false,
              error: error.message,
            }
          }
        } else {
          resultados[canal] = {
            exito: false,
            error: `Canal ${canal} no disponible`,
          }
        }
      }

      return {
        userId,
        tipo,
        resultados,
      }
    } catch (error) {
      console.error(`Error al enviar notificación: ${error.message}`)
      throw error
    }
  }

  /**
   * Prepara el contenido de una notificación según su tipo
   * @param {string} tipo Tipo de notificación
   * @param {Object} datos Datos de la notificación
   * @returns {Object} Contenido de la notificación
   */
  prepararContenido(tipo, datos) {
    switch (tipo) {
      case "analisis_completado":
        return {
          asunto: "Análisis de factura completado",
          mensaje: `Hemos completado el análisis de tu factura de ${datos.proveedor}. ${datos.anomalias.length > 0 ? "Hemos detectado algunas anomalías." : "No hemos detectado anomalías."}`,
          html: `
            <h1>Análisis de factura completado</h1>
            <p>Hemos completado el análisis de tu factura de <strong>${datos.proveedor}</strong>.</p>
            ${
              datos.anomalias.length > 0
                ? `
              <p>Hemos detectado las siguientes anomalías:</p>
              <ul>
                ${datos.anomalias.map((a) => `<li>${a.description}</li>`).join("")}
              </ul>
            `
                : "<p>No hemos detectado anomalías en tu factura.</p>"
            }
            <p>Puedes ver el análisis completo en tu panel de control.</p>
          `,
        }

      case "actualizacion_tarifas":
        return {
          asunto: "Actualización de tarifas",
          mensaje: `Las tarifas de ${datos.proveedor} han sido actualizadas. La nueva tarifa es ${datos.nuevaTarifa} ${datos.moneda}/${datos.unidad}.`,
          html: `
            <h1>Actualización de tarifas</h1>
            <p>Las tarifas de <strong>${datos.proveedor}</strong> han sido actualizadas.</p>
            <p>La nueva tarifa es <strong>${datos.nuevaTarifa} ${datos.moneda}/${datos.unidad}</strong>.</p>
            <p>Puedes ver más detalles en tu panel de control.</p>
          `,
        }

      case "alerta_consumo":
        return {
          asunto: "Alerta de consumo",
          mensaje: `Hemos detectado un consumo inusual en tu servicio de ${datos.servicio}. El consumo actual es ${datos.consumoActual} ${datos.unidad}, un ${datos.porcentajeIncremento}% más que tu promedio habitual.`,
          html: `
            <h1>Alerta de consumo</h1>
            <p>Hemos detectado un consumo inusual en tu servicio de <strong>${datos.servicio}</strong>.</p>
            <p>El consumo actual es <strong>${datos.consumoActual} ${datos.unidad}</strong>, un <strong>${datos.porcentajeIncremento}%</strong> más que tu promedio habitual.</p>
            <p>Te recomendamos revisar posibles fugas o consumos no autorizados.</p>
          `,
        }

      default:
        return {
          asunto: "Notificación de OptiFactura",
          mensaje: "Tienes una nueva notificación en OptiFactura.",
          html: `
            <h1>Notificación de OptiFactura</h1>
            <p>Tienes una nueva notificación en OptiFactura.</p>
          `,
        }
    }
  }
}

module.exports = NotificacionesService
