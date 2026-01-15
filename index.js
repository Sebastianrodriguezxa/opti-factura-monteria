require("dotenv").config()
const express = require("express")
const cors = require("cors")
const path = require("path")
const session = require("express-session")
const bcryptjs = require("bcryptjs")
const jwt = require("jsonwebtoken")

const { getPrisma } = require("./lib/prisma")

// Importar rutas
const apiRoutes = require("./routes/api")
const webRoutes = require("./routes/web")
const authRoutes = require("./routes/auth")

// Importar servicios
const TarifasService = require("./services/tarifas-service")
const AnalisisService = require("./services/analisis-service")
const NotificacionesService = require("./services/notificaciones-service")
const EmailService = require("./services/email-service")
const DashboardService = require("./services/dashboard-service")

// Crear instancia de Express
const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
)
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))
app.use(express.static(path.join(__dirname, "public")))

// Configurar sesiones
app.use(
  session({
    secret: process.env.NEXTAUTH_SECRET || "optifactura-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
    },
  }),
)

// Inicializar servicios
const emailService = new EmailService({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
})

const notificacionesService = new NotificacionesService({ emailService })
const tarifasService = new TarifasService({ prisma: getPrisma() })
const analisisService = new AnalisisService({ prisma: getPrisma(), tarifasService })
const dashboardService = new DashboardService({ prisma: getPrisma() })

// Inyectar servicios en el contexto de la aplicación
app.use((req, res, next) => {
  req.services = {
    tarifas: tarifasService,
    analisis: analisisService,
    notificaciones: notificacionesService,
    dashboard: dashboardService,
    email: emailService,
    prisma: getPrisma(),
  }
  next()
})

// Configurar rutas
app.use("/auth", authRoutes)
app.use("/api", apiRoutes)
app.use("/", webRoutes)

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error("Error:", err.stack)

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Error de validación",
      errors: err.errors,
    })
  }

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({
      success: false,
      message: "No autorizado",
    })
  }

  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
    error: process.env.NODE_ENV === "development" ? err.message : "Error interno",
  })
})

// Iniciar servidor
async function iniciarSistema() {
  try {
    console.log("🚀 Iniciando OptiFactura Montería...")

    // Verificar conexión a la base de datos
    const prisma = getPrisma()
    await prisma.$connect()
    console.log("✅ Conexión a base de datos establecida")

    // Iniciar servidor
    const server = app.listen(PORT, () => {
      console.log(`🌐 Servidor OptiFactura iniciado en puerto ${PORT}`)
      console.log(`📊 Accede a http://localhost:${PORT}`)
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || "development"}`)
    })

    // Programar tareas automáticas
    if (process.env.HABILITAR_ACTUALIZACION_AUTOMATICA === "true") {
      await tarifasService.programarActualizacionTarifas()
      console.log("⏰ Actualización automática de tarifas programada")
    }

    // Configurar cierre graceful
    process.on("SIGTERM", () => gracefulShutdown(server, getPrisma()))
    process.on("SIGINT", () => gracefulShutdown(server, getPrisma()))
  } catch (error) {
    console.error("❌ Error al iniciar el sistema:", error.message)
    process.exit(1)
  }
}

// Función para cierre graceful
async function gracefulShutdown(server, prismaClient) {
  console.log("🔄 Cerrando servicios...")

  server.close(async () => {
    console.log("🔌 Servidor HTTP cerrado")
    if (prismaClient) {
      await prismaClient.$disconnect()
    }
    process.exit(0)
  })
}

// Iniciar sistema
if (require.main === module) {
  iniciarSistema()
}

module.exports = app
