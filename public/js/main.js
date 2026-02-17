document.addEventListener("DOMContentLoaded", () => {
  // Initialize Bootstrap tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
  tooltipTriggerList.map((el) => new bootstrap.Tooltip(el))

  // Initialize Bootstrap popovers
  const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
  popoverTriggerList.map((el) => new bootstrap.Popover(el))

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault()
      const targetId = this.getAttribute("href")
      if (targetId === "#") return
      const target = document.querySelector(targetId)
      if (target) {
        window.scrollTo({
          top: target.offsetTop - 70,
          behavior: "smooth",
        })
      }
    })
  })

  // Adaptive navbar based on auth state
  updateNavbar()

  // Navbar background on scroll
  const navbar = document.querySelector(".navbar.fixed-top")
  if (navbar) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 50) {
        navbar.style.background = "rgba(15, 23, 42, 0.95)"
      } else {
        navbar.style.background = "rgba(15, 23, 42, 0.85)"
      }
    })
  }
})

function updateNavbar() {
  const token = localStorage.getItem("token")
  const usuario = JSON.parse(localStorage.getItem("usuario") || "null")

  const guestItems = document.querySelectorAll(".nav-guest")
  const authItems = document.querySelectorAll(".nav-auth")
  const adminItems = document.querySelectorAll(".nav-admin")

  if (token && usuario) {
    // User is logged in
    guestItems.forEach((el) => (el.style.display = "none"))
    authItems.forEach((el) => (el.style.display = ""))

    // Update user name
    const nombreEl = document.getElementById("usuario-nombre")
    if (nombreEl) {
      nombreEl.textContent = `${usuario.nombre} ${usuario.apellido}`
    }

    // Show admin items if admin role
    if (usuario.rol === "admin") {
      adminItems.forEach((el) => (el.style.display = ""))
    }
  } else {
    // User is not logged in
    guestItems.forEach((el) => (el.style.display = ""))
    authItems.forEach((el) => (el.style.display = "none"))
    adminItems.forEach((el) => (el.style.display = "none"))
  }
}

// Global logout function
window.logout = () => {
  localStorage.removeItem("token")
  localStorage.removeItem("usuario")
  window.location.href = "/login.html"
}
