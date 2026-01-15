const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Iniciando seed de la base de datos...")

  try {
    // Crear usuario administrador
    const adminPassword = await bcrypt.hash("admin123", 12)
    const admin = await prisma.usuario.upsert({
      where: { email: "admin@optifactura.co" },
      update: {},
      create: {
        email: "admin@optifactura.co",
        nombre: "Administrador",
        apellido: "Sistema",
        passwordHash: adminPassword,
        rol: "admin",
        configuraciones: {
          create: {
            notificaciones: true,
            canalesNotificacion: {
              email: true,
              push: false,
              sms: false,
            },
            limiteAlertas: 5,
          },
        },
      },
    })

    console.log("✅ Usuario administrador creado:", admin.email)

    // Crear usuario de prueba
    const testPassword = await bcrypt.hash("test123", 12)
    const testUser = await prisma.usuario.upsert({
      where: { email: "test@optifactura.co" },
      update: {},
      create: {
        email: "test@optifactura.co",
        nombre: "Usuario",
        apellido: "Prueba",
        passwordHash: testPassword,
        rol: "usuario",
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
    })

    console.log("✅ Usuario de prueba creado:", testUser.email)

    // Crear datos de ejemplo de tarifas
    const fechaActual = new Date()

    // Actualización de tarifas de Afinia
    const actualizacionAfinia = await prisma.actualizacionTarifas.create({
      data: {
        proveedor: "Afinia",
        servicio: "electricidad",
        fechaActualizacion: fechaActual,
        url: "https://www.afinia.com.co/hogar/tarifas",
        metadatos: JSON.stringify({
          fechaExtraccion: fechaActual,
          version: "1.0",
        }),
      },
    })

    // Tarifas de electricidad por estrato
    const tarifasElectricidad = [
      { estrato: "1", cargoFijo: 8500, valorConsumo: 450 },
      { estrato: "2", cargoFijo: 8500, valorConsumo: 520 },
      { estrato: "3", cargoFijo: 8500, valorConsumo: 580 },
      { estrato: "4", cargoFijo: 8500, valorConsumo: 650 },
      { estrato: "5", cargoFijo: 8500, valorConsumo: 720 },
      { estrato: "6", cargoFijo: 8500, valorConsumo: 780 },
    ]

    for (const tarifa of tarifasElectricidad) {
      await prisma.tarifaReferencia.create({
        data: {
          actualizacionId: actualizacionAfinia.id,
          proveedor: "Afinia",
          servicio: "electricidad",
          estrato: tarifa.estrato,
          cargoFijo: tarifa.cargoFijo,
          valorConsumo: tarifa.valorConsumo,
          unidad: "kWh",
          fechaInicio: fechaActual,
          region: "Montería",
        },
      })
    }

    // Subsidios para estratos 1, 2 y 3
    const subsidiosElectricidad = [
      { estrato: "1", porcentaje: -20 },
      { estrato: "2", porcentaje: -15 },
      { estrato: "3", porcentaje: -10 },
    ]

    for (const subsidio of subsidiosElectricidad) {
      await prisma.subsidioTarifa.create({
        data: {
          actualizacionId: actualizacionAfinia.id,
          proveedor: "Afinia",
          servicio: "electricidad",
          estrato: subsidio.estrato,
          porcentaje: subsidio.porcentaje,
          fechaInicio: fechaActual,
          region: "Montería",
        },
      })
    }

    console.log("✅ Tarifas de electricidad creadas")

    // Actualización de tarifas de Veolia (Agua)
    const actualizacionVeolia = await prisma.actualizacionTarifas.create({
      data: {
        proveedor: "Veolia",
        servicio: "agua",
        fechaActualizacion: fechaActual,
        url: "https://www.veolia.com.co/monteria/servicio-al-cliente/tarifas",
        metadatos: JSON.stringify({
          fechaExtraccion: fechaActual,
          version: "1.0",
        }),
      },
    })

    // Tarifas de agua por estrato
    const tarifasAgua = [
      { estrato: "1", cargoFijo: 12500, valorConsumo: 2800 },
      { estrato: "2", cargoFijo: 12500, valorConsumo: 3200 },
      { estrato: "3", cargoFijo: 12500, valorConsumo: 3600 },
      { estrato: "4", cargoFijo: 12500, valorConsumo: 4200 },
      { estrato: "5", cargoFijo: 12500, valorConsumo: 4800 },
      { estrato: "6", cargoFijo: 12500, valorConsumo: 5200 },
    ]

    for (const tarifa of tarifasAgua) {
      await prisma.tarifaReferencia.create({
        data: {
          actualizacionId: actualizacionVeolia.id,
          proveedor: "Veolia",
          servicio: "agua",
          estrato: tarifa.estrato,
          cargoFijo: tarifa.cargoFijo,
          valorConsumo: tarifa.valorConsumo,
          unidad: "m³",
          fechaInicio: fechaActual,
          region: "Montería",
        },
      })
    }

    console.log("✅ Tarifas de agua creadas")

    // Actualización de tarifas de Surtigas (Gas)
    const actualizacionSurtigas = await prisma.actualizacionTarifas.create({
      data: {
        proveedor: "Surtigas",
        servicio: "gas",
        fechaActualizacion: fechaActual,
        url: "https://www.surtigas.com.co/tarifas",
        metadatos: JSON.stringify({
          fechaExtraccion: fechaActual,
          version: "1.0",
        }),
      },
    })

    // Tarifas de gas por estrato
    const tarifasGas = [
      { estrato: "1", cargoFijo: 8200, valorConsumo: 1850 },
      { estrato: "2", cargoFijo: 8200, valorConsumo: 2100 },
      { estrato: "3", cargoFijo: 8200, valorConsumo: 2350 },
      { estrato: "4", cargoFijo: 8200, valorConsumo: 2650 },
      { estrato: "5", cargoFijo: 8200, valorConsumo: 2950 },
      { estrato: "6", cargoFijo: 8200, valorConsumo: 3200 },
    ]

    for (const tarifa of tarifasGas) {
      await prisma.tarifaReferencia.create({
        data: {
          actualizacionId: actualizacionSurtigas.id,
          proveedor: "Surtigas",
          servicio: "gas",
          estrato: tarifa.estrato,
          cargoFijo: tarifa.cargoFijo,
          valorConsumo: tarifa.valorConsumo,
          unidad: "m³",
          fechaInicio: fechaActual,
          region: "Montería",
        },
      })
    }

    console.log("✅ Tarifas de gas creadas")

    // Crear algunos análisis de ejemplo para el usuario de prueba
    const fechasMeses = []
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date()
      fecha.setMonth(fecha.getMonth() - i)
      fechasMeses.push(fecha)
    }

    for (let i = 0; i < fechasMeses.length; i++) {
      const fecha = fechasMeses[i]

      // Análisis de electricidad
      await prisma.analisisFactura.create({
        data: {
          userId: testUser.id,
          proveedor: "Afinia",
          numeroFactura: `AF${String(202401 + i).padStart(8, "0")}`,
          fechaFactura: fecha,
          fechaVencimiento: new Date(fecha.getTime() + 30 * 24 * 60 * 60 * 1000),
          consumo: 180 + Math.floor(Math.random() * 100),
          unidadConsumo: "kWh",
          valorUnitario: 520 + Math.floor(Math.random() * 50),
          valorTotal: 95000 + Math.floor(Math.random() * 30000),
          tarifaReferencia: 520,
          diferenciaTarifa: Math.floor(Math.random() * 20) - 10,
          porcentajeDiferencia: Math.random() * 10 - 5,
          anomalias:
            i % 3 === 0
              ? JSON.stringify([
                  {
                    type: "high_consumption",
                    severity: "medium",
                    description: "El consumo es 15% mayor que el promedio histórico",
                  },
                ])
              : "[]",
          recomendaciones: JSON.stringify([
            {
              type: "energy_saving",
              description: "Considera usar electrodomésticos eficientes",
            },
          ]),
        },
      })

      // Análisis de agua
      if (i % 2 === 0) {
        await prisma.analisisFactura.create({
          data: {
            userId: testUser.id,
            proveedor: "Veolia",
            numeroFactura: `VE${String(202401 + i).padStart(8, "0")}`,
            fechaFactura: fecha,
            fechaVencimiento: new Date(fecha.getTime() + 30 * 24 * 60 * 60 * 1000),
            consumo: 15 + Math.floor(Math.random() * 10),
            unidadConsumo: "m³",
            valorUnitario: 3200 + Math.floor(Math.random() * 200),
            valorTotal: 55000 + Math.floor(Math.random() * 15000),
            tarifaReferencia: 3200,
            diferenciaTarifa: Math.floor(Math.random() * 15) - 5,
            porcentajeDiferencia: Math.random() * 8 - 4,
            anomalias: "[]",
            recomendaciones: JSON.stringify([
              {
                type: "water_saving",
                description: "Revisa posibles fugas en tuberías",
              },
            ]),
          },
        })
      }
    }

    console.log("✅ Análisis de ejemplo creados")
    console.log("🎉 Seed completado exitosamente!")
    console.log("")
    console.log("Usuarios creados:")
    console.log("- Admin: admin@optifactura.co / admin123")
    console.log("- Test: test@optifactura.co / test123")
  } catch (error) {
    console.error("❌ Error durante el seed:", error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
