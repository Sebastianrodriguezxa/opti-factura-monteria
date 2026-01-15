# API Documentation - OptiFactura Montería

## Autenticación

Todas las rutas de la API (excepto las de autenticación) requieren un token JWT en el header:

\`\`\`
Authorization: Bearer <token>
\`\`\`

## Endpoints de Autenticación

### POST /auth/registro
Registra un nuevo usuario.

**Body:**
\`\`\`json
{
  "nombre": "string",
  "apellido": "string", 
  "email": "string",
  "password": "string"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "usuario": { ... },
    "token": "jwt_token"
  }
}
\`\`\`

### POST /auth/login
Inicia sesión de usuario.

**Body:**
\`\`\`json
{
  "email": "string",
  "password": "string"
}
\`\`\`

### GET /auth/verificar
Verifica la validez del token JWT.

## Endpoints de Tarifas

### GET /api/tarifas
Obtiene todas las tarifas disponibles.

### GET /api/tarifas/:proveedor
Obtiene tarifas específicas de un proveedor.

**Parámetros:**
- `proveedor`: afinia, veolia, surtigas
- `estrato` (query): 1-6
- `tipoUsuario` (query): Residencial, Comercial, Industrial

### POST /api/tarifas/actualizar
Actualiza todas las tarifas mediante web scraping.

## Endpoints de Análisis

### POST /api/analisis/factura
Analiza una factura subida.

**Body:** FormData con:
- `factura`: archivo (JPG, PNG, PDF)
- `tipoServicio`: electricity, water, gas

### GET /api/analisis/historial
Obtiene el historial de análisis del usuario.

**Query params:**
- `proveedor`: filtrar por proveedor
- `fechaInicio`: fecha inicio (YYYY-MM-DD)
- `fechaFin`: fecha fin (YYYY-MM-DD)
- `limite`: número de resultados (default: 10)
- `pagina`: página (default: 1)

### GET /api/analisis/estadisticas
Obtiene estadísticas de consumo y gasto.

## Endpoints de Dashboard

### GET /api/dashboard
Obtiene todos los datos del dashboard.

### GET /api/dashboard/estadisticas
Obtiene estadísticas generales.

### GET /api/dashboard/consumo-mensual
Obtiene datos de consumo mensual.

### GET /api/dashboard/distribucion-gastos
Obtiene distribución de gastos por proveedor.

### GET /api/dashboard/anomalias
Obtiene últimas anomalías detectadas.

### GET /api/dashboard/recomendaciones
Obtiene recomendaciones personalizadas.

## Códigos de Estado

- `200`: Éxito
- `201`: Creado
- `400`: Error de validación
- `401`: No autorizado
- `404`: No encontrado
- `500`: Error interno del servidor

## Estructura de Respuesta

Todas las respuestas siguen esta estructura:

\`\`\`json
{
  "success": boolean,
  "message": "string",
  "data": object,
  "errors": array
}
