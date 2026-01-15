const { body, validationResult } = require("express-validator")

/**
 * Validador para registro de usuario
 */
const validarRegistro = [
  body("nombre").trim().isLength({ min: 2, max: 100 }).withMessage("El nombre debe tener entre 2 y 100 caracteres"),

  body("email").isEmail().normalizeEmail().withMessage("Email inválido"),

  body("password").isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),

  body("telefono").optional().isMobilePhone("es-CO").withMessage("Teléfono inválido"),

  body("direccion")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("La dirección no puede exceder 200 caracteres"),
]

/**
 * Validador para login
 */
const validarLogin = [
  body("email").isEmail().normalizeEmail().withMessage("Email inválido"),

  body("password").notEmpty().withMessage("Contraseña requerida"),
]

/**
 * Validador para análisis de factura
 */
const validarAnalisisFactura = [
  body("proveedor").isIn(["AFINIA", "VEOLIA", "SURTIGAS"]).withMessage("Proveedor inválido"),

  body("estrato").isInt({ min: 1, max: 6 }).withMessage("Estrato debe ser entre 1 y 6"),

  body("tipoServicio").isIn(["ENERGIA", "AGUA", "GAS"]).withMessage("Tipo de servicio inválido"),
]

/**
 * Validador para actualización de perfil
 */
const validarActualizacionPerfil = [
  body("nombre")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("El nombre debe tener entre 2 y 100 caracteres"),

  body("telefono").optional().isMobilePhone("es-CO").withMessage("Teléfono inválido"),

  body("direccion")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("La dirección no puede exceder 200 caracteres"),
]

/**
 * Middleware para manejar errores de validación
 */
const manejarErroresValidacion = (req, res, next) => {
  const errores = validationResult(req)

  if (!errores.isEmpty()) {
    return res.status(400).json({
      error: "Datos inválidos",
      detalles: errores.array(),
    })
  }

  next()
}

module.exports = {
  validarRegistro,
  validarLogin,
  validarAnalisisFactura,
  validarActualizacionPerfil,
  manejarErroresValidacion,
}
