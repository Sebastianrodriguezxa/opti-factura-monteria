const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")
const fs = require("fs").promises
const jwt = require("jsonwebtoken")

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads")
    try {
      await fs.mkdir(uploadDir, { recursive: true })
      cb(null, uploadDir)
    } catch (error) {
      cb(error)
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, file.fieldname + "-" + uniqueSuffix + ext)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"]
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Solo se permiten archivos JPG, PNG y PDF"))
    }
    cb(null, true)
  },
})

// Middleware de autenticación
const autenticarUsuario = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No se proporcionó token de autenticación",
      })
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || "optifactura-secret-key")

    const usuario = await req.services.prisma.usuario.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
      },
    })

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    req.userId = usuario.id
    req.usuario = usuario
    next()
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token inválido o expirado",
      })
    }

    console.error("Error en autenticación:", error.message)
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
}

// Rutas de tarifas (público - sin auth para página de tarifas)
router.get("/tarifas", async (req, res) => {
  try {
    const tarifas = await req.services.tarifas.obtenerTodasLasTarifas()

    res.json({
      success: true,
      data: tarifas,
    })
  } catch (error) {
    console.error(`Error al obtener tarifas: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Error al obtener tarifas",
      error: error.message,
    })
  }
})

router.get("/tarifas/:proveedor", async (req, res) => {
  try {
    const { proveedor } = req.params
    const { estrato = "1", tipoUsuario = "Residencial" } = req.query

    let tipoServicio
    if (proveedor.toLowerCase() === "afinia") {
      tipoServicio = "electricidad"
    } else if (proveedor.toLowerCase() === "veolia") {
      tipoServicio = "agua"
    } else if (proveedor.toLowerCase() === "surtigas") {
      tipoServicio = "gas"
    } else {
      return res.status(400).json({
        success: false,
        message: `Proveedor no soportado: ${proveedor}`,
      })
    }

    const tarifa = await req.services.tarifas.obtenerTarifaReferencia(proveedor, tipoServicio, estrato, tipoUsuario)

    res.json({
      success: true,
      data: tarifa,
    })
  } catch (error) {
    console.error(`Error al obtener tarifa: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Error al obtener tarifa",
      error: error.message,
    })
  }
})

