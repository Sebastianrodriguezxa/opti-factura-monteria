class Auth {
  constructor() {
    this.init()
  }

  init() {
    // Verificar si ya está autenticado
    const token = localStorage.getItem("token")
    if (token && (window.location.pathname.includes("login") || window.location.pathname.includes("registro"))) {
      this.verificarToken(token).then((valido) => {
        if (valido) {
          window.location.href = "/dashboard.html"
        }
      })
    }

    this.configurarEventos()
  }

  configurarEventos() {
    // Formulario de login
    const loginForm = document.getElementById("login-form")
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e))
    }

    // Formulario de registro
    const registroForm = document.getElementById("registro-form")
    if (registroForm) {
      registroForm.addEventListener("submit", (e) => this.handleRegistro(e))
    }

    // Toggle password visibility
    const togglePassword = document.getElementById("toggle-password")
    if (togglePassword) {
      togglePassword.addEventListener("click", this.togglePasswordVisibility)
    }

    // Validación de confirmación de contraseña
    const confirmPassword = document.getElementById("confirm-password")
    if (confirmPassword) {
      confirmPassword.addEventListener("input", this.validatePasswordConfirmation)
    }
  }

  async handleLogin(e) {
    e.preventDefault()

    const btn = document.getElementById("login-btn")
    const spinner = btn.querySelector(".spinner-border")
    const formData = new FormData(e.target)

    try {
      this.setLoading(btn, spinner, true)

      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      })

      const result = await response.json()

      if (result.success) {
        localStorage.setItem("token", result.data.token)
        localStorage.setItem("usuario", JSON.stringify(result.data.usuario))

        this.showAlert("success", "¡Bienvenido! Redirigiendo al dashboard...")

        setTimeout(() => {
          window.location.href = "/dashboard.html"
        }, 1500)
      } else {
        this.showAlert("danger", result.message || "Error al iniciar sesión")
      }
    } catch (error) {
      console.error("Error en login:", error)
      this.showAlert("danger", "Error de conexión. Intenta nuevamente.")
    } finally {
      this.setLoading(btn, spinner, false)
    }
  }

  async handleRegistro(e) {
    e.preventDefault()

    const btn = document.getElementById("registro-btn")
    const spinner = btn.querySelector(".spinner-border")
    const formData = new FormData(e.target)

    // Validar contraseñas
    const password = formData.get("password")
    const confirmPassword = formData.get("confirmPassword")

    if (password !== confirmPassword) {
      this.showAlert("danger", "Las contraseñas no coinciden")
      return
    }

    try {
      this.setLoading(btn, spinner, true)

      const response = await fetch("/auth/registro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: formData.get("nombre"),
          apellido: formData.get("apellido"),
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      })

      const result = await response.json()

      if (result.success) {
        localStorage.setItem("token", result.data.token)
        localStorage.setItem("usuario", JSON.stringify(result.data.usuario))

        this.showAlert("success", "¡Cuenta creada exitosamente! Redirigiendo al dashboard...")

        setTimeout(() => {
          window.location.href = "/dashboard.html"
        }, 2000)
      } else {
        if (result.errors && Array.isArray(result.errors)) {
          const errorMessages = result.errors.map((err) => err.msg).join("<br>")
          this.showAlert("danger", errorMessages)
        } else {
          this.showAlert("danger", result.message || "Error al crear la cuenta")
        }
      }
    } catch (error) {
      console.error("Error en registro:", error)
      this.showAlert("danger", "Error de conexión. Intenta nuevamente.")
    } finally {
      this.setLoading(btn, spinner, false)
    }
  }

  async verificarToken(token) {
    try {
      const response = await fetch("/auth/verificar", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  togglePasswordVisibility() {
    const passwordInput = document.getElementById("password")
    const icon = this.querySelector("i")

    if (passwordInput.type === "password") {
      passwordInput.type = "text"
      icon.className = "bi bi-eye-slash"
    } else {
      passwordInput.type = "password"
      icon.className = "bi bi-eye"
    }
  }

  validatePasswordConfirmation() {
    const password = document.getElementById("password").value
    const confirmPassword = this.value

    if (confirmPassword && password !== confirmPassword) {
      this.setCustomValidity("Las contraseñas no coinciden")
      this.classList.add("is-invalid")
    } else {
      this.setCustomValidity("")
      this.classList.remove("is-invalid")
      if (confirmPassword) {
        this.classList.add("is-valid")
      }
    }
  }

  setLoading(btn, spinner, loading) {
    if (loading) {
      btn.disabled = true
      spinner.classList.remove("d-none")
    } else {
      btn.disabled = false
      spinner.classList.add("d-none")
    }
  }

  showAlert(type, message) {
    const container = document.getElementById("alert-container")
    const alert = document.createElement("div")
    alert.className = `alert alert-${type} alert-dismissible fade show`
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `

    container.innerHTML = ""
    container.appendChild(alert)

    // Auto-dismiss after 5 seconds for success messages
    if (type === "success") {
      setTimeout(() => {
        if (alert.parentNode) {
          alert.remove()
        }
      }, 5000)
    }
  }
}

// Función global para logout
window.logout = () => {
  localStorage.removeItem("token")
  localStorage.removeItem("usuario")
  window.location.href = "/login.html"
}

// Inicializar cuando se carga la página
document.addEventListener("DOMContentLoaded", () => {
  new Auth()
})
