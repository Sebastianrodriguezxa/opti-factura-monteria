class TarifasPage {
    constructor() {
        this.init()
    }

    async init() {
        await this.cargarTarifas()
    }

    async cargarTarifas() {
        const loading = document.getElementById("loading")
        const content = document.getElementById("tarifas-content")
        const empty = document.getElementById("empty-state")

        try {
            const response = await fetch("/api/tarifas")
            if (response.ok) {
                const result = await response.json()
                const tarifas = result.data || []

                if (tarifas.length === 0) {
                    loading.style.display = "none"
                    empty.style.display = "block"
                    return
                }

                this.renderizarTarifas(tarifas)
                loading.style.display = "none"
                content.style.display = "block"
            } else {
                loading.style.display = "none"
                empty.style.display = "block"
            }
        } catch (error) {
            console.error("Error al cargar tarifas:", error)
            loading.style.display = "none"
            empty.style.display = "block"
        }
    }

    renderizarTarifas(tarifas) {
        const proveedores = {
            afinia: { tabla: "tabla-afinia", fecha: "fecha-afinia", items: [] },
            veolia: { tabla: "tabla-veolia", fecha: "fecha-veolia", items: [] },
            surtigas: { tabla: "tabla-surtigas", fecha: "fecha-surtigas", items: [] }
        }

        for (const tarifa of tarifas) {
            const proveedor = (tarifa.proveedor || "").toLowerCase()
            if (proveedores[proveedor]) {
                proveedores[proveedor].items.push(tarifa)
            }
        }

        for (const [key, prov] of Object.entries(proveedores)) {
            const tbody = document.querySelector(`#${prov.tabla} tbody`)
            if (!tbody) continue

            // Sort by estrato
            prov.items.sort((a, b) => (a.estrato || 0) - (b.estrato || 0))

            if (prov.items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">Sin datos disponibles</td></tr>`
                continue
            }

            tbody.innerHTML = prov.items.map(t => `
        <tr>
          <td><span class="badge bg-primary">Estrato ${t.estrato || '-'}</span></td>
          <td>$${(t.cargoFijo || 0).toLocaleString('es-CO')}</td>
          <td>$${(t.tarifaConsumo || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
          <td>${t.subsidio ? `<span class="text-success">${t.subsidio}%</span>` : '-'}</td>
          <td>${t.contribucion ? `<span class="text-warning">${t.contribucion}%</span>` : '-'}</td>
        </tr>
      `).join("")

            const fechaEl = document.getElementById(prov.fecha)
            if (fechaEl && prov.items[0].updatedAt) {
                const fecha = new Date(prov.items[0].updatedAt)
                fechaEl.textContent = `Última actualización: ${fecha.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}`
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", () => { new TarifasPage() })