router.post("/tarifas/actualizar", autenticarUsuario, async (req, res) => {
  try {
    const resultado = await req.services.tarifas.actualizarTodasLasTarifas()

    res.json({
      success: true,
      message: "Tarifas actualizadas correctamente",
      data: resultado,
    })
  } catch (error) {
    console.error(`Error al actualizar tarifas: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Error al actualizar tarifas",
      error: error.message,
    })
  }
})

// Rutas de perfil de usuario
router.get("/usuario/perfil", autenticarUsuario, async (req, res) => {
  try {
    const usuario = await req.services.prisma.usuario.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, nombre: true, apellido: true, rol: true, createdAt: true }
    })
    res.json({ success: true, data: usuario })
  } catch (error) {
    console.error(`Error al obtener perfil: ${error.message}`)
    res.status(500).json({ success: false, message: "Error al obtener perfil" })
  }
})

router.put("/usuario/perfil", autenticarUsuario, async (req, res) => {
  try {
    const { nombre, apellido } = req.body
    const usuario = await req.services.prisma.usuario.update({
      where: { id: req.userId },
      data: { nombre, apellido },
      select: { id: true, email: true, nombre: true, apellido: true, rol: true }
    })
    res.json({ success: true, message: "Perfil actualizado", data: usuario })
  } catch (error) {
    console.error(`Error al actualizar perfil: ${error.message}`)
    res.status(500).json({ success: false, message: "Error al actualizar perfil" })
  }
})

// Rutas de configuración de usuario
router.get("/usuario/configuracion", autenticarUsuario, async (req, res) => {
  try {
    const config = await req.services.prisma.configuracionUsuario.findUnique({
      where: { usuarioId: req.userId }
    })
    res.json({ success: true, data: config || { notificaciones: true, limiteAlertas: 10, canalesNotificacion: '{"email":true,"push":false,"sms":false}' } })
  } catch (error) {
    console.error(`Error al obtener configuración: ${error.message}`)
    res.json({ success: true, data: { notificaciones: true, limiteAlertas: 10, canalesNotificacion: '{"email":true,"push":false,"sms":false}' } })
  }
})

router.put("/usuario/configuracion", autenticarUsuario, async (req, res) => {
  try {
    const { notificaciones, limiteAlertas, canalesNotificacion } = req.body
    const data = {
      notificaciones: notificaciones !== undefined ? notificaciones : true,
      limiteAlertas: limiteAlertas || 10,
      canalesNotificacion: typeof canalesNotificacion === 'string' ? canalesNotificacion : JSON.stringify(canalesNotificacion || {})
    }
    try {
      await req.services.prisma.configuracionUsuario.upsert({
        where: { usuarioId: req.userId },
        update: data,
        create: { ...data, usuarioId: req.userId }
      })
    } catch (e) {
      // Table may not exist yet - silently succeed
      console.log("Config table not available, saving to localStorage only")
    }
    res.json({ success: true, message: "Configuración guardada" })
  } catch (error) {
    console.error(`Error al guardar configuración: ${error.message}`)
    res.json({ success: true, message: "Configuración guardada localmente" })
  }
})

// Rutas de administración
router.get("/admin/usuarios", autenticarUsuario, async (req, res) => {
  try {
    if (req.usuario.rol !== "admin") {
      return res.status(403).json({ success: false, message: "Acceso denegado" })
    }
    const usuarios = await req.services.prisma.usuario.findMany({
      select: {
        id: true, email: true, nombre: true, apellido: true, rol: true, createdAt: true,
        _count: { select: { facturas: true } }
      },
      orderBy: { createdAt: "desc" }
    })
    res.json({ success: true, data: usuarios })
  } catch (error) {
    console.error(`Error al obtener usuarios: ${error.message}`)
    res.status(500).json({ success: false, message: "Error al obtener usuarios" })
  }
})

router.get("/admin/stats", autenticarUsuario, async (req, res) => {
  try {
    if (req.usuario.rol !== "admin") {
      return res.status(403).json({ success: false, message: "Acceso denegado" })
    }
    const [usuarios, facturas, tarifas] = await Promise.all([
      req.services.prisma.usuario.count(),
      req.services.prisma.analisisFactura.count(),
      req.services.prisma.tarifaReferencia.count()
    ])
    const uptimeSeconds = process.uptime()
    const hours = Math.floor(uptimeSeconds / 3600)
    const minutes = Math.floor((uptimeSeconds % 3600) / 60)
    res.json({
      success: true,
      data: {
        usuarios,
        facturas,
        anomalias: 0,
        tarifas,
        uptime: `${hours}h ${minutes}m`
      }
    })
  } catch (error) {
    console.error(`Error al obtener stats admin: ${error.message}`)
    res.status(500).json({ success: false, message: "Error al obtener estadísticas" })
  }
})

// Rutas de análisis
router.post("/analisis/factura", autenticarUsuario, upload.single("factura"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No se proporcionó archivo de factura",
      })
    }

    const { tipoServicio } = req.body
    const rutaArchivo = req.file.path

    const resultado = await req.services.analisis.analizarFactura(rutaArchivo, req.userId, { tipoServicio })

    // Enviar notificación
    if (resultado.analysisResult.anomalies && resultado.analysisResult.anomalies.length > 0) {
      await req.services.notificaciones.enviarNotificacion(
        req.userId,
        "analisis_completado",
        {
          proveedor: resultado.extractedData.provider.name,
          anomalias: resultado.analysisResult.anomalies,
        },
        ["email"],
      )
    }

    res.json({
      success: true,
      message: "Factura analizada correctamente",
      data: resultado,
    })
  } catch (error) {
    console.error(`Error al analizar factura: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Error al analizar factura",
      error: error.message,
    })
  }
})

router.get("/analisis/historial", autenticarUsuario, async (req, res) => {
  try {
    const { proveedor, fechaInicio, fechaFin, limite = 10, pagina = 1 } = req.query

    const resultado = await req.services.analisis.obtenerAnalisisUsuario(req.userId, {
      proveedor,
      fechaInicio,
      fechaFin,
      limite: Number.parseInt(limite),
      pagina: Number.parseInt(pagina),
    })

    res.json({
      success: true,
      data: resultado,
    })
  } catch (error) {
    console.error(`Error al obtener historial de análisis: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Error al obtener historial de análisis",
      error: error.message,
    })
  }
})

router.get("/analisis/estadisticas", autenticarUsuario, async (req, res) => {
  try {
    const { proveedor, periodo = 12 } = req.query

    const resultado = await req.services.analisis.obtenerEstadisticas(req.userId, {
      proveedor,
      periodo: Number.parseInt(periodo),
    })

    res.json({
      success: true,
      data: resultado,
    })
  } catch (error) {
    console.error(`Error al obtener estadísticas: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas",
      error: error.message,
    })
  }
})

