class AdminPanel {
    constructor() {
        this.token = localStorage.getItem("token")
        this.usuario = JSON.parse(localStorage.getItem("usuario") || "null")
        this.init()
    }

    async init() {
        if (!this.token) { window.location.href = "/login.html"; return }
        if (!this.usuario || this.usuario.rol !== "admin") {
            document.getElementById("access-denied").style.display = "block"
            return
        }

        document.getElementById("admin-content").style.display = "block"
        document.getElementById("usuario-nombre").textContent = `${this.usuario.nombre} ${this.usuario.apellido}`

        window.logout = () => { localStorage.removeItem("token"); localStorage.removeItem("usuario"); window.location.href = "/login.html" }

        this.cargarEstadisticas()
        this.cargarUsuarios()
    }

    async cargarEstadisticas() {
        try {
            const response = await fetch("/api/admin/stats", {
                headers: { Authorization: `Bearer ${this.token}` }
            })
            if (response.ok) {
                const result = await response.json()
                const stats = result.data
                document.getElementById("stat-usuarios").textContent = stats.usuarios || 0
                document.getElementById("stat-facturas-total").textContent = stats.facturas || 0
                document.getElementById("stat-anomalias-total").textContent = stats.anomalias || 0
                document.getElementById("stat-tarifas-total").textContent = stats.tarifas || 0
                document.getElementById("server-uptime").textContent = stats.uptime || "Activo"
            }
        } catch (error) {
            console.error("Error al cargar estadísticas admin:", error)
        }
    }

    async cargarUsuarios() {
        try {
            const response = await fetch("/api/admin/usuarios", {
                headers: { Authorization: `Bearer ${this.token}` }
            })
            if (response.ok) {
                const result = await response.json()
                const usuarios = result.data || []
                const tbody = document.getElementById("tabla-usuarios")

                if (usuarios.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No hay usuarios registrados</td></tr>`
                    return
                }

                tbody.innerHTML = usuarios.map(u => `
          <tr>
            <td><strong>${u.nombre} ${u.apellido}</strong></td>
            <td>${u.email}</td>
            <td><span class="badge ${u.rol === 'admin' ? 'bg-danger' : 'bg-primary'}">${u.rol}</span></td>
            <td>${new Date(u.createdAt).toLocaleDateString('es-CO')}</td>
            <td>${u._count?.facturas || 0}</td>
          </tr>
        `).join("")
            }
        } catch (error) {
            console.error("Error al cargar usuarios:", error)
        }
    }

    async actualizarTarifas() {
        const btn = document.getElementById("btn-actualizar-tarifas")
        const statusDiv = document.getElementById("tarifas-status")

        btn.disabled = true
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Actualizando...'
        statusDiv.innerHTML = '<div class="alert alert-info"><i class="bi bi-hourglass-split me-2"></i>Actualizando tarifas desde proveedores oficiales... Esto puede tomar unos segundos.</div>'

        try {
            const response = await fetch("/api/tarifas/actualizar", {
                method: "POST",
                headers: { Authorization: `Bearer ${this.token}` }
            })
            const result = await response.json()
            if (result.success) {
                statusDiv.innerHTML = '<div class="alert alert-success"><i class="bi bi-check-circle me-2"></i>Tarifas actualizadas correctamente.</div>'
                this.cargarEstadisticas()
            } else {
                statusDiv.innerHTML = `<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>${result.message || 'Error al actualizar tarifas'}</div>`
            }
        } catch (error) {
            statusDiv.innerHTML = '<div class="alert alert-danger"><i class="bi bi-x-circle me-2"></i>Error de conexión al actualizar tarifas.</div>'
        } finally {
            btn.disabled = false
            btn.innerHTML = '<i class="bi bi-download me-1"></i>Actualizar Tarifas'
        }
    }

    showAlert(type, message) {
        const container = document.getElementById("alert-container")
        container.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show">${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`
    }
}

document.addEventListener("DOMContentLoaded", () => { window.admin = new AdminPanel() })
