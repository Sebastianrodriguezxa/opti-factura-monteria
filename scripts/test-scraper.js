const TarifasScraper = require("../lib/tarifas-scraper")

async function probarScraper() {
  console.log("🧪 Iniciando prueba del scraper...")

  const scraper = new TarifasScraper({
    headless: false, // Para ver el navegador
    logLevel: "info",
  })

  try {
    await scraper.inicializar()
    console.log("✅ Scraper inicializado")

    // Probar Afinia
    console.log("\n📊 Probando extracción de Afinia...")
    const tarifasAfinia = await scraper.extraerTarifasAfinia()
    console.log("Tarifas Afinia:", JSON.stringify(tarifasAfinia, null, 2))

    // Probar Veolia
    console.log("\n💧 Probando extracción de Veolia...")
    const tarifasVeolia = await scraper.extraerTarifasVeolia()
    console.log("Tarifas Veolia:", JSON.stringify(tarifasVeolia, null, 2))

    // Probar Surtigas
    console.log("\n🔥 Probando extracción de Surtigas...")
    const tarifasSurtigas = await scraper.extraerTarifasSurtigas()
    console.log("Tarifas Surtigas:", JSON.stringify(tarifasSurtigas, null, 2))
  } catch (error) {
    console.error("❌ Error en la prueba:", error)
  } finally {
    await scraper.cerrar()
    console.log("🔚 Prueba completada")
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  probarScraper()
}

module.exports = probarScraper
