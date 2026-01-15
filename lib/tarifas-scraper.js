const puppeteer = require("puppeteer")
const fs = require("fs").promises
const path = require("path")

class TarifasScraper {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false,
      outputDir: options.outputDir || "./datos_tarifas",
      timeout: options.timeout || 30000,
      logLevel: options.logLevel || "info",
      ...options,
    }

    this.browser = null
    this.page = null
  }

  /**
   * Inicializa el scraper
   */
  async inicializar() {
    try {
      console.log("Inicializando scraper...")

      this.browser = await puppeteer.launch({
        headless: this.options.headless ? "new" : false,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      })

      this.page = await this.browser.newPage()
      await this.page.setViewport({ width: 1366, height: 768 })
      await this.page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      )

      // Crear directorio de salida si no existe
      await fs.mkdir(this.options.outputDir, { recursive: true })

      console.log("Scraper inicializado correctamente")
    } catch (error) {
      console.error(`Error al inicializar scraper: ${error.message}`)

      if (this.browser) {
        await this.browser.close()
        this.browser = null
      }

      throw error
    }
  }

  /**
   * Extrae tarifas de Afinia usando script de Python
   * @returns {Promise<Object>} Tarifas extraídas
   */
  async extraerTarifasAfinia() {
    try {
      console.log("Extrayendo tarifas de Afinia usando Python...")

      const { spawn } = require("child_process")
      const scriptPath = path.join(__dirname, "..", "scripts", "scrape_afinia.py")

      return new Promise((resolve, reject) => {
        const python = spawn("python", [scriptPath])
        let stdout = ""
        let stderr = ""

        python.stdout.on("data", (data) => {
          stdout += data.toString()
        })

        python.stderr.on("data", (data) => {
          stderr += data.toString()
        })

        python.on("close", async (code) => {
          if (code !== 0) {
            console.error(`Script de Python falló con código ${code}`)
            console.error(`Error: ${stderr}`)
            reject(new Error(`Script de Python falló: ${stderr}`))
            return
          }

          try {
            const resultado = JSON.parse(stdout)

            // Guardar resultado
            await fs.writeFile(
              path.join(this.options.outputDir, "afinia_tarifas_actual.json"),
              JSON.stringify(resultado, null, 2),
            )

            console.log(`Tarifas de Afinia extraídas correctamente: ${resultado.tarifas.length} tarifas`)
            resolve(resultado)
          } catch (error) {
            console.error(`Error al parsear resultado de Python: ${error.message}`)
            reject(error)
          }
        })
      })
    } catch (error) {
      console.error(`Error al extraer tarifas de Afinia: ${error.message}`)
      throw error
    }
  }

  /**
   * Extrae tarifas de Veolia usando script de Python
   * @returns {Promise<Object>} Tarifas extraídas
   */
  async extraerTarifasVeolia() {
    try {
      console.log("Extrayendo tarifas de Veolia usando Python...")

      const { spawn } = require("child_process")
      const scriptPath = path.join(__dirname, "..", "scripts", "scrape_veolia.py")

      return new Promise((resolve, reject) => {
        const python = spawn("python", [scriptPath])
        let stdout = ""
        let stderr = ""

        python.stdout.on("data", (data) => {
          stdout += data.toString()
        })

        python.stderr.on("data", (data) => {
          stderr += data.toString()
        })

        python.on("close", async (code) => {
          if (code !== 0) {
            console.error(`Script de Python falló con código ${code}`)
            console.error(`Error: ${stderr}`)
            reject(new Error(`Script de Python falló: ${stderr}`))
            return
          }

          try {
            const resultado = JSON.parse(stdout)

            // Guardar resultado
            await fs.writeFile(
              path.join(this.options.outputDir, "veolia_tarifas_actual.json"),
              JSON.stringify(resultado, null, 2),
            )

            console.log(`Tarifas de Veolia extraídas correctamente: ${resultado.tarifas.length} tarifas`)
            resolve(resultado)
          } catch (error) {
            console.error(`Error al parsear resultado de Python: ${error.message}`)
            reject(error)
          }
        })
      })
    } catch (error) {
      console.error(`Error al extraer tarifas de Veolia: ${error.message}`)
      throw error
    }
  }

  /**
   * Extrae tarifas de Surtigas usando script de Python
   * @returns {Promise<Object>} Tarifas extraídas
   */
  async extraerTarifasSurtigas() {
    try {
      console.log("Extrayendo tarifas de Surtigas usando Python...")

      const { spawn } = require("child_process")
      const scriptPath = path.join(__dirname, "..", "scripts", "scrape_surtigas.py")

      return new Promise((resolve, reject) => {
        const python = spawn("python", [scriptPath])
        let stdout = ""
        let stderr = ""

        python.stdout.on("data", (data) => {
          stdout += data.toString()
        })

        python.stderr.on("data", (data) => {
          stderr += data.toString()
        })

        python.on("close", async (code) => {
          if (code !== 0) {
            console.error(`Script de Python falló con código ${code}`)
            console.error(`Error: ${stderr}`)
            reject(new Error(`Script de Python falló: ${stderr}`))
            return
          }

          try {
            const resultado = JSON.parse(stdout)

            // Guardar resultado
            await fs.writeFile(
              path.join(this.options.outputDir, "surtigas_tarifas_actual.json"),
              JSON.stringify(resultado, null, 2),
            )

            console.log(`Tarifas de Surtigas extraídas correctamente: ${resultado.tarifas.length} tarifas`)
            resolve(resultado)
          } catch (error) {
            console.error(`Error al parsear resultado de Python: ${error.message}`)
            reject(error)
          }
        })
      })
    } catch (error) {
      console.error(`Error al extraer tarifas de Surtigas: ${error.message}`)
      throw error
    }
  }

  /**
   * Obtiene todas las tarifas
   * @returns {Promise<Object>} Todas las tarifas
   */
  async obtenerTodasLasTarifas() {
    try {
      console.log("Obteniendo todas las tarifas...")

      const resultado = {
        fechaExtraccion: new Date().toISOString(),
        resultados: {},
      }

      // Extraer tarifas de Afinia
      try {
        const tarifasAfinia = await this.extraerTarifasAfinia()
        resultado.resultados.afinia = tarifasAfinia
      } catch (error) {
        console.error(`Error al extraer tarifas de Afinia: ${error.message}`)
        resultado.resultados.afinia = { error: error.message }
      }

      // Extraer tarifas de Veolia
      try {
        const tarifasVeolia = await this.extraerTarifasVeolia()
        resultado.resultados.veolia = tarifasVeolia
      } catch (error) {
        console.error(`Error al extraer tarifas de Veolia: ${error.message}`)
        resultado.resultados.veolia = { error: error.message }
      }

      // Extraer tarifas de Surtigas
      try {
        const tarifasSurtigas = await this.extraerTarifasSurtigas()
        resultado.resultados.surtigas = tarifasSurtigas
      } catch (error) {
        console.error(`Error al extraer tarifas de Surtigas: ${error.message}`)
        resultado.resultados.surtigas = { error: error.message }
      }

      return resultado
    } catch (error) {
      console.error(`Error al obtener todas las tarifas: ${error.message}`)
      throw error
    }
  }

  /**
   * Cierra el scraper
   */
  async cerrar() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      console.log("Scraper cerrado correctamente")
    }
  }
}

module.exports = TarifasScraper
