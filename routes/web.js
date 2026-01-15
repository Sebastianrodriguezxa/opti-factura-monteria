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

// Rutas de aplicación
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

// Rutas de información
router.get("/terminos", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/terminos.html"))
})

router.get("/terminos.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/terminos.html"))
})

// Ruta de estado del sistema
router.get("/status", (req, res) => {
  res.json({
    status: "online",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    server: "OptiFactura Montería",
    environment: process.env.NODE_ENV || "development",
  })
})

// Ruta para verificar conexión
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
})

module.exports = router
