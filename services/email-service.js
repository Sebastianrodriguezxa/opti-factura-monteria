const nodemailer = require("nodemailer")

class EmailService {
  constructor(options = {}) {
    this.options = {
      host: options.host || "localhost",
      port: options.port || 587,
      secure: options.secure || false,
      user: options.user,
      pass: options.pass,
      ...options,
    }

    this.transporter = null
    this.inicializado = false
  }

  /**
   * Inicializa el servicio de email
   */
  async inicializar() {
    if (this.inicializado) return

    try {
      this.transporter = nodemailer.createTransporter({
        host: this.options.host,
        port: this.options.port,
        secure: this.options.secure,
        auth:
          this.options.user && this.options.pass
            ? {
                user: this.options.user,
                pass: this.options.pass,
              }
            : undefined,
      })

      // Verificar conexión
      if (this.transporter.auth) {
        await this.transporter.verify()
        console.log("✅ Servicio de email inicializado correctamente")
      } else {
        console.log("⚠️ Servicio de email inicializado sin autenticación")
      }

      this.inicializado = true
    } catch (error) {
      console.error("❌ Error al inicializar servicio de email:", error.message)
      // No lanzar error para permitir que la aplicación funcione sin email
    }
  }

  /**
   * Envía un email
   * @param {string} to Destinatario
   * @param {string} subject Asunto
   * @param {string} text Texto plano
   * @param {string} html HTML
   * @returns {Promise<Object>} Resultado del envío
   */
  async enviarEmail(to, subject, text, html) {
    if (!this.inicializado) {
      await this.inicializar()
    }

    if (!this.transporter) {
      console.log("📧 Email simulado enviado a:", to)
      return { messageId: "simulated-" + Date.now() }
    }

    try {
      const mailOptions = {
        from: this.options.user || "noreply@optifactura.co",
        to,
        subject,
        text,
        html,
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log("📧 Email enviado correctamente:", result.messageId)
      return result
    } catch (error) {
      console.error("❌ Error al enviar email:", error.message)
      throw error
    }
  }

  /**
   * Envía email de bienvenida
   * @param {string} email Email del usuario
   * @param {string} nombre Nombre del usuario
   */
  async enviarEmailBienvenida(email, nombre) {
    const subject = "Bienvenido a OptiFactura Montería"
    const text = `Hola ${nombre}, bienvenido a OptiFactura Montería. Ahora puedes analizar tus facturas de servicios públicos.`
    const html = `
      <h1>¡Bienvenido a OptiFactura Montería!</h1>
      <p>Hola <strong>${nombre}</strong>,</p>
      <p>Te damos la bienvenida a OptiFactura Montería, tu herramienta para analizar facturas de servicios públicos.</p>
      <p>Con OptiFactura puedes:</p>
      <ul>
        <li>Analizar facturas de electricidad, agua y gas</li>
        <li>Detectar cobros excesivos</li>
        <li>Comparar con tarifas oficiales</li>
        <li>Ver estadísticas de consumo</li>
      </ul>
      <p><a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard" style="background-color: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ir al Dashboard</a></p>
      <p>¡Gracias por confiar en nosotros!</p>
      <p>El equipo de OptiFactura</p>
    `

    return this.enviarEmail(email, subject, text, html)
  }

  /**
   * Envía email de análisis completado
   * @param {string} email Email del usuario
   * @param {string} nombre Nombre del usuario
   * @param {Object} resultado Resultado del análisis
   */
  async enviarEmailAnalisisCompletado(email, nombre, resultado) {
    const { extractedData, analysisResult } = resultado
    const anomalias = analysisResult.anomalies || []

    const subject = `Análisis de factura completado - ${extractedData.provider.name}`
    const text = `Hola ${nombre}, hemos completado el análisis de tu factura de ${extractedData.provider.name}. ${anomalias.length > 0 ? "Hemos detectado algunas anomalías." : "No hemos detectado anomalías."}`

    const html = `
      <h1>Análisis de Factura Completado</h1>
      <p>Hola <strong>${nombre}</strong>,</p>
      <p>Hemos completado el análisis de tu factura de <strong>${extractedData.provider.name}</strong>.</p>
      
      <h2>Resumen del Análisis</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Proveedor:</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${extractedData.provider.name}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Número de Factura:</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${extractedData.billNumber}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Consumo:</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${extractedData.consumption} ${extractedData.consumptionUnit}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Total Facturado:</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">$${extractedData.totalAmount?.toLocaleString()}</td>
        </tr>
      </table>
      
      ${
        anomalias.length > 0
          ? `
        <h2>⚠️ Anomalías Detectadas</h2>
        <ul>
          ${anomalias
            .map(
              (anomalia) => `
            <li>
              <strong>${anomalia.type}:</strong> ${anomalia.description}
              <span style="color: ${anomalia.severity === "high" ? "red" : anomalia.severity === "medium" ? "orange" : "blue"};">
                (${anomalia.severity.toUpperCase()})
              </span>
            </li>
          `,
            )
            .join("")}
        </ul>
      `
          : "<p>✅ No se detectaron anomalías en tu factura.</p>"
      }
      
      ${
        analysisResult.recommendations && analysisResult.recommendations.length > 0
          ? `
        <h2>💡 Recomendaciones</h2>
        <ul>
          ${analysisResult.recommendations.map((rec) => `<li>${rec.description}</li>`).join("")}
        </ul>
      `
          : ""
      }
      
      <p><a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard" style="background-color: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Análisis Completo</a></p>
      
      <p>El equipo de OptiFactura</p>
    `

    return this.enviarEmail(email, subject, text, html)
  }
}

module.exports = EmailService
