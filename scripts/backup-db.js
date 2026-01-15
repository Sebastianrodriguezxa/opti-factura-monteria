const { exec } = require("child_process")
const fs = require("fs").promises
const path = require("path")

async function crearBackup() {
  try {
    console.log("🗄️ Iniciando backup de base de datos...")

    const fecha = new Date().toISOString().split("T")[0]
    const hora = new Date().toTimeString().split(" ")[0].replace(/:/g, "-")
    const nombreBackup = `backup_${fecha}_${hora}.sql`
    const rutaBackup = path.join(__dirname, "..", "backups", nombreBackup)

    // Crear directorio de backups si no existe
    await fs.mkdir(path.dirname(rutaBackup), { recursive: true })

    // Obtener configuración de base de datos
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error("DATABASE_URL no está configurada")
    }

    // Parsear URL de base de datos
    const url = new URL(databaseUrl)
    const host = url.hostname
    const port = url.port || 3306
    const database = url.pathname.slice(1)
    const username = url.username
    const password = url.password

    // Comando mysqldump
    const comando = `mysqldump -h ${host} -P ${port} -u ${username} -p${password} ${database} > ${rutaBackup}`

    // Ejecutar backup
    await new Promise((resolve, reject) => {
      exec(comando, (error, stdout, stderr) => {
        if (error) {
          reject(error)
        } else {
          resolve(stdout)
        }
      })
    })

    // Verificar que el archivo se creó
    const stats = await fs.stat(rutaBackup)
    console.log(`✅ Backup creado exitosamente: ${nombreBackup}`)
    console.log(`📁 Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)
    console.log(`📍 Ubicación: ${rutaBackup}`)

    // Limpiar backups antiguos (mantener solo los últimos 7)
    await limpiarBackupsAntiguos()

    return rutaBackup
  } catch (error) {
    console.error("❌ Error creando backup:", error)
    throw error
  }
}

async function limpiarBackupsAntiguos() {
  try {
    const dirBackups = path.join(__dirname, "..", "backups")
    const archivos = await fs.readdir(dirBackups)

    const backups = archivos
      .filter((archivo) => archivo.startsWith("backup_") && archivo.endsWith(".sql"))
      .map((archivo) => ({
        nombre: archivo,
        ruta: path.join(dirBackups, archivo),
        fecha: fs.stat(path.join(dirBackups, archivo)).then((stats) => stats.mtime),
      }))

    // Resolver todas las promesas de fecha
    for (const backup of backups) {
      backup.fecha = await backup.fecha
    }

    // Ordenar por fecha (más reciente primero)
    backups.sort((a, b) => b.fecha - a.fecha)

    // Eliminar backups antiguos (mantener solo los últimos 7)
    if (backups.length > 7) {
      const backupsAEliminar = backups.slice(7)

      for (const backup of backupsAEliminar) {
        await fs.unlink(backup.ruta)
        console.log(`🗑️ Backup antiguo eliminado: ${backup.nombre}`)
      }
    }
  } catch (error) {
    console.error("⚠️ Error limpiando backups antiguos:", error)
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  crearBackup()
    .then(() => {
      console.log("🎉 Proceso de backup completado")
      process.exit(0)
    })
    .catch((error) => {
      console.error("💥 Error en proceso de backup:", error)
      process.exit(1)
    })
}

module.exports = { crearBackup, limpiarBackupsAntiguos }
