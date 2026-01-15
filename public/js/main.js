document.addEventListener("DOMContentLoaded", () => {
  // Inicializar tooltips de Bootstrap
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
  tooltipTriggerList.map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl))

  // Inicializar popovers de Bootstrap
  const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
  popoverTriggerList.map((popoverTriggerEl) => new bootstrap.Popover(popoverTriggerEl))

  // Animación de scroll suave para enlaces internos
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault()

      const targetId = this.getAttribute("href")
      if (targetId === "#") return

      const targetElement = document.querySelector(targetId)
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 70,
          behavior: "smooth",
        })
      }
    })
  })

  // Funcionalidad para el área de carga de archivos
  const uploadArea = document.querySelector(".upload-area")
  const fileInput = document.getElementById("factura-input")

  if (uploadArea && fileInput) {
    uploadArea.addEventListener("click", () => {
      fileInput.click()
    })

    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault()
      uploadArea.classList.add("border-primary")
    })

    uploadArea.addEventListener("dragleave", () => {
      uploadArea.classList.remove("border-primary")
    })

    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault()
      uploadArea.classList.remove("border-primary")

      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files
        handleFileUpload(e.dataTransfer.files[0])
      }
    })

    fileInput.addEventListener("change", (e) => {
      if (fileInput.files.length) {
        handleFileUpload(fileInput.files[0])
      }
    })
  }

  // Función para manejar la carga de archivos
  function handleFileUpload(file) {
    const uploadStatus = document.getElementById("upload-status")

    if (uploadStatus) {
      uploadStatus.textContent = `Archivo seleccionado: ${file.name}`

      // Mostrar vista previa si es una imagen
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const previewElement = document.getElementById("file-preview")
          if (previewElement) {
            previewElement.innerHTML = `<img src="${e.target.result}" class="img-fluid rounded" alt="Vista previa">`
          }
        }
        reader.readAsDataURL(file)
      }

      // Habilitar botón de análisis
      const analyzeButton = document.getElementById("analyze-button")
      if (analyzeButton) {
        analyzeButton.disabled = false
      }
    }
  }

  // Inicializar gráficos si estamos en la página de dashboard
  if (document.getElementById("consumo-chart")) {
    initializeCharts()
  }

  // Función para inicializar gráficos
  function initializeCharts() {
    // Aquí iría el código para inicializar gráficos con Chart.js o similar
    console.log("Inicializando gráficos del dashboard")
  }
})
