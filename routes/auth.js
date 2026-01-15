const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { body, validationResult } = require("express-validator")
const router = express.Router()

// Middleware de validación
const validarRegistro = [
  body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
  body("password").isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),
  body("nombre").trim().isLength({ min: 2 }).withMessage("El nombre debe tener al menos 2 caracteres"),
  body("apellido").trim().isLength({ min: 2 }).withMessage("El apellido debe tener al menos 2 caracteres"),
]

const validarLogin = [
  body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
  body("password").notEmpty().withMessage("La contraseña es requerida"),
]

// Registro de usuario
router.post("/registro", validarRegistro, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Errores de validación",
        errors: errors.array(),
      })
    }

    const { email, password, nombre, apellido } = req.body

    // Verificar si el usuario ya existe
    const usuarioExistente = await req.services.prisma.usuario.findUnique({
      where: { email },
    })

    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: "El usuario ya existe",
      })
    }

    // Hashear contraseña
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Crear usuario
    const usuario = await req.services.prisma.usuario.create({
      data: {
        email,
        passwordHash,
        nombre,
        apellido,
        configuraciones: {
          create: {
            notificaciones: true,
            canalesNotificacion: {
              email: true,
              push: false,
              sms: false,
            },
            limiteAlertas: 10,
          },
        },
      },
      include: {
        configuraciones: true,
      },
    })

    // Generar token JWT
    const token = jwt.sign(
      {
        userId: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      },
      process.env.NEXTAUTH_SECRET || "optifactura-secret-key",
      { expiresIn: "24h" },
    )

    // Enviar email de bienvenida
    try {
      await req.services.email.enviarEmailBienvenida(email, nombre)
    } catch (error) {
      console.error("Error al enviar email de bienvenida:", error.message)
    }

    res.status(201).json({
      success: true,
      message: "Usuario registrado correctamente",
      data: {
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          rol: usuario.rol,
        },
        token,
      },
    })
  } catch (error) {
    console.error("Error en registro:", error.message)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Login de usuario
router.post("/login", validarLogin, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Errores de validación",
        errors: errors.array(),
      })
    }

    const { email, password } = req.body

    // Buscar usuario
    const usuario = await req.services.prisma.usuario.findUnique({
      where: { email },
      include: {
        configuraciones: true,
      },
    })

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      })
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.passwordHash)
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      })
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        userId: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      },
      process.env.NEXTAUTH_SECRET || "optifactura-secret-key",
      { expiresIn: "24h" },
    )

    // Actualizar última conexión
    await req.services.prisma.usuario.update({
      where: { id: usuario.id },
      data: { updatedAt: new Date() },
    })

    res.json({
      success: true,
      message: "Login exitoso",
      data: {
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          rol: usuario.rol,
        },
        token,
      },
    })
  } catch (error) {
    console.error("Error en login:", error.message)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Verificar token
router.get("/verificar", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token no proporcionado",
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
        createdAt: true,
      },
    })

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    res.json({
      success: true,
      data: { usuario },
    })
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token inválido o expirado",
      })
    }

    console.error("Error en verificación:", error.message)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Logout
router.post("/logout", (req, res) => {
  // En una implementación con sesiones, aquí se destruiría la sesión
  res.json({
    success: true,
    message: "Logout exitoso",
  })
})

// Cambiar contraseña
router.post("/cambiar-password", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token no proporcionado",
      })
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || "optifactura-secret-key")
    const { passwordActual, passwordNueva } = req.body

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({
        success: false,
        message: "Contraseña actual y nueva son requeridas",
      })
    }

    if (passwordNueva.length < 6) {
      return res.status(400).json({
        success: false,
        message: "La nueva contraseña debe tener al menos 6 caracteres",
      })
    }

    const usuario = await req.services.prisma.usuario.findUnique({
      where: { id: decoded.userId },
    })

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    // Verificar contraseña actual
    const passwordValida = await bcrypt.compare(passwordActual, usuario.passwordHash)
    if (!passwordValida) {
      return res.status(400).json({
        success: false,
        message: "Contraseña actual incorrecta",
      })
    }

    // Hashear nueva contraseña
    const saltRounds = 12
    const nuevoPasswordHash = await bcrypt.hash(passwordNueva, saltRounds)

    // Actualizar contraseña
    await req.services.prisma.usuario.update({
      where: { id: decoded.userId },
      data: { passwordHash: nuevoPasswordHash },
    })

    res.json({
      success: true,
      message: "Contraseña actualizada correctamente",
    })
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token inválido o expirado",
      })
    }

    console.error("Error al cambiar contraseña:", error.message)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

module.exports = router