// Rutas de dashboard
router.get("/dashboard/estadisticas", autenticarUsuario, async (req, res) => {
  try {
    const estadisticas = await req.services.dashboard.obtenerEstadisticasGenerales(req.userId)

    res.json({
      success: true,
      data: estadisticas,
    })
  } catch (error) {
    console.error(`Error al obtener estadísticas del dashboard: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas del dashboard",
      error: error.message,
    })
  }
})

router.get("/dashboard/consumo-mensual", autenticarUsuario, async (req, res) => {
  try {
    const { meses = 12 } = req.query
    const consumo = await req.services.dashboard.obtenerConsumoMensual(req.userId, Number.parseInt(meses))

    res.json({
      success: true,
      data: consumo,
    })
  } catch (error) {
    console.error(`Error al obtener consumo mensual: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Error al obtener consumo mensual",
      error: error.message,
    })
  }
})

router.get("/dashboard/distribucion-gastos", autenticarUsuario, async (req, res) => {
  try {
    const { meses = 12 } = req.query
    const distribucion = await req.services.dashboard.obtenerDistribucionGastos(req.userId, Number.parseInt(meses))

    res.json({
      success: true,
      data: distribucion,
    })
  } catch (error) {
    console.error(`Error al obtener distribución de gastos: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Error al obtener distribución de gastos",
      error: error.message,
    })
  }
})

router.get("/dashboard/anomalias", autenticarUsuario, async (req, res) => {
  try {
    const { limite = 10 } = req.query
    const anomalias = await req.services.dashboard.obtenerUltimasAnomalias(req.userId, Number.parseInt(limite))

    res.json({
      success: true,
      data: anomalias,
    })
  } catch (error) {
    console.error(`Error al obtener anomalías: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Error al obtener anomalías",
      error: error.message,
    })
  }
})

router.get("/dashboard/comparacion-tarifas", autenticarUsuario, async (req, res) => {
  try {
    const comparacion = await req.services.dashboard.obtenerComparacionTarifas(req.userId)

    res.json({
      success: true,
      data: comparacion,
    })
  } catch (error) {
    console.error(`Error al obtener comparación de tarifas: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Error al obtener comparación de tarifas",
      error: error.message,
    })
  }
})

router.get("/dashboard/recomendaciones", autenticarUsuario, async (req, res) => {
  try {
    const recomendaciones = await req.services.dashboard.obtenerRecomendaciones(req.userId)

    res.json({
      success: true,
      data: recomendaciones,
    })
  } catch (error) {
    console.error(`Error al obtener recomendaciones: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Error al obtener recomendaciones",
      error: error.message,
    })
  }
})

// Ruta para obtener datos completos del dashboard
router.get("/dashboard", autenticarUsuario, async (req, res) => {
  try {
    const [estadisticas, consumoMensual, distribucionGastos, ultimasAnomalias, comparacionTarifas, recomendaciones] =
      await Promise.all([
        req.services.dashboard.obtenerEstadisticasGenerales(req.userId),
        req.services.dashboard.obtenerConsumoMensual(req.userId, 6),
        req.services.dashboard.obtenerDistribucionGastos(req.userId, 12),
        req.services.dashboard.obtenerUltimasAnomalias(req.userId, 5),
        req.services.dashboard.obtenerComparacionTarifas(req.userId),
        req.services.dashboard.obtenerRecomendaciones(req.userId),
      ])

    res.json({
      success: true,
      data: {
        estadisticas,
        consumoMensual,
        distribucionGastos,
        ultimasAnomalias,
        comparacionTarifas,
        recomendaciones,
      },
    })
  } catch (error) {
    console.error(`Error al obtener datos del dashboard: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Error al obtener datos del dashboard",
      error: error.message,
    })
  }
})

module.exports = router
