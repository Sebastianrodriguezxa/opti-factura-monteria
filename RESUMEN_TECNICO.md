# OptiFactura Montería - Resumen Técnico

## Descripción General

OptiFactura Montería es un sistema completo integrado para análisis inteligente de facturas de servicios públicos (electricidad, agua y gas) en Montería, Córdoba. 

## Arquitectura

### Stack Tecnológico
- **Backend**: Node.js + Express
- **Base de Datos**: MySQL con Prisma ORM
- **Web Scraping**: Puppeteer
- **OCR**: Tesseract.js
- **Autenticación**: JWT + bcrypt
- **Email**: Nodemailer
- **Scheduler**: node-cron
- **Frontend**: HTML5 + CSS3 + JavaScript vanilla

### Flujo de Datos

\`\`\`
Usuario
  ↓
Subir Factura (PDF/Imagen)
  ↓
OCR Extraction (Tesseract)
  ↓
Structured Data Extraction
  ↓
Obtener Tarifa de Referencia (BD)
  ↓
Análisis de Anomalías
  ↓
Guardar Resultado en BD
  ↓
Enviar Notificación por Email
  ↓
Mostrar en Dashboard
\`\`\`

### Componentes Principales

#### 1. **Servicio de Tarifas** (`services/tarifas-service.js`)
- Extrae tarifas de 3 proveedores
- Las actualiza automáticamente cada mes
- Almacena en BD
- Cachea en memoria

#### 2. **Servicio de Análisis** (`services/analisis-service.js`)
- Procesa facturas subidas
- Utiliza OCR para extracción
- Compara contra tarifas de referencia
- Detecta anomalías
- Genera recomendaciones

#### 3. **Servicio de Dashboard** (`services/dashboard-service.js`)
- Calcula estadísticas del usuario
- Genera gráficos de consumo
- Identifica tendencias
- Proporciona recomendaciones personalizadas

#### 4. **Motor de Análisis** (`lib/analysis/engine.js`)
- Compara tarifas
- Analiza consumo histórico
- Detecta inconsistencias
- Genera alertas

#### 5. **Procesador OCR** (`lib/ocr/processor.js`)
- Procesa PDFs
- Procesa imágenes
- Extrae texto
- Estructura datos

#### 6. **Scraper de Tarifas** (`lib/tarifas-scraper.js`)
- Extrae tarifas de sitios web
- Navega y parsea HTML
- Maneja errores automáticamente

## Base de Datos

### Tablas Principales
- `usuarios`: Información de usuarios
- `configuracion_usuarios`: Preferencias
- `actualizacion_tarifas`: Historial de actualizaciones
- `tarifa_referencia`: Tarifas por proveedor/estrato
- `subsidio_tarifa`: Subsidios por estrato
- `componente_tarifa`: Componentes de tarifa
- `analisis_factura`: Resultados de análisis

## API REST

### Endpoints Principales

#### Autenticación
- `POST /auth/registro` - Registrar usuario
- `POST /auth/login` - Login
- `GET /auth/verificar` - Verificar token
- `POST /auth/cambiar-password` - Cambiar contraseña

#### Tarifas
- `GET /api/tarifas` - Obtener todas las tarifas
- `GET /api/tarifas/:proveedor` - Obtener tarifa específica
- `POST /api/tarifas/actualizar` - Actualizar tarifas

#### Análisis
- `POST /api/analisis/factura` - Analizar factura (upload)
- `GET /api/analisis/historial` - Historial de análisis
- `GET /api/analisis/estadisticas` - Estadísticas de análisis

#### Dashboard
- `GET /api/dashboard` - Datos completos del dashboard
- `GET /api/dashboard/estadisticas` - Estadísticas generales
- `GET /api/dashboard/consumo-mensual` - Consumo mensual
- `GET /api/dashboard/distribucion-gastos` - Distribución
- `GET /api/dashboard/anomalias` - Últimas anomalías
- `GET /api/dashboard/comparacion-tarifas` - Comparación
- `GET /api/dashboard/recomendaciones` - Recomendaciones

## Funcionalidades de Detección

### Anomalías Detectadas
1. **Sobrecobro de tarifa** - Tarifa > 5% por encima de referencia
2. **Consumo alto** - Consumo > 30% del promedio
3. **Consumo bajo** - Consumo < 50% del promedio (posible error de lectura)
4. **Inconsistencia en cálculo** - Total ≠ consumo × tarifa
5. **Variaciones mensuales** - Cambios inusuales en patrones

### Recomendaciones Automáticas
- Verificar tarifas con proveedor
- Revisar posibles fugas
- Contactar al proveedor por anomalías
- Presentar reclamos formales
- Optimizar consumo

## Seguridad

- Contraseñas hasheadas con bcrypt
- Tokens JWT con expiración
- Validación de datos en todos los endpoints
- CORS configurado
- Manejo seguro de archivos
- Inyección SQL prevenida con Prisma

## Performance

- Caché en memoria de tarifas
- Índices en BD para queries frecuentes
- Paginación en endpoints de listado
- Compresión de respuestas JSON
- Conexión pooling a BD

## Deployment

### Local
\`\`\`bash
npm install
npx prisma migrate dev
npm run seed
npm run dev
\`\`\`

### Docker
\`\`\`bash
docker-compose up -d
\`\`\`

### Producción
- Usar `.env.production`
- Configurar JWT_SECRET seguro
- Usar certificados SSL
- Configurar backups automáticos
- Monitorear logs

## Monitoreo

- Logs en consola y archivos
- Errores detallados en desarrollo
- Alertas de anomalías del sistema
- Historial de updates de tarifas
- Tracking de análisis de usuarios

## Próximas Mejoras Sugeridas

1. Integración con APIs oficiales de tarifas
2. Machine Learning para detección de anomalías
3. App móvil
4. Integración con sistemas de reclamos
5. Reportes PDF personalizados
6. Comparativa con otros usuarios
7. Historial de reclamos
8. Estadísticas agregadas por región

---

**Sistema listo para usar en producción.**
