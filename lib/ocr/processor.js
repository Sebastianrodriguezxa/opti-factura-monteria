/**
 * Procesador OCR - OptiFactura Montería
 * Procesa imágenes y PDFs para extraer texto y datos estructurados
 */
const { createWorker } = require("tesseract.js")
const pdf = require("pdf-parse")
const fs = require("fs").promises
const path = require("path")

/**
 * Procesa un archivo con OCR
 * @param {string} filePath Ruta del archivo
 * @param {string} fileType Tipo de archivo
 * @returns {Promise<string>} Texto extraído
 */
async function processFileWithOCR(filePath, fileType) {
  try {
    console.log(`Procesando archivo: ${filePath} (${fileType})`)

    let text = ""

    if (fileType === "application/pdf") {
      // Procesar PDF
      const dataBuffer = await fs.readFile(filePath)
      const data = await pdf(dataBuffer)
      text = data.text

      // Si el PDF no tiene texto extraíble, intentar OCR
      if (!text || text.trim().length < 100) {
        console.log("PDF sin texto extraíble, aplicando OCR...")
        text = await processImageWithOCR(filePath)
      }
    } else {
      // Procesar imagen
      text = await processImageWithOCR(filePath)
    }

    return text
  } catch (error) {
    console.error(`Error al procesar archivo con OCR: ${error.message}`)
    throw error
  }
}

/**
 * Procesa una imagen con OCR
 * @param {string} imagePath Ruta de la imagen
 * @returns {Promise<string>} Texto extraído
 */
async function processImageWithOCR(imagePath) {
  try {
    console.log(`Aplicando OCR a imagen: ${imagePath}`)

    const worker = await createWorker("spa")

    await worker.setParameters({
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:$%#@!&*()[]{}|<>?+-=/ ",
      tessedit_pageseg_mode: "1",
      preserve_interword_spaces: "1",
    })

    const {
      data: { text },
    } = await worker.recognize(imagePath)

    await worker.terminate()

    return text
  } catch (error) {
    console.error(`Error al procesar imagen con OCR: ${error.message}`)
    throw error
  }
}

/**
 * Extrae datos estructurados del texto OCR
 * @param {string} ocrText Texto OCR
 * @param {string} serviceType Tipo de servicio
 * @param {string} userId ID del usuario
 * @returns {Promise<Object>} Datos estructurados
 */
