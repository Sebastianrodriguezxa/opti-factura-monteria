class Perfil {
    constructor() {
        this.token = localStorage.getItem("token")
        this.usuario = JSON.parse(localStorage.getItem("usuario") || "null")
        this.init()
    }

    async init() {
        if (!this.token) { window.location.href = "/login.html"; return }
        this.cargarDatosPerfil()
        this.cargarEstadisticas()
        this.configurarEventos()
    }

    cargarDatosPerfil() {
        if (!this.usuario) return
        document.getElementById("profile-fullname").textContent = `${this.usuario.nombre} ${this.usuario.apellido}`
        document.getElementById("profile-email").textContent = this.usuario.email
        document.getElementById("profile-role").textContent = this.usuario.rol === "admin" ? "Administrador" : "Usuario"
        document.getElementById("profile-avatar").textContent = `${this.usuario.nombre[0]}${this.usuario.apellido[0]}`
        document.getElementById("usuario-nombre").textContent = `${this.usuario.nombre} ${this.usuario.apellido}`
        document.getElementById("nombre").value = this.usuario.nombre
        document.getElementById("apellido").value = this.usuario.apellido
        document.getElementById("email").value = this.usuario.email
    }

    async cargarEstadisticas() {
        try {
            const response = await fetch("/api/dashboard/estadisticas", {
                headers: { Authorization: `Bearer ${this.token}` }
            })
            if (response.ok) {
                const result = await response.json()
                const stats = result.data
                document.getElementById("stat-facturas").textContent = stats.totalFacturas || 0
                document.getElementById("stat-ahorro").textContent = `$${(stats.ahorroTotal || 0).toLocaleString()}`
                document.getElementById("stat-anomalias").textContent = stats.anomaliasDetectadas || 0
            }
        } catch (error) {
            console.error("Error al cargar estadísticas:", error)
        }
    }

    configurarEventos() {
        document.getElementById("perfil-form").addEventListener("submit", (e) => this.guardarPerfil(e))
        document.getElementById("password-form").addEventListener("submit", (e) => this.cambiarPassword(e))
        window.logout = () => { localStorage.removeItem("token"); localStorage.removeItem("usuario"); window.location.href = "/login.html" }
    }

    async guardarPerfil(e) {
        e.preventDefault()
        const nombre = document.getElementById("nombre").value
        const apellido = document.getElementById("apellido").value

        try {
            const response = await fetch("/api/usuario/perfil", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
                body: JSON.stringify({ nombre, apellido })
            })
            const result = await response.json()
            if (result.success) {
                this.usuario = { ...this.usuario, nombre, apellido }
                localStorage.setItem("usuario", JSON.stringify(this.usuario))
                this.cargarDatosPerfil()
                this.showAlert("success", "Perfil actualizado correctamente")
            } else {
                this.showAlert("danger", result.message || "Error al actualizar perfil")
            }
        } catch (error) {
            this.showAlert("danger", "Error de conexión")
        }
    }

    async cambiarPassword(e) {
        e.preventDefault()
        const passwordActual = document.getElementById("current-password").value
        const passwordNueva = document.getElementById("new-password").value
        const confirmPassword = document.getElementById("confirm-new-password").value

        if (passwordNueva !== confirmPassword) {
            this.showAlert("danger", "Las contraseñas nuevas no coinciden")
            return
        }

        try {
            const response = await fetch("/auth/cambiar-password", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
                body: JSON.stringify({ passwordActual, passwordNueva })
            })
            const result = await response.json()
            if (result.success) {
                this.showAlert("success", "Contraseña cambiada correctamente")
                document.getElementById("password-form").reset()
            } else {
                this.showAlert("danger", result.message || "Error al cambiar contraseña")
            }
        } catch (error) {
            this.showAlert("danger", "Error de conexión")
        }
    }

    showAlert(type, message) {
        const container = document.getElementById("alert-container")
        container.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show">${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`
        if (type === "success") setTimeout(() => { container.innerHTML = "" }, 4000)
    }
}

document.addEventListener("DOMContentLoaded", () => { new Perfil() })
