const crypto = require("crypto")
const fs = require("fs").promises
const path = require("path")

/**
 * Genera un hash seguro
 */
function generarHash(data) {
  return crypto.createHash("sha256").update(data).digest("hex")
}

/**
 * Genera un token aleatorio
 */
function generarToken(length = 32) {
  return crypto.randomBytes(length).toString("hex")
}

/**
 * Formatea números como moneda colombiana
 */
function formatearMoneda(valor) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(valor)
}

/**
 * Formatea fechas en español
 */
function formatearFecha(fecha) {
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fecha))
}

/**
 * Valida formato de email
 */
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Sanitiza nombre de archivo
 */
function sanitizarNombreArchivo(nombre) {
  return nombre
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/_{2,}/g, "_")
    .toLowerCase()
}

/**
 * Crea directorio si no existe
 */
async function crearDirectorio(ruta) {
  try {
    await fs.mkdir(ruta, { recursive: true })
    return true
  } catch (error) {
    console.error(`Error creando directorio ${ruta}:`, error)
    return false
  }
}

/**
 * Elimina archivo de forma segura
 */
async function eliminarArchivo(ruta) {
  try {
    await fs.unlink(ruta)
    return true
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`Error eliminando archivo ${ruta}:`, error)
    }
    return false
  }
}

/**
 * Lee archivo JSON de forma segura
 */
async function leerJSON(ruta) {
  try {
    const contenido = await fs.readFile(ruta, "utf8")
    return JSON.parse(contenido)
  } catch (error) {
    console.error(`Error leyendo JSON ${ruta}:`, error)
    return null
  }
}

/**
 * Escribe archivo JSON de forma segura
 */
async function escribirJSON(ruta, datos) {
  try {
    await fs.writeFile(ruta, JSON.stringify(datos, null, 2))
    return true
  } catch (error) {
    console.error(`Error escribiendo JSON ${ruta}:`, error)
    return false
  }
}

/**
 * Calcula el porcentaje de diferencia entre dos valores
 */
function calcularPorcentajeDiferencia(valor1, valor2) {
  if (valor2 === 0) return 0
  return ((valor1 - valor2) / valor2) * 100
}

/**
 * Redondea a 2 decimales
 */
function redondear(numero) {
  return Math.round(numero * 100) / 100
}

/**
 * Convierte bytes a formato legible
 */
function formatearTamano(bytes) {
  const sizes = ["Bytes", "KB", "MB", "GB"]
  if (bytes === 0) return "0 Bytes"
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
}

/**
 * Pausa la ejecución por un tiempo determinado
 */
function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Obtiene la extensión de un archivo
 */
function obtenerExtension(nombreArchivo) {
  return path.extname(nombreArchivo).toLowerCase()
}

/**
 * Valida si un archivo es una imagen
 */
function esImagen(nombreArchivo) {
  const extensionesImagen = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"]
  return extensionesImagen.includes(obtenerExtension(nombreArchivo))
}

/**
 * Valida si un archivo es un PDF
 */
function esPDF(nombreArchivo) {
  return obtenerExtension(nombreArchivo) === ".pdf"
}

module.exports = {
  generarHash,
  generarToken,
  formatearMoneda,
  formatearFecha,
  validarEmail,
  sanitizarNombreArchivo,
  crearDirectorio,
  eliminarArchivo,
  leerJSON,
  escribirJSON,
  calcularPorcentajeDiferencia,
  redondear,
  formatearTamano,
  esperar,
  obtenerExtension,
  esImagen,
  esPDF,
}
