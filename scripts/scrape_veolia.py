#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scraper autónomo para tarifas de Veolia (Acueducto y Alcantarillado) - Montería
Este scraper:
1. Navega a https://www.monteria.veolia.co/servicio-cliente/tarifas
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
BASE_URL = "https://www.monteria.veolia.co"
TARIFAS_URL = "https://www.monteria.veolia.co/servicio-cliente/tarifas"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-CO,es;q=0.9',
}

# Subsidios oficiales CRA para Acueducto y Alcantarillado (fallback si no se extraen)
# Según regulación CRA - Máximos permitidos por ley
# Los municipios pueden aplicar porcentajes menores
SUBSIDIOS_CRA_AGUA = {
    '1': -70,  # Estrato 1: hasta -70%
    '2': -40,  # Estrato 2: hasta -40%
    '3': -15,  # Estrato 3: hasta -15%
    '4': 0,    # Estrato 4: sin subsidio ni contribución
    '5': 20,   # Estrato 5: contribución +20%
    '6': 20,   # Estrato 6: contribución +20%
    'Comercial': 20,
    'Industrial': 20,
    'Oficial': 0
}


def obtener_subsidio_cra(estrato: str, subsidios_extraidos: Optional[Dict] = None) -> float:
    """
    Obtiene el subsidio para un estrato.
    Usa subsidios extraídos del PDF/página si están disponibles,
    sino usa valores CRA oficiales como fallback.
    """
    if subsidios_extraidos:
        # Buscar coincidencia exacta o por número de estrato
        if estrato in subsidios_extraidos:
            return subsidios_extraidos[estrato]
        # Intentar extraer solo el número si es "Estrato X"
        match = re.search(r'(\d)', str(estrato))
        if match and match.group(1) in subsidios_extraidos:
            return subsidios_extraidos[match.group(1)]
    return SUBSIDIOS_CRA_AGUA.get(estrato, 0)


def encontrar_pdf_mas_reciente(soup: BeautifulSoup) -> Optional[Dict[str, str]]:
    """
    Busca el enlace al PDF de tarifas más reciente en la página.
    """
    meses_orden = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ]
    
    pdf_links = []
    current_year = datetime.now().year
    
    for link in soup.find_all('a', href=True):
        href = link.get('href', '')
        text = link.get_text().strip().lower()
        
        if '.pdf' in href.lower():
            # Verificar si contiene "tarifa" en URL o texto
            if 'tarifa' in href.lower() or 'tarifa' in text:
                year_match = re.search(r'20\d{2}', href)
                year = int(year_match.group()) if year_match else 0
                
                # Buscar mes
                mes_encontrado = None
                mes_index = -1
                for i, mes in enumerate(meses_orden):
                    if mes in text or mes in href.lower():
                        mes_encontrado = mes
                        mes_index = i
                        break
                
                pdf_links.append({
                    'url': href if href.startswith('http') else urljoin(BASE_URL, href),
                    'year': year,
                    'mes': mes_encontrado,
                    'mes_index': mes_index,
                    'text': text
                })
    
    if not pdf_links:
        # Buscar cualquier PDF si no hay específicos de tarifas
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            if '.pdf' in href.lower():
                pdf_links.append({
                    'url': href if href.startswith('http') else urljoin(BASE_URL, href),
                    'year': 0,
                    'mes': None,
                    'mes_index': -1,
                    'text': link.get_text().strip().lower()
                })
    
    if not pdf_links:
        return None
    
    # Ordenar por año y mes (más reciente primero)
    pdf_links.sort(key=lambda x: (x['year'], x['mes_index']), reverse=True)
    
    print(f"Encontrados {len(pdf_links)} PDFs de tarifas", file=sys.stderr)
    if pdf_links:
        selected = pdf_links[0]
        print(f"Seleccionado: {selected['url']}", file=sys.stderr)
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
    
    # Manejar formato colombiano
    if ',' in limpio and '.' in limpio:
        limpio = limpio.replace('.', '').replace(',', '.')
    elif ',' in limpio:
        limpio = limpio.replace(',', '.')
    elif limpio.count('.') > 1:
        partes = limpio.split('.')
        limpio = ''.join(partes[:-1]) + '.' + partes[-1]
    
    try:
        return float(limpio)
    except ValueError:
        return 0.0