async function extractStructuredData(ocrText, serviceType, userId) {
  try {
    console.log(`Extrayendo datos estructurados para servicio: ${serviceType}`)

    // Normalizar texto
    const normalizedText = ocrText.replace(/\n+/g, " ").replace(/\s+/g, " ").trim()

    // Datos a extraer
    const extractedData = {
      provider: {
        name: "",
        id: "",
      },
      billNumber: "",
      billDate: null,
      dueDate: null,
      clientName: "",
      clientId: "",
      address: "",
      consumption: 0,
      consumptionUnit: "",
      unitPrice: 0,
      totalAmount: 0,
      tariffType: "",
      period: {
        from: null,
        to: null,
      },
    }

    // Detectar proveedor
    if (normalizedText.match(/afinia|air-e/i)) {
      extractedData.provider.name = "Afinia"
      extractedData.consumptionUnit = "kWh"
    } else if (normalizedText.match(/veolia|aguas/i)) {
      extractedData.provider.name = "Veolia"
      extractedData.consumptionUnit = "m³"
    } else if (normalizedText.match(/surtigas|gas/i)) {
      extractedData.provider.name = "Surtigas"
      extractedData.consumptionUnit = "m³"
    }

    // Extraer número de factura
    const billNumberMatch =
      normalizedText.match(/factura[:\s]*([A-Za-z0-9-]+)/i) || normalizedText.match(/no\.?[:\s]*([A-Za-z0-9-]+)/i)

    if (billNumberMatch) {
      extractedData.billNumber = billNumberMatch[1].trim()
    }

    // Extraer fecha de factura
    const billDateMatch =
      normalizedText.match(/fecha[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i) ||
      normalizedText.match(/emisi[oó]n[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i)

    if (billDateMatch) {
      extractedData.billDate = parseDate(billDateMatch[1])
    }

    // Extraer fecha de vencimiento
    const dueDateMatch =
      normalizedText.match(/vencimiento[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i) ||
      normalizedText.match(/pagar antes de[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i)

    if (dueDateMatch) {
      extractedData.dueDate = parseDate(dueDateMatch[1])
    }

    // Extraer nombre del cliente
    const clientNameMatch =
      normalizedText.match(/cliente[:\s]*([A-Za-z\s]+)/i) || normalizedText.match(/nombre[:\s]*([A-Za-z\s]+)/i)

    if (clientNameMatch) {
      extractedData.clientName = clientNameMatch[1].trim()
    }

    // Extraer ID del cliente
    const clientIdMatch =
      normalizedText.match(/id cliente[:\s]*([A-Za-z0-9-]+)/i) ||
      normalizedText.match(/c[oó]digo[:\s]*([A-Za-z0-9-]+)/i)

    if (clientIdMatch) {
      extractedData.clientId = clientIdMatch[1].trim()
    }

    // Extraer dirección
    const addressMatch = normalizedText.match(/direcci[oó]n[:\s]*([A-Za-z0-9\s.,#-]+)/i)

    if (addressMatch) {
      extractedData.address = addressMatch[1].trim()
    }

    // Extraer consumo
    let consumptionMatch

    if (serviceType === "electricity") {
      consumptionMatch =
        normalizedText.match(/consumo[:\s]*(\d+(?:[.,]\d+)?)\s*kWh/i) ||
        normalizedText.match(/(\d+(?:[.,]\d+)?)\s*kWh/i)
    } else if (serviceType === "water") {
      consumptionMatch =
        normalizedText.match(/consumo[:\s]*(\d+(?:[.,]\d+)?)\s*m3/i) || normalizedText.match(/(\d+(?:[.,]\d+)?)\s*m3/i)
    } else if (serviceType === "gas") {
      consumptionMatch =
        normalizedText.match(/consumo[:\s]*(\d+(?:[.,]\d+)?)\s*m3/i) || normalizedText.match(/(\d+(?:[.,]\d+)?)\s*m3/i)
    }

    if (consumptionMatch) {
      extractedData.consumption = Number.parseFloat(consumptionMatch[1].replace(",", "."))
    }

    // Extraer precio unitario
    const unitPriceMatch =
      normalizedText.match(/valor unitario[:\s]*\$?\s*(\d+(?:[.,]\d+)?)/i) ||
      normalizedText.match(/tarifa[:\s]*\$?\s*(\d+(?:[.,]\d+)?)/i)

    if (unitPriceMatch) {
      extractedData.unitPrice = Number.parseFloat(unitPriceMatch[1].replace(",", "."))
    }

    // Extraer monto total
    const totalAmountMatch =
      normalizedText.match(/total a pagar[:\s]*\$?\s*(\d+(?:[.,]\d+)?)/i) ||
      normalizedText.match(/valor a pagar[:\s]*\$?\s*(\d+(?:[.,]\d+)?)/i)

    if (totalAmountMatch) {
      extractedData.totalAmount = Number.parseFloat(totalAmountMatch[1].replace(",", "."))
    }

    // Extraer tipo de tarifa
    const tariffTypeMatch =
      normalizedText.match(/estrato[:\s]*(\d+)/i) || normalizedText.match(/tipo de usuario[:\s]*([A-Za-z]+)/i)

    if (tariffTypeMatch) {
      if (tariffTypeMatch[0].toLowerCase().includes("estrato")) {
        extractedData.tariffType = `Estrato ${tariffTypeMatch[1]}`
      } else {
        extractedData.tariffType = tariffTypeMatch[1].trim()
      }
    }

    // Extraer período de facturación
    const periodMatch = normalizedText.match(
      /per[ií]odo[:\s]*del\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*al\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    )

    if (periodMatch) {
      extractedData.period.from = parseDate(periodMatch[1])
      extractedData.period.to = parseDate(periodMatch[2])
    }

    return extractedData
  } catch (error) {
    console.error(`Error al extraer datos estructurados: ${error.message}`)
    throw error
  }
}

/**
 * Parsea una fecha en formato DD/MM/YYYY
 * @param {string} dateStr Fecha en formato string
 * @returns {Date} Fecha parseada
 */
function parseDate(dateStr) {
  try {
    const parts = dateStr.split("/")

    if (parts.length !== 3) {
      return null
    }

    const day = Number.parseInt(parts[0], 10)
    const month = Number.parseInt(parts[1], 10) - 1 // Meses en JS son 0-11
    let year = Number.parseInt(parts[2], 10)

    // Ajustar año si es de 2 dígitos
    if (year < 100) {
      year += 2000
    }

    return new Date(year, month, day)
  } catch (error) {
    console.error(`Error al parsear fecha: ${error.message}`)
    return null
  }
}

module.exports = {
  processFileWithOCR,
  extractStructuredData,
}
