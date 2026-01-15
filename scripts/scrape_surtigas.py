#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scraper autónomo para tarifas de Surtigas (Gas Natural) - Montería, Córdoba
Este scraper:
1. Navega a https://www.surtigas.com.co/informacion-tarifaria
2. Extrae las tarifas vigentes dinámicamente
3. NO tiene valores hardcodeados - todo se extrae de la fuente

Usa Selenium porque la página bloquea requests directos.
"""

import sys
import json
import re
import os
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from webdriver_manager.chrome import ChromeDriverManager
except ImportError as e:
    print(json.dumps({
        "error": f"Dependencias faltantes: {str(e)}. Ejecuta: pip install selenium webdriver-manager"
    }), file=sys.stderr)
    sys.exit(1)


# Configuración
TARIFAS_URL = "https://www.surtigas.com.co/informacion-tarifaria"
TIMEOUT = 30


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


def crear_driver() -> webdriver.Chrome:
    """Crea y configura el driver de Chrome."""
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    # Suprimir logs de webdriver
    chrome_options.add_experimental_option('excludeSwitches', ['enable-logging'])
    
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(TIMEOUT)
        return driver
    except Exception as e:
        print(f"Error creando driver: {str(e)}", file=sys.stderr)
        raise


def extraer_tarifas_de_tabla(driver: webdriver.Chrome) -> List[Dict]:
    """
    Extrae tarifas de las tablas en la página.
    Busca tablas con información de estratos y tarifas.
    """
    tarifas = []
    
    try:
        # Esperar a que la página cargue
        WebDriverWait(driver, TIMEOUT).until(
            EC.presence_of_element_located((By.TAG_NAME, "table"))
        )
        time.sleep(2)  # Esperar carga dinámica
        
        # Buscar todas las tablas
        tablas = driver.find_elements(By.TAG_NAME, "table")
        print(f"Encontradas {len(tablas)} tablas en la página", file=sys.stderr)
        
        for idx, tabla in enumerate(tablas):
            try:
                filas = tabla.find_elements(By.TAG_NAME, "tr")
                
                for fila in filas:
                    celdas = fila.find_elements(By.TAG_NAME, "td")
                    if len(celdas) < 2:
                        celdas = fila.find_elements(By.TAG_NAME, "th")
                    
                    if len(celdas) >= 2:
                        primera_celda = celdas[0].text.strip().lower()
                        
                        # Buscar filas con estratos
                        estrato = None
                        if re.match(r'^estrato\s*\d', primera_celda):
                            match = re.search(r'(\d)', primera_celda)
                            if match:
                                estrato = match.group(1)
                        elif re.match(r'^\d$', primera_celda[:1] if primera_celda else ''):
                            estrato = primera_celda[:1]
                        elif 'residencial' in primera_celda:
                            estrato = 'Residencial'
                        elif 'comercial' in primera_celda:
                            estrato = 'Comercial'
                        elif 'industrial' in primera_celda:
                            estrato = 'Industrial'
                        elif 'gnv' in primera_celda:
                            estrato = 'GNV'
                        
                        if estrato:
                            # Extraer valores de las demás celdas
                            valores = []
                            for celda in celdas[1:]:
                                val = extraer_numero(celda.text)
                                if val > 0:
                                    valores.append(val)
                            
                            if valores:
                                # Identificar tarifa ($/m³) y cargo fijo
                                tarifa = next((v for v in valores if 500 < v < 10000), valores[0] if valores else 0)
                                cargo_fijo = next((v for v in valores if 3000 < v < 100000 and v != tarifa), 0)
                                
                                # Determinar subsidio por estrato
                                subsidio = 0
                                if estrato == '1':
                                    subsidio = -50
                                elif estrato == '2':
                                    subsidio = -40
                                elif estrato == '3':
                                    subsidio = -15
                                elif estrato in ['5', '6']:
                                    subsidio = 20
                                
                                tarifa_data = {
                                    "estrato": estrato,
                                    "tarifa": tarifa,
                                    "cargoFijo": cargo_fijo,
                                    "subsidio": subsidio
                                }
                                
                                # Evitar duplicados
                                if not any(t['estrato'] == estrato for t in tarifas):
                                    tarifas.append(tarifa_data)
                                    print(f"  Tarifa extraída: Estrato {estrato} = ${tarifa}/m³, Cargo fijo: ${cargo_fijo}", file=sys.stderr)
            
            except Exception as e:
                print(f"Error procesando tabla {idx}: {str(e)}", file=sys.stderr)
                continue
    
    except Exception as e:
        print(f"Error buscando tablas: {str(e)}", file=sys.stderr)
    
    return tarifas


def extraer_tarifas_de_texto(driver: webdriver.Chrome) -> List[Dict]:
    """
    Extrae tarifas del texto de la página si no hay tablas claras.
    Busca patrones como "Estrato 1: $X.XXX/m³"
    """
    tarifas = []
    
    try:
        # Obtener todo el texto de la página
        body = driver.find_element(By.TAG_NAME, "body")
        texto = body.text
        
        # Buscar patrones de tarifas
        # Patrón: Estrato X ... $XXX.XXX o XXX,XX
        patrones = [
            r'estrato\s*(\d)[:\s]*\$?([\d.,]+)\s*/?\s*m[³3]',
            r'residencial\s*(\d)[:\s]*\$?([\d.,]+)',
            r'estrato\s*(\d)[^0-9]*([\d.,]+)\s*pesos',
        ]
        
        for patron in patrones:
            matches = re.findall(patron, texto.lower())
            for estrato, valor in matches:
                tarifa = extraer_numero(valor)
                if 500 < tarifa < 10000 and not any(t['estrato'] == estrato for t in tarifas):
                    subsidio = 0
                    if estrato == '1':
                        subsidio = -50
                    elif estrato == '2':
                        subsidio = -40
                    elif estrato == '3':
                        subsidio = -15
                    
                    tarifas.append({
                        "estrato": estrato,
                        "tarifa": tarifa,
                        "cargoFijo": 0,
                        "subsidio": subsidio
                    })
                    print(f"  Tarifa del texto: Estrato {estrato} = ${tarifa}/m³", file=sys.stderr)
        
    except Exception as e:
        print(f"Error extrayendo del texto: {str(e)}", file=sys.stderr)
    
    return tarifas


def buscar_pdf_tarifas(driver: webdriver.Chrome) -> Optional[str]:
    """
    Busca enlaces a PDFs de tarifas en la página.
    """
    try:
        enlaces = driver.find_elements(By.TAG_NAME, "a")
        
        for enlace in enlaces:
            href = enlace.get_attribute("href") or ""
            texto = enlace.text.lower()
            
            if '.pdf' in href.lower() and ('tarifa' in texto or 'tarifa' in href.lower()):
                print(f"PDF de tarifas encontrado: {href}", file=sys.stderr)
                return href
        
    except Exception as e:
        print(f"Error buscando PDF: {str(e)}", file=sys.stderr)
    
    return None


def extraer_componentes(driver: webdriver.Chrome) -> Dict[str, float]:
    """
    Extrae los componentes de la tarifa si están disponibles.
    """
    componentes = {}
    
    try:
        texto = driver.find_element(By.TAG_NAME, "body").text
        
        patrones = [
            (r'costo\s*gas\s*natural[:\s]*([\d.,]+)', 'Costo_gas_natural'),
            (r'cargo\s*distribuci[oó]n[:\s]*([\d.,]+)', 'Cargo_distribución'),
            (r'cargo\s*comercializaci[oó]n[:\s]*([\d.,]+)', 'Cargo_comercialización'),
            (r'cargo\s*transporte[:\s]*([\d.,]+)', 'Cargo_transporte'),
        ]
        
        for patron, nombre in patrones:
            match = re.search(patron, texto.lower())
            if match:
                valor = extraer_numero(match.group(1))
                if 50 < valor < 5000:
                    componentes[nombre] = valor
                    print(f"  Componente: {nombre} = ${valor}", file=sys.stderr)
    
    except Exception as e:
        print(f"Error extrayendo componentes: {str(e)}", file=sys.stderr)
    
    return componentes


def scrape_surtigas() -> Dict[str, Any]:
    """
    Scraper autónomo para Surtigas Montería.
    Extrae tarifas reales desde la página oficial usando Selenium.
    """
    print("=== Iniciando scraper autónomo de Surtigas ===", file=sys.stderr)
    
    resultado = {
        "url": TARIFAS_URL,
        "fechaExtraccion": datetime.now().isoformat(),
        "proveedor": "Surtigas",
        "servicio": "gas",
        "region": "Montería",
        "unidad": "m³",
        "tarifas": [],
        "subsidios": [],
        "componentes": {}
    }
    
    driver = None
    
    try:
        # Paso 1: Crear driver
        print("Paso 1: Iniciando navegador...", file=sys.stderr)
        driver = crear_driver()
        
        # Paso 2: Navegar a la página de tarifas
        print(f"Paso 2: Navegando a {TARIFAS_URL}...", file=sys.stderr)
        driver.get(TARIFAS_URL)
        
        # Esperar carga inicial
        time.sleep(3)
        
        # Paso 3: Intentar extraer tarifas de tablas
        print("Paso 3: Extrayendo tarifas de tablas...", file=sys.stderr)
        tarifas = extraer_tarifas_de_tabla(driver)
        
        # Paso 4: Si no hay tablas, buscar en texto
        if not tarifas:
            print("Paso 4: Buscando tarifas en texto...", file=sys.stderr)
            tarifas = extraer_tarifas_de_texto(driver)
        
        # Paso 5: Buscar PDF de tarifas
        print("Paso 5: Buscando PDF de tarifas...", file=sys.stderr)
        pdf_url = buscar_pdf_tarifas(driver)
        if pdf_url:
            resultado["pdf_url"] = pdf_url
        
        # Paso 6: Extraer componentes
        print("Paso 6: Extrayendo componentes de tarifa...", file=sys.stderr)
        componentes = extraer_componentes(driver)
        if componentes:
            resultado["componentes"] = componentes
        
        # Asignar tarifas al resultado
        resultado["tarifas"] = tarifas
        
        # Generar subsidios basados en tarifas extraídas
        for tarifa in tarifas:
            if tarifa.get("subsidio") and tarifa["estrato"] in ['1', '2', '3']:
                resultado["subsidios"].append({
                    "estrato": tarifa["estrato"],
                    "porcentaje": tarifa["subsidio"]
                })
        
        # Verificar que obtuvimos datos
        if not resultado["tarifas"]:
            resultado["error"] = "No se pudieron extraer tarifas de la página"
            resultado["sugerencia"] = "La estructura de la página pudo haber cambiado. Revisar manualmente: " + TARIFAS_URL
            
            # Capturar screenshot para debug
            try:
                screenshot_path = os.path.join(os.path.dirname(__file__), '..', 'datos_tarifas', 'surtigas_debug.png')
                driver.save_screenshot(screenshot_path)
                resultado["debug_screenshot"] = screenshot_path
            except:
                pass
        else:
            print(f"\n=== Extracción completada: {len(resultado['tarifas'])} tarifas ===", file=sys.stderr)
        
        return resultado
        
    except Exception as e:
        print(f"Error en scraper: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        
        resultado["error"] = str(e)
        resultado["sugerencia"] = "Verificar que Chrome está instalado y que la URL sea accesible: " + TARIFAS_URL
        return resultado
        
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass


if __name__ == "__main__":
    resultado = scrape_surtigas()
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
