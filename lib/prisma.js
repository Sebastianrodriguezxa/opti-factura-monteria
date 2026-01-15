const { PrismaClient } = require("@prisma/client")

let prisma = null

// Función para obtener instancia de Prisma (lazy loading)
function getPrisma() {
  if (!prisma) {
    if (process.env.NODE_ENV === "production") {
      prisma = new PrismaClient({
        log: ["error"],
      })
    } else {
      // En desarrollo, usar singleton global
      if (!global.prismaClient) {
        global.prismaClient = new PrismaClient({
          log: ["query", "warn", "error"],
        })
      }
      prisma = global.prismaClient
    }
  }
  return prisma
}

// Exportar solo la función, no la instancia directa
module.exports = {
  getPrisma,
  // Para backward compatibility
  get prisma() {
    return getPrisma()
  },
}
