import { Chart } from "@/components/ui/chart"
// Dashboard JavaScript - OptiFactura Montería
class Dashboard {
  constructor() {
    this.token = localStorage.getItem("token")
    this.usuario = null
    this.charts = {}
    this.datos = {}

    this.init()
  }

  async init() {
    if (!this.token) {
      window.location.href = "/login.html"
      return
    }

    try {
      await this.verificarAutenticacion()
      await this.cargarDatos()
      this.configurarEventos()
      this.mostrarSeccion("resumen")
    } catch (error) {
      console.error("[v0] Error al inicializar dashboard:", error)
      this.mostrarError("Error al cargar el dashboard")
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
      document.getElementById("usuario-nombre").textContent = `${this.usuario.nombre} ${this.usuario.apellido}`
    } catch (error) {
      localStorage.removeItem("token")
      window.location.href = "/login.html"
      throw error
    }
  }

  async cargarDatos() {
    try {
      const response = await fetch("/api/dashboard", {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Error al cargar datos")
      }

      const result = await response.json()
      this.datos = result.data

      this.actualizarEstadisticas()
      this.crearGraficos()
      this.mostrarRecomendaciones()
      this.cargarFacturas()
      this.cargarAnomalias()
      this.cargarTarifas()
    } catch (error) {
      console.error("[v0] Error al cargar datos:", error)
      this.mostrarError("Error al cargar los datos del dashboard")
    }
  }

  actualizarEstadisticas() {
    const stats = this.datos.estadisticas

    document.getElementById("total-facturas").textContent = stats.totalFacturas || 0
    document.getElementById("facturas-mes").textContent = stats.facturasMesActual || 0
    document.getElementById("ahorro-total").textContent = `$${(stats.ahorroTotal || 0).toLocaleString()}`
    document.getElementById("anomalias-detectadas").textContent = stats.anomaliasDetectadas || 0
  }

  crearGraficos() {
    this.crearGraficoConsumo()
    this.crearGraficoGastos()
    this.crearGraficoTendencias()
  }

  crearGraficoConsumo() {
    const ctx = document.getElementById("consumo-chart")
    if (!ctx) return

    const consumoData = this.datos.consumoMensual || {}

    const meses = Object.keys(consumoData).sort()
    const datasets = []

    // Crear datasets por proveedor
    const proveedores = ["afinia", "veolia", "surtigas"]
    const colores = ["#0d6efd", "#0dcaf0", "#ffc107"]

    proveedores.forEach((proveedor, index) => {
      const data = meses.map((mes) => {
        return consumoData[mes] && consumoData[mes][proveedor] ? consumoData[mes][proveedor].consumo : 0
      })

      if (data.some((val) => val > 0)) {
        datasets.push({
          label: proveedor.charAt(0).toUpperCase() + proveedor.slice(1),
          data: data,
          borderColor: colores[index],
          backgroundColor: colores[index] + "20",
          tension: 0.1,
        })
      }
    })

    this.charts.consumo = new Chart(ctx.getContext("2d"), {
      type: "line",
      data: {
        labels: meses.map((mes) => {
          const [year, month] = mes.split("-")
          return new Date(year, month - 1).toLocaleDateString("es-ES", {
            month: "short",
            year: "2-digit",
          })
        }),
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Consumo",
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
          },
        },
      },
    })
  }

  crearGraficoGastos() {
    const ctx = document.getElementById("gastos-chart")
    if (!ctx) return

    const gastosData = this.datos.distribucionGastos || []

    if (gastosData.length === 0) {
      ctx.getContext("2d").fillText("No hay datos disponibles", 50, 50)
      return
    }

    this.charts.gastos = new Chart(ctx.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: gastosData.map((item) => item.proveedor),
        datasets: [
          {
            data: gastosData.map((item) => item.valor),
            backgroundColor: ["#0d6efd", "#0dcaf0", "#ffc107", "#198754", "#dc3545"],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || ""
                const value = context.parsed
                const percentage = gastosData[context.dataIndex].porcentaje
                return `${label}: $${value.toLocaleString()} (${percentage}%)`
              },
            },
          },
        },
      },
    })
  }

  crearGraficoTendencias() {
    const ctx = document.getElementById("tendencias-chart")
    if (!ctx) return

    const consumoData = this.datos.consumoMensual || {}
    const meses = Object.keys(consumoData).sort()

    const totalPorMes = meses.map((mes) => {
      return Object.values(consumoData[mes] || {}).reduce((total, proveedor) => total + (proveedor.valor || 0), 0)
    })

    this.charts.tendencias = new Chart(ctx.getContext("2d"), {
      type: "bar",
      data: {
        labels: meses.map((mes) => {
          const [year, month] = mes.split("-")
          return new Date(year, month - 1).toLocaleDateString("es-ES", {
            month: "short",
            year: "2-digit",
          })
        }),
        datasets: [
          {
            label: "Gasto Total",
            data: totalPorMes,
            backgroundColor: "#0d6efd",
            borderColor: "#0d6efd",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Valor ($)",
            },
          },
        },
      },
    })
  }

  mostrarRecomendaciones() {
    const container = document.getElementById("recomendaciones-lista")
    const recomendaciones = this.datos.recomendaciones || []

    if (recomendaciones.length === 0) {
      container.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle"></i>
          No hay recomendaciones disponibles en este momento.
        </div>
      `
      return
    }

    const html = recomendaciones
      .map((rec) => {
        const iconClass =
          rec.prioridad === "alta"
            ? "bi-exclamation-triangle text-danger"
            : rec.prioridad === "media"
              ? "bi-info-circle text-warning"
              : "bi-lightbulb text-info"

        return `
        <div class="alert alert-${rec.prioridad === "alta" ? "danger" : rec.prioridad === "media" ? "warning" : "info"}">
          <div class="d-flex">
            <div class="me-3">
              <i class="bi ${iconClass}" style="font-size: 1.5rem;"></i>
            </div>
            <div class="flex-grow-1">
              <h6 class="alert-heading">${rec.titulo}</h6>
              <p class="mb-2">${rec.descripcion}</p>
              <small class="text-muted">
                <strong>Acción recomendada:</strong> ${rec.accion}
              </small>
            </div>
          </div>
        </div>
      `
      })
      .join("")

    container.innerHTML = html
  }

  async cargarFacturas() {
    try {
      const response = await fetch("/api/analisis/historial?limite=10", {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Error al cargar facturas")
      }

      const result = await response.json()
      const facturas = result.data.analisis || []

      const tbody = document.getElementById("facturas-tabla")

      if (facturas.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center text-muted">
              No hay facturas analizadas aún
            </td>
          </tr>
        `
        return
      }

      const html = facturas
        .map((factura) => {
          const fecha = new Date(factura.fechaFactura).toLocaleDateString("es-ES")
          const anomalias = JSON.parse(factura.anomalias || "[]")
          const tieneAnomalias = anomalias.length > 0

          return `
          <tr>
            <td>${fecha}</td>
            <td>${factura.proveedor}</td>
            <td>${factura.numeroFactura}</td>
            <td>${factura.consumo} ${factura.unidadConsumo}</td>
            <td>$${factura.valorTotal.toLocaleString()}</td>
            <td>
              <span class="badge bg-${tieneAnomalias ? "warning" : "success"}">
                ${tieneAnomalias ? "Con anomalías" : "Normal"}
              </span>
            </td>
            <td>
              <button class="btn btn-sm btn-outline-primary" onclick="dashboard.verDetallesFactura('${factura.id}')">
                <i class="bi bi-eye"></i>
              </button>
            </td>
          </tr>
        `
        })
        .join("")

      tbody.innerHTML = html
    } catch (error) {
      console.error("[v0] Error al cargar facturas:", error)
    }
  }

  async cargarAnomalias() {
    const container = document.getElementById("anomalias-lista")
    const anomalias = this.datos.ultimasAnomalias || []

    if (anomalias.length === 0) {
      container.innerHTML = `
        <div class="alert alert-success">
          <i class="bi bi-check-circle"></i>
          ¡Excelente! No se han detectado anomalías recientes en tus facturas.
        </div>
      `
      return
    }

    const html = anomalias
      .map((anomalia) => {
        const fecha = new Date(anomalia.fechaDeteccion).toLocaleDateString("es-ES")
        const severidadClass =
          anomalia.severidad === "high" ? "danger" : anomalia.severidad === "medium" ? "warning" : "info"

        return `
        <div class="card mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h6 class="card-title">
                  <span class="badge bg-${severidadClass} me-2">${anomalia.severidad.toUpperCase()}</span>
                  ${anomalia.proveedor} - ${anomalia.numeroFactura}
                </h6>
                <p class="card-text">${anomalia.descripcion}</p>
                <small class="text-muted">
                  <i class="bi bi-calendar"></i> ${fecha} | 
                  <i class="bi bi-currency-dollar"></i> $${anomalia.valorTotal.toLocaleString()}
                </small>
              </div>
              <button class="btn btn-sm btn-outline-primary" onclick="dashboard.verDetallesFactura('${anomalia.id}')">
                Ver detalles
              </button>
            </div>
          </div>
        </div>
      `
      })
      .join("")

    container.innerHTML = html
  }

  async cargarTarifas() {
    const proveedores = ["afinia", "veolia", "surtigas"]

    for (const proveedor of proveedores) {
      try {
        const response = await fetch(`/api/tarifas/${proveedor}`, {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Error al cargar tarifas de ${proveedor}`)
        }

        const result = await response.json()
        const tarifa = result.data

        const container = document.getElementById(`tarifas-${proveedor}`)
        const fechaActualizacion = new Date(tarifa.fechaActualizacion).toLocaleDateString("es-ES")

        container.innerHTML = `
          <div class="text-center">
            <h4 class="text-primary">$${tarifa.valor.toLocaleString()}</h4>
            <p class="mb-1">por ${tarifa.unidad}</p>
            ${tarifa.cargoFijo > 0 ? `<p class="mb-1">Cargo fijo: $${tarifa.cargoFijo.toLocaleString()}</p>` : ""}
            ${tarifa.subsidio ? `<p class="mb-1 text-success">Subsidio: ${tarifa.subsidio}%</p>` : ""}
            <small class="text-muted">Actualizado: ${fechaActualizacion}</small>
            ${tarifa.aproximado ? '<br><small class="text-warning">Valor aproximado</small>' : ""}
          </div>
        `
      } catch (error) {
        console.error(`[v0] Error al cargar tarifas de ${proveedor}:`, error)
        const container = document.getElementById(`tarifas-${proveedor}`)
        container.innerHTML = `
          <div class="text-center text-muted">
            <i class="bi bi-exclamation-triangle"></i>
            <p>Error al cargar tarifas</p>
          </div>
        `
      }
    }
  }

  configurarEventos() {
    // Navegación entre secciones
    document.querySelectorAll("[data-section]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault()
        const section = e.target.closest("[data-section]").dataset.section
        this.mostrarSeccion(section)
      })
    })

    // Botón de actualizar
    window.actualizarDatos = () => {
      this.cargarDatos()
    }

    // Función global para logout
    window.logout = () => {
      localStorage.removeItem("token")
      window.location.href = "/login.html"
    }
  }

  mostrarSeccion(seccionId) {
    // Ocultar todas las secciones
    document.querySelectorAll(".dashboard-section").forEach((section) => {
      section.style.display = "none"
    })

    // Mostrar la sección seleccionada
    const seccion = document.getElementById(`${seccionId}-section`)
    if (seccion) {
      seccion.style.display = "block"
    }

    // Actualizar navegación activa
    document.querySelectorAll("[data-section]").forEach((link) => {
      link.classList.remove("active")
    })

    const linkActivo = document.querySelector(`[data-section="${seccionId}"]`)
    if (linkActivo) {
      linkActivo.classList.add("active")
    }
  }

  async verDetallesFactura(facturaId) {
    try {
      const response = await fetch(`/api/analisis/historial`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Error al cargar detalles de la factura")
      }

      const result = await response.json()
      const factura = result.data.analisis.find((f) => f.id === facturaId)

      if (!factura) {
        throw new Error("Factura no encontrada")
      }

      const anomalias = JSON.parse(factura.anomalias || "[]")
      const recomendaciones = JSON.parse(factura.recomendaciones || "[]")

      const modalBody = document.getElementById("factura-detalles")
      modalBody.innerHTML = `
        <div class="row">
          <div class="col-md-6">
            <h6>Información General</h6>
            <table class="table table-sm">
              <tr><td><strong>Proveedor:</strong></td><td>${factura.proveedor}</td></tr>
              <tr><td><strong>Número:</strong></td><td>${factura.numeroFactura}</td></tr>
              <tr><td><strong>Fecha:</strong></td><td>${new Date(factura.fechaFactura).toLocaleDateString("es-ES")}</td></tr>
              <tr><td><strong>Consumo:</strong></td><td>${factura.consumo} ${factura.unidadConsumo}</td></tr>
              <tr><td><strong>Valor unitario:</strong></td><td>$${factura.valorUnitario.toLocaleString()}</td></tr>
              <tr><td><strong>Total:</strong></td><td>$${factura.valorTotal.toLocaleString()}</td></tr>
            </table>
          </div>
          <div class="col-md-6">
            <h6>Análisis</h6>
            <table class="table table-sm">
              <tr><td><strong>Tarifa referencia:</strong></td><td>$${factura.tarifaReferencia.toLocaleString()}</td></tr>
              <tr><td><strong>Diferencia:</strong></td><td>$${factura.diferenciaTarifa.toLocaleString()}</td></tr>
              <tr><td><strong>% Diferencia:</strong></td><td>${factura.porcentajeDiferencia.toFixed(2)}%</td></tr>
            </table>
          </div>
        </div>
        
        ${
          anomalias.length > 0
            ? `
          <h6 class="mt-3">Anomalías Detectadas</h6>
          <div class="list-group">
            ${anomalias
              .map(
                (a) => `
              <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                  <h6 class="mb-1">${a.type}</h6>
                  <small class="text-${a.severity === "high" ? "danger" : a.severity === "medium" ? "warning" : "info"}">${a.severity.toUpperCase()}</small>
                </div>
                <p class="mb-1">${a.description}</p>
              </div>
            `,
              )
              .join("")}
          </div>
        `
            : ""
        }
        
        ${
          recomendaciones.length > 0
            ? `
          <h6 class="mt-3">Recomendaciones</h6>
          <ul class="list-group">
            ${recomendaciones
              .map(
                (r) => `
              <li class="list-group-item">${r.description}</li>
            `,
              )
              .join("")}
          </ul>
        `
            : ""
        }
      `

      const modal = new window.bootstrap.Modal(document.getElementById("facturaModal"))
      modal.show()
    } catch (error) {
      console.error("[v0] Error al ver detalles de factura:", error)
      this.mostrarError("Error al cargar los detalles de la factura")
    }
  }

  mostrarError(mensaje) {
    // Crear toast de error
    const toast = document.createElement("div")
    toast.className = "toast align-items-center text-white bg-danger border-0"
    toast.setAttribute("role", "alert")
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <i class="bi bi-exclamation-triangle me-2"></i>${mensaje}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `

    // Añadir al DOM y mostrar
    document.body.appendChild(toast)
    const bsToast = new window.bootstrap.Toast(toast)
    bsToast.show()

    // Remover del DOM después de que se oculte
    toast.addEventListener("hidden.bs.toast", () => {
      document.body.removeChild(toast)
    })
  }
}

// Inicializar dashboard cuando se carga la página
document.addEventListener("DOMContentLoaded", () => {
  window.dashboard = new Dashboard()
})