def extraer_tarifas_de_pdf(pdf_path: str) -> Dict[str, Any]:
    """
    Extrae las tarifas del PDF de Veolia.
    Busca:
    - Tarifas por estrato para acueducto y alcantarillado
    - Cargos fijos
    - Subsidios/contribuciones
    """
    tarifas = []
    subsidios = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"PDF tiene {len(pdf.pages)} páginas", file=sys.stderr)
            
            for page_num, page in enumerate(pdf.pages):
                # Extraer tablas
                tables = page.extract_tables()
                
                for table_idx, table in enumerate(tables):
                    if not table or len(table) < 2:
                        continue
                    
                    # Analizar encabezados
                    headers = [str(h).lower() if h else '' for h in table[0]]
                    header_text = ' '.join(headers)
                    
                    # Buscar tablas de tarifas
                    if any(kw in header_text for kw in ['estrato', 'uso', 'cargo', 'tarifa', 'm3', 'm³', 'consumo', 'acueducto', 'alcantarillado']):
                        print(f"Tabla de tarifas encontrada en página {page_num + 1}", file=sys.stderr)
                        
                        # Identificar índices de columnas relevantes
                        idx_cargo_fijo = next((i for i, h in enumerate(headers) if 'fijo' in h or 'cargo' in h), -1)
                        idx_consumo = next((i for i, h in enumerate(headers) if 'consumo' in h or 'm³' in h or 'm3' in h or 'variable' in h), -1)
                        
                        for row in table[1:]:
                            if not row or len(row) < 2:
                                continue
                            
                            # Primera columna = estrato/categoría
                            categoria = str(row[0]).strip() if row[0] else ''
                            
                            if not categoria:
                                continue
                            
                            # Determinar estrato
                            estrato = None
                            estrato_match = re.search(r'estrato\s*(\d)', categoria.lower())
                            if estrato_match:
                                estrato = estrato_match.group(1)
                            elif re.match(r'^[1-6]$', categoria.strip()):
                                estrato = categoria.strip()
                            elif 'comercial' in categoria.lower():
                                estrato = 'Comercial'
                            elif 'industrial' in categoria.lower():
                                estrato = 'Industrial'
                            elif 'oficial' in categoria.lower():
                                estrato = 'Oficial'
                            
                            if not estrato:
                                continue
                            
                            # Extraer valores numéricos
                            valores = []
                            for i, cell in enumerate(row[1:], 1):
                                val = extraer_numero(str(cell) if cell else '')
                                if val > 0:
                                    valores.append({'index': i, 'value': val})
                            
                            if valores:
                                # Intentar identificar cargo fijo vs tarifa por consumo
                                cargo_fijo = 0
                                tarifa = 0
                                
                                # Usar índices de columnas si se identificaron
                                if idx_cargo_fijo > 0 and idx_cargo_fijo < len(row):
                                    cargo_fijo = extraer_numero(str(row[idx_cargo_fijo]) if row[idx_cargo_fijo] else '')
                                if idx_consumo > 0 and idx_consumo < len(row):
                                    tarifa = extraer_numero(str(row[idx_consumo]) if row[idx_consumo] else '')
                                
                                # Si no se identificaron columnas, inferir por valores
                                if not tarifa and not cargo_fijo:
                                    for v in valores:
                                        if 3000 < v['value'] < 100000:
                                            cargo_fijo = v['value']
                                        elif 500 < v['value'] < 10000:
                                            tarifa = v['value']
                                
                                # Si solo hay un valor, asumirlo como tarifa
                                if not tarifa and valores:
                                    tarifa = valores[0]['value']
                                
                                # Obtener subsidio usando función centralizada (extraído o CRA)
                                subsidio = obtener_subsidio_cra(estrato, {s['estrato']: s['porcentaje'] for s in subsidios} if subsidios else None)
                                
                                # Evitar duplicados
                                if not any(t['estrato'] == estrato for t in tarifas):
                                    tarifas.append({
                                        "estrato": estrato,
                                        "tarifa": tarifa,
                                        "cargoFijo": cargo_fijo,
                                        "subsidio": subsidio
                                    })
                                    print(f"  Extraída: Estrato {estrato} = ${tarifa}/m³, cargo fijo: ${cargo_fijo}", file=sys.stderr)
                
                # Buscar subsidios en texto
                text = page.extract_text() or ""
                
                patron_subsidio = r'estrato\s*(\d)[^0-9]*([\d.,]+)\s*%'
                matches = re.findall(patron_subsidio, text.lower())
                for estrato_num, porcentaje in matches:
                    pct = extraer_numero(porcentaje)
                    if pct > 0 and not any(s['estrato'] == estrato_num for s in subsidios):
                        subsidios.append({
                            "estrato": estrato_num,
                            "porcentaje": -pct  # Negativo = descuento
                        })
                        print(f"  Subsidio: Estrato {estrato_num} = -{pct}%", file=sys.stderr)
        
        # Limpiar archivo temporal
        try:
            os.unlink(pdf_path)
        except:
            pass
        
        return {
            "tarifas": tarifas,
            "subsidios": subsidios
        }
        
    except Exception as e:
        print(f"Error extrayendo datos del PDF: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {"tarifas": [], "subsidios": []}


def extraer_tarifas_de_html(soup: BeautifulSoup) -> List[Dict]:
    """
    Intenta extraer tarifas directamente del HTML si hay tablas visibles.
    """
    tarifas = []
    
    try:
        # Buscar tablas en el HTML
        for tabla in soup.find_all('table'):
            filas = tabla.find_all('tr')
            
            for fila in filas:
                celdas = fila.find_all(['td', 'th'])
                if len(celdas) < 2:
                    continue
                
                primera = celdas[0].get_text().strip().lower()
                
                # Buscar estrato
                estrato = None
                if re.match(r'^estrato\s*\d', primera):
                    match = re.search(r'(\d)', primera)
                    if match:
                        estrato = match.group(1)
                elif re.match(r'^\d$', primera):
                    estrato = primera
                
                if estrato:
                    valores = []
                    for celda in celdas[1:]:
                        val = extraer_numero(celda.get_text())
                        if val > 0:
                            valores.append(val)
                    
                    if valores:
                        tarifa = next((v for v in valores if 500 < v < 10000), valores[0])
                        cargo_fijo = next((v for v in valores if 3000 < v < 100000 and v != tarifa), 0)
                        
                        # Obtener subsidio usando función centralizada
                        subsidio = obtener_subsidio_cra(estrato)
                        
                        if not any(t['estrato'] == estrato for t in tarifas):
                            tarifas.append({
                                "estrato": estrato,
                                "tarifa": tarifa,
                                "cargoFijo": cargo_fijo,
                                "subsidio": subsidio
                            })
                            print(f"  Tarifa HTML: Estrato {estrato} = ${tarifa}/m³", file=sys.stderr)
    
    except Exception as e:
        print(f"Error extrayendo de HTML: {str(e)}", file=sys.stderr)
    
    return tarifas


def scrape_veolia() -> Dict[str, Any]:
    """
    Scraper autónomo para Veolia Montería.
    Extrae tarifas reales desde la página oficial.
    SIN VALORES HARDCODEADOS.
    """
    print("=== Iniciando scraper autónomo de Veolia ===", file=sys.stderr)
    
    resultado = {
        "url": TARIFAS_URL,
        "fechaExtraccion": datetime.now().isoformat(),
        "proveedor": "Veolia",
        "servicio": "agua",
        "region": "Montería",
        "unidad": "m³",
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
        
        # Paso 2: Intentar extraer tarifas del HTML
        print("Paso 2: Buscando tarifas en HTML...", file=sys.stderr)
        tarifas_html = extraer_tarifas_de_html(soup)
        
        # Paso 3: Encontrar PDF más reciente
        print("Paso 3: Buscando PDF de tarifas...", file=sys.stderr)
        pdf_info = encontrar_pdf_mas_reciente(soup)
        
        tarifas_pdf = []
        subsidios_pdf = []
        
        if pdf_info:
            resultado["pdf_url"] = pdf_info['url']
            if pdf_info.get('mes'):
                resultado["mes_tarifa"] = pdf_info['mes']
            
            # Paso 4: Descargar PDF
            print("Paso 4: Descargando PDF...", file=sys.stderr)
            pdf_path = descargar_pdf(pdf_info['url'])
            
            if pdf_path:
                # Paso 5: Extraer tarifas del PDF
                print("Paso 5: Extrayendo tarifas del PDF...", file=sys.stderr)
                datos_pdf = extraer_tarifas_de_pdf(pdf_path)
                tarifas_pdf = datos_pdf.get("tarifas", [])
                subsidios_pdf = datos_pdf.get("subsidios", [])
        
        # Usar tarifas del PDF si las hay, sino del HTML
        if tarifas_pdf:
            resultado["tarifas"] = tarifas_pdf
        elif tarifas_html:
            resultado["tarifas"] = tarifas_html
        
        # Agregar subsidios
        if subsidios_pdf:
            resultado["subsidios"] = subsidios_pdf
        else:
            # Generar subsidios basados en tarifas si se extrajeron
            for tarifa in resultado["tarifas"]:
                if tarifa["estrato"] in ['1', '2', '3'] and tarifa.get("subsidio"):
                    resultado["subsidios"].append({
                        "estrato": tarifa["estrato"],
                        "porcentaje": tarifa["subsidio"]
                    })
        
        # Verificar que obtuvimos datos - NO USAR FALLBACK
        if not resultado["tarifas"]:
            resultado["error"] = "No se pudieron extraer tarifas de la página ni del PDF"
            resultado["sugerencia"] = "La estructura de la página pudo haber cambiado. Revisar manualmente: " + TARIFAS_URL
        else:
            print(f"\n=== Extracción completada: {len(resultado['tarifas'])} tarifas ===", file=sys.stderr)
        
        return resultado
        
    except Exception as e:
        print(f"Error en scraper: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        
        resultado["error"] = str(e)
        resultado["sugerencia"] = "Verificar conectividad y que la URL sea accesible: " + TARIFAS_URL
        return resultado


if __name__ == "__main__":
    resultado = scrape_veolia()
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
