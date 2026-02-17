class Configuracion {
    constructor() {
        this.token = localStorage.getItem("token")
        this.usuario = JSON.parse(localStorage.getItem("usuario") || "null")
        this.init()
    }

    async init() {
        if (!this.token) { window.location.href = "/login.html"; return }
        if (this.usuario) {
            document.getElementById("usuario-nombre").textContent = `${this.usuario.nombre} ${this.usuario.apellido}`
        }
        this.cargarConfiguracion()
        this.configurarEventos()
        window.logout = () => { localStorage.removeItem("token"); localStorage.removeItem("usuario"); window.location.href = "/login.html" }
    }

    configurarEventos() {
        const limiteInput = document.getElementById("limite-alertas")
        limiteInput.addEventListener("input", () => {
            document.getElementById("limite-value").textContent = limiteInput.value
        })
    }

    async cargarConfiguracion() {
        try {
            const response = await fetch("/api/usuario/configuracion", {
                headers: { Authorization: `Bearer ${this.token}` }
            })
            if (response.ok) {
                const result = await response.json()
                const config = result.data
                if (config) {
                    document.getElementById("notif-enabled").checked = config.notificaciones
                    document.getElementById("limite-alertas").value = config.limiteAlertas || 10
                    document.getElementById("limite-value").textContent = config.limiteAlertas || 10
                    if (config.canalesNotificacion) {
                        const canales = typeof config.canalesNotificacion === "string" ? JSON.parse(config.canalesNotificacion) : config.canalesNotificacion
                        document.getElementById("canal-email").checked = canales.email || false
                        document.getElementById("canal-push").checked = canales.push || false
                        document.getElementById("canal-sms").checked = canales.sms || false
                    }
                }
            }
        } catch (error) {
            console.error("Error al cargar configuración:", error)
        }
    }

    async guardar() {
        const data = {
            notificaciones: document.getElementById("notif-enabled").checked,
            limiteAlertas: parseFloat(document.getElementById("limite-alertas").value),
            canalesNotificacion: {
                email: document.getElementById("canal-email").checked,
                push: document.getElementById("canal-push").checked,
                sms: document.getElementById("canal-sms").checked
            }
        }

        try {
            const response = await fetch("/api/usuario/configuracion", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
                body: JSON.stringify(data)
            })
            const result = await response.json()
            if (result.success) {
                this.showAlert("success", "Configuración guardada correctamente")
            } else {
                this.showAlert("danger", result.message || "Error al guardar configuración")
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

document.addEventListener("DOMContentLoaded", () => { window.configuracion = new Configuracion() })
