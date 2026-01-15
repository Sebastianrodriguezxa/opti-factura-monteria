const jwt = require("jsonwebtoken")
const prisma = require("../lib/prisma")

/**
 * Middleware para verificar JWT
 */
const verificarToken = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "") || req.session?.token || req.cookies?.token

    if (!token) {
      return res.status(401).json({
        error: "Token de acceso requerido",
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Verificar que el usuario existe
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
      },
    })

    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        error: "Usuario no válido o inactivo",
      })
    }

    req.usuario = usuario
    next()
  } catch (error) {
    console.error("Error en verificación de token:", error)
    return res.status(401).json({
      error: "Token inválido",
    })
  }
}

/**
 * Middleware para verificar rol de administrador
 */
const verificarAdmin = (req, res, next) => {
  if (req.usuario?.rol !== "ADMIN") {
    return res.status(403).json({
      error: "Acceso denegado. Se requieren permisos de administrador",
    })
  }
  next()
}

/**
 * Middleware para verificar sesión web
 */
const verificarSesion = (req, res, next) => {
  if (!req.session?.usuario) {
    return res.redirect("/login.html")
  }
  next()
}

module.exports = {
  verificarToken,
  verificarAdmin,
  verificarSesion,
}
