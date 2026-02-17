class Dashboard {
  constructor() {
    this.token = localStorage.getItem("token")
    this.usuario = JSON.parse(localStorage.getItem("usuario") || "null")
    this.init()
  }

  async init() {
    if (!this.token) { window.location.href = "/login.html"; return }
    this.configurarUI()
    await this.cargarDashboard()
    window.logout = () => { localStorage.removeItem("token"); localStorage.removeItem("usuario"); window.location.href = "/login.html" }
  }

  configurarUI() {
    if (this.usuario) {
      document.getElementById("usuario-nombre").textContent = `${this.usuario.nombre} ${this.usuario.apellido}`
      document.getElementById("welcome-name").textContent = this.usuario.nombre
      if (this.usuario.rol === "admin") {
        document.querySelectorAll(".nav-admin").forEach(el => el.style.display = "")
      }
    }
  }

  async cargarDashboard() {
    const loading = document.getElementById("loading")
    const content = document.getElementById("dashboard-content")

    try {
      const response = await fetch("/api/dashboard", {
        headers: { Authorization: `Bearer ${this.token}` }
      })

      if (response.status === 401) { this.forceLogout(); return }

      if (response.ok) {
        const result = await response.json()
        const data = result.data
        this.renderizarEstadisticas(data.estadisticas)
        this.renderizarFacturas(data.estadisticas)
        this.renderizarDistribucion(data.distribucionGastos)
        this.renderizarRecomendaciones(data.recomendaciones)
        this.renderizarAnomalias(data.ultimasAnomalias)
      }
    } catch (error) {
      console.error("Error al cargar dashboard:", error)
    } finally {
      loading.style.display = "none"
      content.style.display = "block"
    }
  }

  renderizarEstadisticas(stats) {
    if (!stats) return
    document.getElementById("stat-total-facturas").textContent = stats.totalFacturas || 0
    document.getElementById("stat-ahorro").textContent = `$${(stats.ahorroTotal || 0).toLocaleString('es-CO')}`
    document.getElementById("stat-anomalias").textContent = stats.anomaliasDetectadas || 0
    document.getElementById("stat-promedio").textContent = `$${(stats.gastoPromedio || 0).toLocaleString('es-CO')}`
  }

  renderizarFacturas(stats) {
    if (!stats || !stats.ultimosAnalisis || stats.ultimosAnalisis.length === 0) return
    const tbody = document.getElementById("tabla-facturas")
    tbody.innerHTML = stats.ultimosAnalisis.map(f => {
      const fecha = new Date(f.createdAt).toLocaleDateString('es-CO')
      const estado = f.anomaliasDetectadas > 0
        ? `<span class="badge bg-warning"><i class="bi bi-exclamation-triangle me-1"></i>${f.anomaliasDetectadas} anomalías</span>`
        : '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Normal</span>'
      return `<tr>
        <td>${fecha}</td>
        <td>${f.proveedor || 'N/A'}</td>
        <td>$${(f.montoTotal || 0).toLocaleString('es-CO')}</td>
        <td>${estado}</td>
      </tr>`
    }).join("")
  }

  renderizarDistribucion(distribucion) {
    const container = document.getElementById("distribucion-gastos")
    if (!distribucion || distribucion.length === 0) return

    const total = distribucion.reduce((sum, d) => sum + (d.total || 0), 0)
    if (total === 0) return

    const colors = { afinia: '#6366f1', veolia: '#0ea5e9', surtigas: '#f59e0b' }
    container.innerHTML = distribucion.map(d => {
      const pct = total > 0 ? ((d.total / total) * 100).toFixed(1) : 0
      const color = colors[d.proveedor?.toLowerCase()] || '#94a3b8'
      return `<div class="mb-3">
        <div class="d-flex justify-content-between mb-1">
          <small>${d.proveedor}</small>
          <small>$${(d.total || 0).toLocaleString('es-CO')} (${pct}%)</small>
        </div>
        <div class="progress"><div class="progress-bar" style="width:${pct}%;background:${color};"></div></div>
      </div>`
    }).join("")
  }

  renderizarRecomendaciones(recomendaciones) {
    const container = document.getElementById("recomendaciones")
    if (!recomendaciones || recomendaciones.length === 0) return

    container.innerHTML = recomendaciones.map(r => `
      <div class="d-flex align-items-start mb-3 pb-3" style="border-bottom: 1px solid var(--border-color);">
        <i class="bi bi-lightbulb me-2 mt-1" style="color:var(--accent);"></i>
        <div>
          <strong class="d-block mb-1">${r.titulo || 'Sugerencia'}</strong>
          <small class="text-muted">${r.descripcion || r.mensaje || ''}</small>
        </div>
      </div>
    `).join("")
  }

  renderizarAnomalias(anomalias) {
    const container = document.getElementById("anomalias-recientes")
    if (!anomalias || anomalias.length === 0) return

    container.innerHTML = anomalias.map(a => `
      <div class="d-flex align-items-start mb-3 pb-3" style="border-bottom: 1px solid var(--border-color);">
        <i class="bi bi-exclamation-triangle me-2 mt-1" style="color:var(--warning);"></i>
        <div>
          <strong class="d-block mb-1">${a.tipo || 'Anomalía'}</strong>
          <small class="text-muted">${a.descripcion || a.mensaje || ''}</small>
          ${a.diferencia ? `<br><small class="text-danger">Diferencia: ${a.diferencia}%</small>` : ''}
        </div>
      </div>
    `).join("")
  }

  forceLogout() {
    localStorage.removeItem("token")
    localStorage.removeItem("usuario")
    window.location.href = "/login.html"
  }
}

document.addEventListener("DOMContentLoaded", () => { new Dashboard() })
