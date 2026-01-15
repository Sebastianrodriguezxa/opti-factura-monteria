# 🏢 OptiFactura Montería

**Sistema Inteligente de Análisis de Facturas de Servicios Públicos para Montería, Córdoba**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-blue.svg)](https://mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎯 ¿Qué es OptiFactura?

OptiFactura es una plataforma web que ayuda a los ciudadanos de Montería a:

- ✅ **Verificar** si sus facturas de servicios públicos están correctas
- 📊 **Analizar** consumos y tarifas aplicadas
- 💰 **Detectar** sobrecobros automáticamente
- 📈 **Comparar** con tarifas oficiales actualizadas
- 🔔 **Recibir** alertas de cambios en tarifas

### Proveedores Soportados
- **⚡ Afinia** (Energía eléctrica)
- **💧 Veolia** (Acueducto y alcantarillado)  
- **🔥 Surtigas** (Gas natural)

## 🚀 Características Principales

### 🤖 Análisis Inteligente
- **OCR avanzado** para extraer datos de facturas (PDF e imágenes)
- **Validación automática** contra tarifas oficiales
- **Detección de anomalías** en consumos y cobros
- **Recomendaciones personalizadas**

### 🕷️ Web Scraping Automático
- **Extracción diaria** de tarifas oficiales
- **Actualización automática** de base de datos
- **Monitoreo de cambios** en sitios web de proveedores
- **Capturas de pantalla** para evidencia

### 📊 Dashboard Interactivo
- **Gráficos en tiempo real** de consumos y gastos
- **Comparativas históricas** por período
- **Alertas visuales** de sobrecobros
- **Exportación de reportes** en PDF

### 🔐 Sistema Completo
- **Autenticación segura** con JWT
- **Roles de usuario** (Usuario/Administrador)
- **API REST** documentada
- **Base de datos robusta** con Prisma

## 📋 Requisitos del Sistema

### Mínimos
- **Node.js** 18.0+
- **MySQL** 8.0+
- **RAM** 2GB
- **Almacenamiento** 5GB

### Recomendados
- **Node.js** 20.0+
- **MySQL** 8.0+
- **RAM** 4GB
- **Almacenamiento** 10GB
- **SSD** para mejor rendimiento

## ⚡ Instalación Rápida

### 🎯 Opción 1: Script Automático (Recomendado)

\`\`\`bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/optifactura-monteria.git
cd optifactura-monteria

# 2. Ejecutar instalación automática
chmod +x start.sh
./start.sh

# 3. ¡Listo! Abrir http://localhost:3000
\`\`\`

### 🐳 Opción 2: Docker (Más Fácil)

\`\`\`bash
# 1. Clonar y configurar
git clone https://github.com/tu-usuario/optifactura-monteria.git
cd optifactura-monteria
cp .env.example .env

# 2. Ejecutar con Docker
docker-compose up -d

# 3. Ver logs
docker-compose logs -f app
\`\`\`

### 🔧 Opción 3: Manual (Control Total)

\`\`\`bash
# 1. Instalar dependencias
npm install

# 2. Configurar base de datos
mysql -u root -p
CREATE DATABASE optifactura_db;
CREATE USER 'optifactura'@'localhost' IDENTIFIED BY 'password123';
GRANT ALL PRIVILEGES ON optifactura_db.* TO 'optifactura'@'localhost';

# 3. Configurar variables
cp .env.example .env
# Editar .env con tus configuraciones

# 4. Configurar Prisma
npx prisma generate
npx prisma migrate dev
npm run seed

# 5. Iniciar aplicación
npm run dev
\`\`\`

## 🌐 URLs de Acceso

Una vez ejecutando:

- **🏠 Página Principal**: http://localhost:3000
- **📊 Dashboard**: http://localhost:3000/dashboard.html
- **🔍 Análisis**: http://localhost:3000/analizar.html
- **🔐 Login**: http://localhost:3000/login.html
- **📝 Registro**: http://localhost:3000/registro.html

## 👥 Usuarios de Prueba

### Administrador
- **Email**: admin@optifactura.co
- **Contraseña**: admin123
- **Permisos**: Completos

### Usuario Regular
- **Email**: test@optifactura.co
- **Contraseña**: test123
- **Permisos**: Básicos

## 📁 Estructura del Proyecto

\`\`\`
optifactura-monteria/
├── 📂 lib/                    # Librerías principales
│   ├── 🕷️ tarifas-scraper.js   # Web scraping
│   ├── 👁️ ocr/                 # Procesamiento OCR
│   └── 🧠 analysis/            # Motor de análisis
├── 📂 routes/                 # Rutas de la API
│   ├── 🌐 web.js              # Rutas web
│   ├── 🔐 auth.js             # Autenticación
│   └── 📡 api.js              # API REST
├── 📂 services/               # Servicios de negocio
│   ├── 📊 dashboard-service.js
│   ├── 📧 email-service.js
│   └── 🔔 notificaciones-service.js
├── 📂 public/                 # Archivos estáticos
│   ├── 🎨 css/                # Estilos
│   ├── ⚡ js/                 # JavaScript frontend
│   └── 🖼️ img/                # Imágenes
├── 📂 prisma/                 # Base de datos
│   ├── 📋 schema.prisma       # Esquema
│   └── 🔄 migrations/         # Migraciones
└── 📂 scripts/                # Scripts utilitarios
    ├── 🌱 seed.js             # Datos iniciales
    └── 💾 backup-db.js        # Backup automático
\`\`\`

## 🔧 Scripts Disponibles

### Desarrollo
\`\`\`bash
npm run dev          # Modo desarrollo con recarga automática
npm run test         # Ejecutar tests
npm run lint         # Verificar código
\`\`\`

### Base de Datos
\`\`\`bash
npm run prisma:studio    # Interfaz visual de BD
npm run prisma:migrate   # Ejecutar migraciones
npm run seed            # Poblar con datos de prueba
\`\`\`

### Scraping
\`\`\`bash
npm run test-scraper    # Probar extracción de tarifas
npm run scraper:run     # Ejecutar scraping manual
\`\`\`

### Producción
\`\`\`bash
npm start               # Modo producción
npm run backup          # Crear backup de BD
\`\`\`

## 🔍 Cómo Usar OptiFactura

### 1. 📝 Registro de Usuario
1. Ir a `/registro.html`
2. Completar formulario con datos personales
3. Verificar email (opcional)
4. Iniciar sesión

### 2. 📄 Subir Factura
1. Ir a `/analizar.html`
2. Seleccionar proveedor (Afinia/Veolia/Surtigas)
3. Subir archivo (PDF o imagen)
4. Especificar estrato socioeconómico
5. Hacer clic en "Analizar"

### 3. 📊 Ver Resultados
- **✅ Estado**: Correcto/Sobrecobro/Subcobro
- **💰 Diferencia**: Monto de diferencia encontrada
- **📈 Gráficos**: Comparativa visual
- **💡 Recomendaciones**: Acciones sugeridas

### 4. 📈 Dashboard
- **Resumen mensual** de facturas
- **Gráficos de consumo** histórico
- **Alertas activas** de sobrecobros
- **Estadísticas** por proveedor

## 🛠️ Configuración Avanzada

### Variables de Entorno (.env)

\`\`\`env
# 🗄️ Base de datos
DATABASE_URL="mysql://usuario:password@localhost:3306/optifactura_db"

# 🔐 Seguridad
JWT_SECRET="tu_clave_secreta_muy_segura"

# 📧 Email
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="tu_email@gmail.com"
EMAIL_PASS="tu_password_de_aplicacion"

# 🕷️ Scraping
SCRAPING_ENABLED=true
SCRAPING_INTERVAL="0 2 * * *"  # Diario a las 2 AM

# 📁 Archivos
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES="pdf,jpg,jpeg,png"
\`\`\`

### Configuración de Email

#### Gmail
1. Activar verificación en 2 pasos
2. Generar contraseña de aplicación
3. Usar contraseña de aplicación en `EMAIL_PASS`

#### Otros Proveedores
- **Outlook**: smtp-mail.outlook.com:587
- **Yahoo**: smtp.mail.yahoo.com:587

## 📡 API REST

### Endpoints Principales

\`\`\`bash
# 🔐 Autenticación
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout

# 📄 Facturas
POST /api/facturas/analizar
GET  /api/facturas/usuario/:id
GET  /api/facturas/:id

# 📊 Dashboard
GET  /api/dashboard/resumen
GET  /api/dashboard/graficos
GET  /api/dashboard/alertas

# 🕷️ Tarifas
GET  /api/tarifas/actuales
POST /api/tarifas/actualizar
\`\`\`

Ver documentación completa en `API.md`

## 🧪 Testing

### Ejecutar Tests
\`\`\`bash
# Todos los tests
npm test

# Tests unitarios
npm run test:unit

# Tests de integración
npm run test:integration

# Cobertura de código
npm run test:coverage
\`\`\`

### Probar Scraper
\`\`\`bash
# Probar extracción de todas las tarifas
npm run test-scraper

# Probar solo Afinia
node -e "const scraper = require('./lib/tarifas-scraper'); scraper.extraerTarifasAfinia()"
\`\`\`

## 🚀 Despliegue en Producción

### Con PM2 (Recomendado)
\`\`\`bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicación
pm2 start ecosystem.config.js

# Ver logs
pm2 logs optifactura

# Monitorear
pm2 monit
\`\`\`

### Con Docker
\`\`\`bash
# Construir imagen
docker build -t optifactura .

# Ejecutar contenedor
docker run -d -p 3000:3000 --name optifactura-app optifactura
\`\`\`

### En VPS/Servidor
1. Configurar nginx como proxy reverso
2. Configurar SSL con Let's Encrypt
3. Configurar backup automático
4. Configurar monitoreo

## 🔍 Monitoreo y Logs

### Ver Logs en Tiempo Real
\`\`\`bash
# Logs de aplicación
tail -f logs/app.log

# Logs de scraping
tail -f logs/scraping.log

# Logs de errores
tail -f logs/error.log
\`\`\`

### Métricas
- **Uptime**: Tiempo de actividad
- **Requests/min**: Solicitudes por minuto
- **Response time**: Tiempo de respuesta
- **Error rate**: Tasa de errores

## 🛡️ Seguridad

### Medidas Implementadas
- ✅ **Autenticación JWT** con expiración
- ✅ **Validación de entrada** en todos los endpoints
- ✅ **Sanitización** de archivos subidos
- ✅ **Rate limiting** para prevenir spam
- ✅ **CORS** configurado correctamente
- ✅ **Headers de seguridad** implementados

### Recomendaciones Adicionales
- 🔐 Usar HTTPS en producción
- 🔑 Rotar claves JWT regularmente
- 📊 Monitorear logs de seguridad
- 🛡️ Mantener dependencias actualizadas

## 🐛 Solución de Problemas

### Problemas Comunes

#### "Cannot find module"
\`\`\`bash
rm -rf node_modules package-lock.json
npm install
\`\`\`

#### Error de conexión a BD
\`\`\`bash
# Verificar MySQL
mysql -u root -p

# Verificar configuración
echo $DATABASE_URL
\`\`\`

#### Puppeteer no funciona
\`\`\`bash
# Linux: instalar dependencias
sudo apt-get install -y chromium-browser

# Configurar variable
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
\`\`\`

#### Puerto en uso
\`\`\`bash
# Cambiar puerto
export PORT=3001

# O liberar puerto 3000
sudo lsof -ti:3000 | xargs kill -9
\`\`\`

## 📞 Soporte y Contribución

### 🆘 Obtener Ayuda
1. **Documentación**: Revisar `INSTALACION.md` y `API.md`
2. **Logs**: Verificar archivos en `logs/`
3. **Issues**: Crear issue en GitHub
4. **Email**: contacto@optifactura.co

### 🤝 Contribuir
1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🙏 Agradecimientos

- **Ciudadanos de Montería** por inspirar este proyecto
- **Comunidad Open Source** por las herramientas utilizadas
- **Proveedores de servicios** por mantener información pública

---

**Desarrollado con ❤️ para Montería, Córdoba**

*OptiFactura - Transparencia en tus facturas de servicios públicos*

🌐 **Web**: https://optifactura.co  
📧 **Email**: contacto@optifactura.co  
📱 **WhatsApp**: +57 300 123 4567  
🐙 **GitHub**: https://github.com/optifactura/monteria
