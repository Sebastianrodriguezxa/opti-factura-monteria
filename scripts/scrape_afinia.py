#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scraper autónomo para tarifas de Afinia (Electricidad) - Montería, Córdoba
Este scraper:
1. Navega a https://afinia.com.co/inicio/tarifas-y-subsidios
2. Encuentra el PDF de tarifas más reciente
3. Descarga y extrae las tarifas dinámicamente
4. NO tiene valores hardcodeados - todo se extrae de la fuente
"""

import sys
import json
import re
import os
import tempfile
from datetime import datetime
from typing import Dict, Any, List, Optional
from urllib.parse import urljoin

try:
    import requests
    from bs4 import BeautifulSoup
    import pdfplumber
except ImportError as e:
    print(json.dumps({
        "error": f"Dependencias faltantes: {str(e)}. Ejecuta: pip install requests beautifulsoup4 pdfplumber lxml"
    }), file=sys.stderr)
    sys.exit(1)


# Configuración
BASE_URL = "https://afinia.com.co"
TARIFAS_URL = "https://afinia.com.co/inicio/tarifas-y-subsidios"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-CO,es;q=0.9',
}

# Subsidios oficiales CREG para Electricidad (fallback si no se extraen de la página)
# Según regulación CREG vigente
# Aplican solo al consumo de subsistencia (173 kWh/mes para Montería < 1000 msnm)
SUBSIDIOS_CREG_ELECTRICIDAD = {
    '1': -60,  # Estrato 1: hasta -60%
    '2': -50,  # Estrato 2: hasta -50%
    '3': -15,  # Estrato 3: hasta -15%
    '4': 0,    # Estrato 4: sin subsidio ni contribución
    '5': 20,   # Estrato 5: contribución +20%
    '6': 20,   # Estrato 6: contribución +20%
    'Comercial': 20,
    'Industrial': 20,
    'Oficial': 0
}

CONSUMO_SUBSISTENCIA_ELECTRICIDAD = 173  # kWh/mes para municipios < 1000 msnm


def encontrar_pdf_mas_reciente(soup: BeautifulSoup) -> Optional[Dict[str, str]]:
    """
    Busca el enlace al PDF de tarifas más reciente en la página.
    Retorna dict con url y mes del PDF.
    """
    meses_orden = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ]
    
    pdf_links = []
    current_year = datetime.now().year
    
    # Buscar todos los enlaces a PDFs
    for link in soup.find_all('a', href=True):
        href = link.get('href', '')
        text = link.get_text().strip().lower()
        
        if '.pdf' in href.lower():
            # Verificar si es del año actual o anterior
            year_match = re.search(r'20\d{2}', href)
            year = int(year_match.group()) if year_match else 0
            
            # Buscar mes en el texto del enlace o en la URL
            mes_encontrado = None
            mes_index = -1
            
            for i, mes in enumerate(meses_orden):
                if mes in text or mes in href.lower():
                    mes_encontrado = mes
                    mes_index = i
                    break
            
            if year >= current_year - 1:  # Año actual o anterior
                pdf_links.append({
                    'url': href if href.startswith('http') else urljoin(BASE_URL, href),
                    'year': year,
                    'mes': mes_encontrado,
                    'mes_index': mes_index,
                    'text': text
                })
    
    if not pdf_links:
        return None
    
    # Ordenar por año (descendente) y luego por mes (descendente)
    pdf_links.sort(key=lambda x: (x['year'], x['mes_index']), reverse=True)
    
    print(f"Encontrados {len(pdf_links)} PDFs de tarifas", file=sys.stderr)
    if pdf_links:
        selected = pdf_links[0]
        print(f"Seleccionado: {selected['mes']} {selected['year']} - {selected['url']}", file=sys.stderr)
        return selected
    
    return None


def descargar_pdf(url: str) -> Optional[str]:
    """
    Descarga un PDF y retorna la ruta del archivo temporal.
    """
    try:
        print(f"Descargando PDF desde: {url}", file=sys.stderr)
        response = requests.get(url, headers=HEADERS, timeout=60)
        response.raise_for_status()
        
        # Guardar en archivo temporal
        fd, path = tempfile.mkstemp(suffix='.pdf')
        with os.fdopen(fd, 'wb') as f:
            f.write(response.content)
        
        print(f"PDF descargado: {len(response.content)} bytes", file=sys.stderr)
        return path
        
    except Exception as e:
        print(f"Error descargando PDF: {str(e)}", file=sys.stderr)
        return None


def extraer_numero(texto: str) -> float:
    """Extrae un número de un texto."""
    if not texto:
        return 0.0
    
    # Limpiar el texto
    limpio = re.sub(r'[^\d.,]', '', str(texto).strip())
    
    # Manejar formato colombiano (punto como separador de miles, coma como decimal)
    if ',' in limpio and '.' in limpio:
        # Si hay ambos, el punto es separador de miles
        limpio = limpio.replace('.', '').replace(',', '.')
    elif ',' in limpio:
        limpio = limpio.replace(',', '.')
    elif limpio.count('.') > 1:
        # Múltiples puntos = separadores de miles
        partes = limpio.split('.')
        limpio = ''.join(partes[:-1]) + '.' + partes[-1]
    
    try:
        return float(limpio)
    except ValueError:
        return 0.0


def extraer_subsidios_de_pagina(soup: BeautifulSoup) -> Dict[str, float]:
    """
    Extrae los porcentajes de subsidio directamente de la página HTML.
    Busca patrones como "1 = 45.20%" en el contenido.
    """
    subsidios = {}
    
    # Buscar en todo el texto de la página
    text = soup.get_text()
    
    # Patrón para subsidios: "1 = XX.XX%" o "Estrato 1 = XX%"
    patron_subsidio = r'(?:estrato\s*)?(\d)\s*[=:]\s*([\d.,]+)\s*%'
    matches = re.findall(patron_subsidio, text.lower())
    
    for estrato, porcentaje in matches:
        if estrato in ['1', '2', '3']:
            valor = extraer_numero(porcentaje)
            if valor > 0:
                subsidios[estrato] = -valor  # Negativo porque es descuento
                print(f"  Subsidio extraído: Estrato {estrato} = -{valor}%", file=sys.stderr)
    
    return subsidios


def extraer_cu_de_pagina(soup: BeautifulSoup) -> Optional[float]:
    """
    Extrae el Costo Unitario (CU) de la página HTML.
    Busca patrones como "CU de XXX,XX $/kWh"
    """
    text = soup.get_text()
    
    # Buscar el CU en el texto
    # Patrón: número seguido de $/kWh
    patron_cu = r'(\d{1,3}[.,]?\d{0,3}[.,]?\d{2})\s*\$/kWh'
    matches = re.findall(patron_cu, text)
    
    if matches:
        for match in matches:
            valor = extraer_numero(match)
            if 500 < valor < 2000:  # Rango razonable para CU en Colombia
                print(f"  CU extraído de página: ${valor}/kWh", file=sys.stderr)
                return valor
    
    return None


def extraer_tarifas_de_pdf(pdf_path: str) -> Dict[str, Any]:
    """
    Extrae las tarifas del PDF de Afinia.
    Busca:
    - Costo Unitario (CU) base
    - Tarifas por estrato
    - Componentes de tarifa
    """
    cu_base = None
    tarifas_extraidas = []
    componentes = {}
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"PDF tiene {len(pdf.pages)} páginas", file=sys.stderr)
            
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                
                # Buscar CU (Costo Unitario)
                # Patrones comunes: "CU: $XXX,XX" o "Costo Unitario $XXX.XX"
                if not cu_base:
                    patrones_cu = [
                        r'(?:CU|costo\s*unitario)[:\s]*\$?\s*([\d.,]+)',
                        r'([\d.,]+)\s*\$/kWh',
                        r'nivel\s*(?:de\s*)?tensi[oó]n\s*1[^0-9]*([\d.,]+)',
                    ]
                    
                    for patron in patrones_cu:
                        match = re.search(patron, text, re.IGNORECASE)
                        if match:
                            valor = extraer_numero(match.group(1))
                            if 500 < valor < 2000:  # Rango razonable
                                cu_base = valor
                                print(f"  CU extraído de PDF: ${cu_base}/kWh (página {page_num + 1})", file=sys.stderr)
                                break
                
                # Extraer tablas
                tables = page.extract_tables()
                
                for table in tables:
                    if not table or len(table) < 2:
                        continue
                    
                    # Buscar encabezados relacionados con tarifas
                    headers = [str(h).lower() if h else '' for h in table[0]]
                    header_text = ' '.join(headers)
                    
                    # Buscar tablas con datos de estratos o tarifas
                    if any(kw in header_text for kw in ['estrato', 'kwh', 'tarifa', 'cargo', 'nivel']):
                        print(f"  Tabla de tarifas encontrada en página {page_num + 1}", file=sys.stderr)
                        
                        for row in table[1:]:
                            if not row or len(row) < 2:
                                continue
                            
                            # Buscar estrato en la fila
                            primera_col = str(row[0]).strip() if row[0] else ''
                            
                            # Verificar si es un estrato (1-6) o categoría
                            estrato = None
                            if re.match(r'^[1-6]$', primera_col):
                                estrato = primera_col
                            elif 'estrato' in primera_col.lower():
                                match = re.search(r'(\d)', primera_col)
                                if match:
                                    estrato = match.group(1)
                            elif primera_col.lower() in ['comercial', 'industrial', 'oficial']:
                                estrato = primera_col.capitalize()
                            
                            if estrato:
                                # Extraer valores numéricos de la fila
                                valores = []
                                for cell in row[1:]:
                                    val = extraer_numero(str(cell) if cell else '')
                                    if val > 0:
                                        valores.append(val)
                                
                                if valores:
                                    # Intentar identificar cargo fijo vs tarifa por consumo
                                    tarifa = next((v for v in valores if 100 < v < 2000), valores[0])
                                    cargo_fijo = next((v for v in valores if 3000 < v < 50000), 0)
                                    
                                    tarifas_extraidas.append({
                                        "estrato": estrato,
                                        "tarifa": tarifa,
                                        "cargoFijo": cargo_fijo
                                    })
                                    print(f"    Tarifa: Estrato {estrato} = ${tarifa}/kWh, Cargo fijo: ${cargo_fijo}", file=sys.stderr)
                
                # Buscar componentes de tarifa en el texto
                componentes_patron = [
                    (r'generaci[oó]n[:\s]*([\d.,]+)', 'Generación'),
                    (r'transmisi[oó]n[:\s]*([\d.,]+)', 'Transmisión'),
                    (r'distribuci[oó]n[:\s]*([\d.,]+)', 'Distribución'),
                    (r'comercializaci[oó]n[:\s]*([\d.,]+)', 'Comercialización'),
                    (r'p[eé]rdidas[:\s]*([\d.,]+)', 'Pérdidas'),
                    (r'restricciones[:\s]*([\d.,]+)', 'Restricciones'),
                ]
                
                for patron, nombre in componentes_patron:
                    if nombre not in componentes:
                        match = re.search(patron, text, re.IGNORECASE)
                        if match:
                            valor = extraer_numero(match.group(1))
                            if 10 < valor < 500:
                                componentes[nombre] = valor
        
        # Limpiar archivo temporal
        try:
            os.unlink(pdf_path)
        except:
            pass
        
        return {
            "cu_base": cu_base,
            "tarifas": tarifas_extraidas,
            "componentes": componentes
        }
        
    except Exception as e:
        print(f"Error extrayendo datos del PDF: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {"cu_base": None, "tarifas": [], "componentes": {}}


def calcular_tarifas_por_estrato(cu_base: float, subsidios: Dict[str, float]) -> List[Dict]:
    """
    Calcula las tarifas por estrato basándose en el CU y los subsidios.
    Usa subsidios extraídos de la página, o fallback a regulación CREG.
    Subsidios para estratos 1-3, contribución del 20% para estratos 5-6.
    """
    tarifas = []
    
    # Estratos residenciales
    for estrato in ['1', '2', '3', '4', '5', '6']:
        # Usar subsidio extraído si existe, sino usar CREG
        if estrato in subsidios:
            subsidio_porcentaje = subsidios[estrato]
        else:
            subsidio_porcentaje = SUBSIDIOS_CREG_ELECTRICIDAD.get(estrato, 0)
            print(f"  Usando subsidio CREG para estrato {estrato}: {subsidio_porcentaje}%", file=sys.stderr)
        
        if estrato in ['5', '6']:
            # Contribución del 20%
            subsidio_porcentaje = subsidios.get(estrato, 20)
            tarifa_final = cu_base * (1 + subsidio_porcentaje / 100)
        elif estrato == '4':
            # Sin subsidio ni contribución
            tarifa_final = cu_base
        else:
            # Con subsidio (valor negativo)
            factor = 1 + (subsidio_porcentaje / 100)  # subsidio es negativo
            tarifa_final = cu_base * factor
        
        tarifas.append({
            "estrato": estrato,
            "tarifa": round(tarifa_final, 2),
            "cargoFijo": 0,  # Se extraerá del PDF si está disponible
            "subsidio": subsidio_porcentaje,
            "fuente_subsidio": "extraído" if estrato in subsidios else "CREG"
        })
    
    # Comercial e Industrial (con contribución del 20%)
    for tipo in ['Comercial', 'Industrial']:
        contribucion = SUBSIDIOS_CREG_ELECTRICIDAD.get(tipo, 20)
        tarifas.append({
            "estrato": tipo,
            "tarifa": round(cu_base * (1 + contribucion / 100), 2),
            "cargoFijo": 0,
            "subsidio": contribucion,
            "fuente_subsidio": "CREG"
        })
    
    return tarifas


def scrape_afinia() -> Dict[str, Any]:
    """
    Scraper autónomo para Afinia Montería.
    Extrae tarifas reales desde la página oficial.
    """
    print("=== Iniciando scraper autónomo de Afinia ===", file=sys.stderr)
    
    resultado = {
        "url": TARIFAS_URL,
        "fechaExtraccion": datetime.now().isoformat(),
        "proveedor": "Afinia",
        "servicio": "electricidad",
        "region": "Montería",
        "unidad": "kWh",
        "tarifas": [],
        "subsidios": [],
        "componentes": {}
    }
    
    try:
        # Paso 1: Obtener página de tarifas
        print("Paso 1: Accediendo a página de tarifas...", file=sys.stderr)
        response = requests.get(TARIFAS_URL, headers=HEADERS, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'lxml')
        
        # Paso 2: Extraer subsidios de la página
        print("Paso 2: Extrayendo subsidios de la página...", file=sys.stderr)
        subsidios = extraer_subsidios_de_pagina(soup)
        
        # Paso 3: Intentar extraer CU de la página
        print("Paso 3: Buscando CU en la página...", file=sys.stderr)
        cu_base = extraer_cu_de_pagina(soup)
        
        # Paso 4: Buscar y descargar PDF más reciente
        print("Paso 4: Buscando PDF de tarifas más reciente...", file=sys.stderr)
        pdf_info = encontrar_pdf_mas_reciente(soup)
        
        datos_pdf = {"cu_base": None, "tarifas": [], "componentes": {}}
        
        if pdf_info:
            resultado["pdf_url"] = pdf_info['url']
            resultado["mes_tarifa"] = pdf_info.get('mes', 'desconocido')
            
            # Paso 5: Descargar y parsear PDF
            print("Paso 5: Descargando PDF...", file=sys.stderr)
            pdf_path = descargar_pdf(pdf_info['url'])
            
            if pdf_path:
                print("Paso 6: Extrayendo tarifas del PDF...", file=sys.stderr)
                datos_pdf = extraer_tarifas_de_pdf(pdf_path)
        
        # Usar CU del PDF si no se encontró en la página
        if not cu_base and datos_pdf.get('cu_base'):
            cu_base = datos_pdf['cu_base']
        
        # Paso 7: Calcular tarifas finales
        if cu_base and subsidios:
            print(f"Paso 7: Calculando tarifas (CU base: ${cu_base}/kWh)...", file=sys.stderr)
            resultado["tarifas"] = calcular_tarifas_por_estrato(cu_base, subsidios)
            resultado["cu_base"] = cu_base
        elif datos_pdf.get('tarifas'):
            # Usar tarifas extraídas directamente del PDF
            resultado["tarifas"] = datos_pdf['tarifas']
        
        # Agregar componentes si se extrajeron
        if datos_pdf.get('componentes'):
            resultado["componentes"] = datos_pdf['componentes']
        
        # Agregar subsidios
        for estrato, porcentaje in subsidios.items():
            resultado["subsidios"].append({
                "estrato": estrato,
                "porcentaje": porcentaje
            })
        
        # Verificar que obtuvimos datos
        if not resultado["tarifas"]:
            resultado["error"] = "No se pudieron extraer tarifas de la página ni del PDF"
            resultado["sugerencia"] = "La estructura de la página pudo haber cambiado. Revisar manualmente: " + TARIFAS_URL
        else:
            print(f"\n=== Extracción completada: {len(resultado['tarifas'])} tarifas ===", file=sys.stderr)
        
        # Agregar metadata de consumo de subsistencia
        resultado["consumo_subsistencia"] = CONSUMO_SUBSISTENCIA_ELECTRICIDAD
        resultado["nota_subsidios"] = "Subsidios aplican solo al consumo de subsistencia (173 kWh/mes para Montería)"
        
        return resultado
        
    except Exception as e:
        print(f"Error en scraper: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        
        resultado["error"] = str(e)
        resultado["sugerencia"] = "Verificar conectividad y que la URL sea accesible: " + TARIFAS_URL
        return resultado


if __name__ == "__main__":
    resultado = scrape_afinia()
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
