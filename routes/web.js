const express = require("express")
const router = express.Router()
const path = require("path")

// Ruta principal
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"))
})

// Rutas de autenticación
router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/login.html"))
})

router.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/login.html"))
})

router.get("/registro", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/registro.html"))
})

router.get("/registro.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/registro.html"))
})

// Rutas de la app
router.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/dashboard.html"))
})

router.get("/dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/dashboard.html"))
})

router.get("/analizar", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/analizar.html"))
})

router.get("/analizar.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/analizar.html"))
})

// Nuevas rutas
router.get("/perfil", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/perfil.html"))
})

router.get("/configuracion", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/configuracion.html"))
})

router.get("/tarifas", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/tarifas.html"))
})

router.get("/contacto", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/contacto.html"))
})

router.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin.html"))
})

// Términos
router.get("/terminos", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/terminos.html"))
})

router.get("/terminos.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/terminos.html"))
})

module.exports = router
