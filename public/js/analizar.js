class AnalizadorFacturas {
  constructor() {
    this.token = localStorage.getItem("token")
    this.usuario = null
    this.currentAnalysis = null

    this.init()
  }

  async init() {
    if (!this.token) {
      window.location.href = "/login.html"
      return
    }

    try {
      await this.verificarAutenticacion()
      this.configurarEventos()
    } catch (error) {
      console.error("[v0] Error al inicializar:", error)
      window.location.href = "/login.html"
    }
  }

  async verificarAutenticacion() {
    try {
      const response = await fetch("/auth/verificar", {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Token inválido")
      }

      const data = await response.json()
      this.usuario = data.data.usuario

      // Actualizar nombre en la interfaz
      const usuarioNombre = document.getElementById("usuario-nombre")
      if (usuarioNombre) {
        usuarioNombre.textContent = `${this.usuario.nombre} ${this.usuario.apellido}`
      }
    } catch (error) {
      localStorage.removeItem("token")
      throw error
    }
  }

  configurarEventos() {
    // Área de carga de archivos
    const uploadArea = document.getElementById("upload-area")
    const fileInput = document.getElementById("factura-input")

    if (uploadArea && fileInput) {
      uploadArea.addEventListener("click", () => fileInput.click())
      uploadArea.addEventListener("dragover", this.handleDragOver.bind(this))
      uploadArea.addEventListener("dragleave", this.handleDragLeave.bind(this))
      uploadArea.addEventListener("drop", this.handleDrop.bind(this))

      fileInput.addEventListener("change", this.handleFileSelect.bind(this))
    }

    // Formulario de análisis
    const uploadForm = document.getElementById("upload-form")
    if (uploadForm) {
      uploadForm.addEventListener("submit", this.handleAnalysis.bind(this))
    }

    // Función global para logout
    window.logout = () => {
      localStorage.removeItem("token")
      localStorage.removeItem("usuario")
      window.location.href = "/login.html"
    }
  }

  handleDragOver(e) {
    e.preventDefault()
    e.currentTarget.classList.add("border-primary", "bg-light")
  }

  handleDragLeave(e) {
    e.preventDefault()
    e.currentTarget.classList.remove("border-primary", "bg-light")
  }

  handleDrop(e) {
    e.preventDefault()
    e.currentTarget.classList.remove("border-primary", "bg-light")

    const files = e.dataTransfer.files
    if (files.length > 0) {
      this.processFile(files[0])
    }
  }

  handleFileSelect(e) {
    const files = e.target.files
    if (files.length > 0) {
      this.processFile(files[0])
    }
  }

  processFile(file) {
    // Validar tipo de archivo
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      this.showAlert("danger", "Tipo de archivo no soportado. Solo se permiten JPG, PNG y PDF.")
      return
    }

    // Validar tamaño
    if (file.size > 10 * 1024 * 1024) {
      // 10MB
      this.showAlert("danger", "El archivo es demasiado grande. Máximo 10MB.")
      return
    }

    const uploadStatus = document.getElementById("upload-status")
    uploadStatus.innerHTML = `
      <div class="alert alert-info">
        <i class="bi bi-file-earmark"></i>
        Archivo seleccionado: <strong>${file.name}</strong> (${this.formatFileSize(file.size)})
      </div>
    `

    // Mostrar vista previa si es imagen
    if (file.type.startsWith("image/")) {
      this.showImagePreview(file)
    }

    // Habilitar botón de análisis
    const analyzeButton = document.getElementById("analyze-button")
    if (analyzeButton) {
      analyzeButton.disabled = false
    }
  }

  showImagePreview(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const previewContainer = document.getElementById("file-preview")
      previewContainer.innerHTML = `
        <div class="text-center">
          <img src="${e.target.result}" class="img-thumbnail" style="max-height: 200px; cursor: pointer;" 
               onclick="analizador.showFullImage('${e.target.result}')" alt="Vista previa">
          <p class="small text-muted mt-2">Haz clic en la imagen para ver en tamaño completo</p>
        </div>
      `
    }
    reader.readAsDataURL(file)
  }

  showFullImage(src) {
    const modalImage = document.getElementById("modal-image")
    if (modalImage) {
      modalImage.src = src
      const modal = new window.bootstrap.Modal(document.getElementById("imageModal"))
      modal.show()
    }
  }

  async handleAnalysis(e) {
    e.preventDefault()

    const formData = new FormData(e.target)
    const tipoServicio = formData.get("tipoServicio")
    const archivo = formData.get("factura")

    if (!tipoServicio) {
      this.showAlert("danger", "Por favor selecciona el tipo de servicio")
      return
    }

    if (!archivo) {
      this.showAlert("danger", "Por favor selecciona un archivo")
      return
    }

    try {
      // Mostrar paso de procesamiento
      this.showProcessingStep()

      // Simular progreso
      this.simulateProgress()

      const response = await fetch("/api/analisis/factura", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        this.currentAnalysis = result.data
        this.showResults(result.data)
      } else {
        throw new Error(result.message || "Error al analizar la factura")
      }
    } catch (error) {
      console.error("[v0] Error en análisis:", error)
      this.showAlert("danger", `Error al analizar la factura: ${error.message}`)
      this.hideProcessingStep()
    }
  }

  showProcessingStep() {
    const uploadStep = document.getElementById("upload-step")
    const processingStep = document.getElementById("processing-step")
    if (uploadStep) uploadStep.style.display = "none"
    if (processingStep) processingStep.classList.remove("d-none")
  }

  hideProcessingStep() {
    const uploadStep = document.getElementById("upload-step")
    const processingStep = document.getElementById("processing-step")
    if (uploadStep) uploadStep.style.display = "block"
    if (processingStep) processingStep.classList.add("d-none")
  }

  simulateProgress() {
    const progressBar = document.getElementById("progress-bar")
    const statusText = document.getElementById("processing-status")

    if (!progressBar || !statusText) return

    const steps = [
      { progress: 20, text: "Extrayendo texto de la factura..." },
      { progress: 40, text: "Identificando datos estructurados..." },
      { progress: 60, text: "Consultando tarifas de referencia..." },
      { progress: 80, text: "Analizando anomalías..." },
      { progress: 100, text: "Generando reporte..." },
    ]

    let currentStep = 0
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const step = steps[currentStep]
        progressBar.style.width = `${step.progress}%`
        statusText.textContent = step.text
        currentStep++
      } else {
        clearInterval(interval)
      }
    }, 1000)
  }

  showResults(data) {
    const { extractedData, analysisResult } = data

    const processingStep = document.getElementById("processing-step")
    const resultsStep = document.getElementById("results-step")
    if (processingStep) processingStep.classList.add("d-none")
    if (resultsStep) resultsStep.classList.remove("d-none")

    const resultsContent = document.getElementById("results-content")
    if (!resultsContent) return

    // Determinar estado general
    const anomalias = analysisResult.anomalies || []
    const tieneAnomalias = anomalias.length > 0
    const estadoClass = tieneAnomalias ? "warning" : "success"
    const estadoIcon = tieneAnomalias ? "exclamation-triangle" : "check-circle"
    const estadoTexto = tieneAnomalias ? "Anomalías Detectadas" : "Factura Normal"

    resultsContent.innerHTML = `
      <!-- Estado general -->
      <div class="alert alert-${estadoClass} text-center">
        <i class="bi bi-${estadoIcon}" style="font-size: 2rem;"></i>
        <h4 class="mt-2">${estadoTexto}</h4>
        <p class="mb-0">
          ${
            tieneAnomalias
              ? `Se detectaron ${anomalias.length} anomalía(s) en tu factura`
              : "Tu factura no presenta anomalías detectables"
          }
        </p>
      </div>

      <!-- Información de la factura -->
      <div class="row mb-4">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <h6><i class="bi bi-info-circle"></i> Información de la Factura</h6>
            </div>
            <div class="card-body">
              <table class="table table-sm">
                <tr><td><strong>Proveedor:</strong></td><td>${extractedData.provider.name}</td></tr>
                <tr><td><strong>Número:</strong></td><td>${extractedData.billNumber || "No detectado"}</td></tr>
                <tr><td><strong>Fecha:</strong></td><td>${extractedData.billDate ? new Date(extractedData.billDate).toLocaleDateString("es-ES") : "No detectada"}</td></tr>
                <tr><td><strong>Cliente:</strong></td><td>${extractedData.clientName || "No detectado"}</td></tr>
                <tr><td><strong>Dirección:</strong></td><td>${extractedData.address || "No detectada"}</td></tr>
              </table>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <h6><i class="bi bi-calculator"></i> Análisis de Consumo</h6>
            </div>
            <div class="card-body">
              <table class="table table-sm">
                <tr><td><strong>Consumo:</strong></td><td>${extractedData.consumption} ${extractedData.consumptionUnit}</td></tr>
                <tr><td><strong>Precio unitario:</strong></td><td>$${extractedData.unitPrice?.toLocaleString() || "No detectado"}</td></tr>
                <tr><td><strong>Total facturado:</strong></td><td>$${extractedData.totalAmount?.toLocaleString() || "No detectado"}</td></tr>
                ${
                  analysisResult.tarifaReferencia
                    ? `
                <tr><td><strong>Tarifa referencia:</strong></td><td>$${analysisResult.tarifaReferencia.valor?.toLocaleString()}</td></tr>
                <tr><td><strong>Diferencia:</strong></td><td class="${analysisResult.tarifaDifference > 0 ? "text-danger" : "text-success"}">
                  ${analysisResult.tarifaDifference > 0 ? "+" : ""}$${analysisResult.tarifaDifference?.toLocaleString() || "0"}
                </td></tr>
                `
                    : ""
                }
              </table>
            </div>
          </div>
        </div>
      </div>

      ${
        anomalias.length > 0
          ? `
      <!-- Anomalías detectadas -->
      <div class="card mb-4">
        <div class="card-header bg-warning">
          <h6><i class="bi bi-exclamation-triangle"></i> Anomalías Detectadas</h6>
        </div>
        <div class="card-body">
          ${anomalias
            .map(
              (anomalia) => `
            <div class="alert alert-${this.getSeverityClass(anomalia.severity)}">
              <div class="d-flex">
                <div class="me-3">
                  <i class="bi bi-${this.getSeverityIcon(anomalia.severity)}" style="font-size: 1.5rem;"></i>
                </div>
                <div class="flex-grow-1">
                  <h6 class="alert-heading">${this.getAnomalyTitle(anomalia.type)}</h6>
                  <p class="mb-1">${anomalia.description}</p>
                  <small class="text-muted">Severidad: ${anomalia.severity.toUpperCase()}</small>
                </div>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
      `
          : ""
      }

      ${
        analysisResult.recommendations && analysisResult.recommendations.length > 0
          ? `
      <!-- Recomendaciones -->
      <div class="card mb-4">
        <div class="card-header bg-info text-white">
          <h6><i class="bi bi-lightbulb"></i> Recomendaciones</h6>
        </div>
        <div class="card-body">
          <ul class="list-group list-group-flush">
            ${analysisResult.recommendations
              .map(
                (rec) => `
              <li class="list-group-item">
                <i class="bi bi-arrow-right text-primary me-2"></i>
                ${rec.description}
              </li>
            `,
              )
              .join("")}
          </ul>
        </div>
      </div>
      `
          : ""
      }

      <!-- Acciones -->
      <div class="text-center">
        <button class="btn btn-primary me-2" onclick="analizador.nuevoAnalisis()">
          <i class="bi bi-plus"></i> Analizar Nueva Factura
        </button>
        <button class="btn btn-outline-secondary me-2" onclick="analizador.descargarReporte()">
          <i class="bi bi-download"></i> Descargar Reporte
        </button>
        <a href="dashboard.html" class="btn btn-outline-primary">
          <i class="bi bi-graph-up"></i> Ver Dashboard
        </a>
      </div>
    `
  }

  getSeverityClass(severity) {
    switch (severity) {
      case "high":
        return "danger"
      case "medium":
        return "warning"
      case "low":
        return "info"
      default:
        return "secondary"
    }
  }

  getSeverityIcon(severity) {
    switch (severity) {
      case "high":
        return "exclamation-triangle-fill"
      case "medium":
        return "exclamation-triangle"
      case "low":
        return "info-circle"
      default:
        return "question-circle"
    }
  }

  getAnomalyTitle(type) {
    const titles = {
      tariff_overcharge: "Sobrecobro en Tarifa",
      high_consumption: "Consumo Elevado",
      low_consumption: "Consumo Inusualmente Bajo",
      billing_inconsistency: "Inconsistencia en Facturación",
    }
    return titles[type] || "Anomalía Detectada"
  }

  nuevoAnalisis() {
    // Resetear formulario
    const uploadForm = document.getElementById("upload-form")
    const uploadStatus = document.getElementById("upload-status")
    const filePreview = document.getElementById("file-preview")
    const analyzeButton = document.getElementById("analyze-button")

    if (uploadForm) uploadForm.reset()
    if (uploadStatus) uploadStatus.innerHTML = ""
    if (filePreview) filePreview.innerHTML = ""
    if (analyzeButton) analyzeButton.disabled = true

    // Mostrar paso de carga
    const uploadStep = document.getElementById("upload-step")
    const processingStep = document.getElementById("processing-step")
    const resultsStep = document.getElementById("results-step")

    if (uploadStep) uploadStep.style.display = "block"
    if (processingStep) processingStep.classList.add("d-none")
    if (resultsStep) resultsStep.classList.add("d-none")

    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  descargarReporte() {
    if (!this.currentAnalysis) return

    const { extractedData, analysisResult } = this.currentAnalysis
    const anomalias = analysisResult.anomalies || []

    // Crear contenido del reporte
    const reportContent = `
REPORTE DE ANÁLISIS DE FACTURA - OPTIFACTURA MONTERÍA
=====================================================

INFORMACIÓN GENERAL:
- Proveedor: ${extractedData.provider.name}
- Número de Factura: ${extractedData.billNumber || "No detectado"}
- Fecha: ${extractedData.billDate ? new Date(extractedData.billDate).toLocaleDateString("es-ES") : "No detectada"}
- Cliente: ${extractedData.clientName || "No detectado"}

ANÁLISIS DE CONSUMO:
- Consumo: ${extractedData.consumption} ${extractedData.consumptionUnit}
- Precio Unitario: $${extractedData.unitPrice?.toLocaleString() || "No detectado"}
- Total Facturado: $${extractedData.totalAmount?.toLocaleString() || "No detectado"}
${analysisResult.tarifaReferencia ? `- Tarifa de Referencia: $${analysisResult.tarifaReferencia.valor?.toLocaleString()}` : ""}
${analysisResult.tarifaDifference ? `- Diferencia: $${analysisResult.tarifaDifference?.toLocaleString()}` : ""}

ANOMALÍAS DETECTADAS:
${anomalias.length > 0 ? anomalias.map((a, i) => `${i + 1}. ${a.description} (${a.severity.toUpperCase()})`).join("\n") : "No se detectaron anomalías"}

RECOMENDACIONES:
${
  analysisResult.recommendations && analysisResult.recommendations.length > 0
    ? analysisResult.recommendations.map((r, i) => `${i + 1}. ${r.description}`).join("\n")
    : "No hay recomendaciones específicas"
}

Reporte generado el ${new Date().toLocaleString("es-ES")}
OptiFactura Montería - Sistema de Análisis de Facturas
    `

    // Descargar archivo
    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `reporte-factura-${extractedData.billNumber || Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  showAlert(type, message) {
    const alert = document.createElement("div")
    alert.className = `alert alert-${type} alert-dismissible fade show`
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `

    document.body.insertBefore(alert, document.body.firstChild)

    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove()
      }
    }, 5000)
  }
}

// Inicializar cuando se carga la página
document.addEventListener("DOMContentLoaded", () => {
  window.analizador = new AnalizadorFacturas()
})
