# OptiFactura Montería - Guía Rápida de Usuario

## ¿Qué es OptiFactura Montería?

OptiFactura Montería es una aplicación web que te ayuda a:
- Analizar tus facturas de servicios públicos
- Detectar cobros excesivos o anomalías
- Comparar tarifas con valores oficiales
- Visualizar tu consumo y gastos
- Recibir recomendaciones personalizadas

## Primeros Pasos

### 1. Crear Cuenta
1. Ir a http://localhost:3000/registro.html
2. Llenar el formulario con:
   - Email
   - Contraseña (mínimo 6 caracteres)
   - Nombre y Apellido
3. Hacer clic en "Registrarse"
4. Recibirás un email de bienvenida

### 2. Iniciar Sesión
1. Ir a http://localhost:3000/login.html
2. Ingresar email y contraseña
3. Hacer clic en "Iniciar Sesión"

### 3. Acceder al Dashboard
- Dirección: http://localhost:3000/dashboard.html
- Verás un resumen de tus análisis y estadísticas

## Cómo Usar

### Analizar una Factura

1. **Ir a Análisis**
   - Menú → Analizar Factura
   - URL: http://localhost:3000/analizar.html

2. **Subir Factura**
   - Haz clic en "Seleccionar Archivo"
   - Elige un PDF o imagen de tu factura
   - Selecciona el tipo de servicio (Electricidad, Agua o Gas)
   - Haz clic en "Analizar"

3. **Ver Resultados**
   - El sistema procesará la factura
   - Verás un análisis detallado con:
     - Datos extraídos
     - Comparación con tarifa oficial
     - Anomalías detectadas
     - Recomendaciones

### Entender los Resultados

#### Datos Extraídos
Información detectada en la factura:
- Proveedor y número de factura
- Consumo y tarifa aplicada
- Total facturado
- Período de facturación

#### Comparación de Tarifas
- **Tarifa Aplicada**: La que cobra el proveedor
- **Tarifa de Referencia**: La tarifa oficial actualizada
- **Diferencia**: Cuánto más/menos cobran

#### Anomalías
Se detectan automáticamente:
- 🔴 **Roja**: Problema grave (requiere acción)
- 🟡 **Amarilla**: Problema moderado (revisar)
- 🔵 **Azul**: Información (solo noticia)

#### Recomendaciones
Acciones sugeridas basadas en el análisis

### Dashboard

En el dashboard puedes ver:

1. **Estadísticas Generales**
   - Total de facturas analizadas
   - Ahorro estimado
   - Anomalías detectadas

2. **Gráficos de Consumo**
   - Consumo mensual por proveedor
   - Tendencias a lo largo del tiempo
   - Comparación histórica

3. **Distribución de Gastos**
   - Gasto por proveedor
   - Porcentaje del total
   - Variaciones mensuales

4. **Últimas Anomalías**
   - Problemas encontrados recientemente
   - Severidad de cada uno
   - Fecha de detección

5. **Recomendaciones**
   - Acciones personalizadas
   - Basadas en tu historial
   - Prioridades claras

## Preguntas Frecuentes

### ¿Es seguro subir mis facturas?
Sí. Tus facturas se almacenan de forma segura y solo tú tienes acceso.

### ¿Cuáles formatos de archivo acepta?
- PDF
- JPG
- PNG

### ¿Qué pasa si la factura no se lee bien?
El sistema usará OCR para extraer el texto. Si hay problemas, intenta:
- Tomar una foto con mejor iluminación
- Subir un PDF en lugar de imagen
- Asegurar que el texto de la factura sea legible

### ¿Cómo se calculan las tarifas de referencia?
Se actualizan automáticamente cada mes extrayendo datos de:
- Sitio web de Afinia (electricidad)
- Sitio web de Veolia (agua)
- Sitio web de Surtigas (gas)

### ¿Puedo cambiar mi contraseña?
Sí. En tu cuenta → Cambiar Contraseña

### ¿Cómo recibo notificaciones?
Por email. Configura en tu cuenta:
- Notificaciones habilitadas
- Canal de email
- Límite de alertas

## Consejos de Uso

1. **Analiza regularmente** - Una vez al mes es ideal
2. **Mantén copias** - Descarga tus análisis en PDF
3. **Verifica lecturas** - El medidor tiene la verdad
4. **Guarda evidencia** - Fotos de anomalías son útiles
5. **Contáctanos** - Ante dudas o problemas

## Soporte

¿Problemas? Contáctanos:
- Email: soporte@optifactura.co
- Teléfono: +57 5 000 0000
- Horario: Lunes a Viernes 8AM - 5PM

---

**¡Bienvenido a OptiFactura Montería!**
