# 🚀 Guía de Instalación - OptiFactura Montería

## Requisitos Previos

### Sistema Operativo
- Windows 10/11, macOS 10.15+, o Linux Ubuntu 18.04+

### Software Requerido
- **Node.js 18+** - [Descargar aquí](https://nodejs.org/)
- **MySQL 8.0+** - [Descargar aquí](https://dev.mysql.com/downloads/)
- **Git** - [Descargar aquí](https://git-scm.com/)

## 📦 Instalación Rápida

### Opción 1: Script Automático (Recomendado)

\`\`\`bash
# Clonar repositorio
git clone https://github.com/tu-usuario/optifactura-monteria.git
cd optifactura-monteria

# Ejecutar script de instalación
chmod +x start.sh
./start.sh
\`\`\`

### Opción 2: Instalación Manual

#### 1. Preparar el Proyecto
\`\`\`bash
# Clonar repositorio
git clone https://github.com/tu-usuario/optifactura-monteria.git
cd optifactura-monteria

# Instalar dependencias
npm install
\`\`\`

#### 2. Configurar Base de Datos
\`\`\`bash
# Crear base de datos en MySQL
mysql -u root -p
CREATE DATABASE optifactura_db;
CREATE USER 'optifactura'@'localhost' IDENTIFIED BY 'password123';
GRANT ALL PRIVILEGES ON optifactura_db.* TO 'optifactura'@'localhost';
FLUSH PRIVILEGES;
EXIT;
\`\`\`

#### 3. Configurar Variables de Entorno
\`\`\`bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus configuraciones
nano .env
\`\`\`

#### 4. Configurar Prisma
\`\`\`bash
# Generar cliente de Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# Poblar base de datos con datos de prueba
npm run seed
\`\`\`

#### 5. Iniciar Aplicación
\`\`\`bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
\`\`\`

## 🐳 Instalación con Docker

### Prerrequisitos
- Docker Desktop instalado
- Docker Compose instalado

### Pasos
\`\`\`bash
# Clonar repositorio
git clone https://github.com/tu-usuario/optifactura-monteria.git
cd optifactura-monteria

# Configurar variables de entorno
cp .env.example .env
# Editar .env según sea necesario

# Construir y ejecutar contenedores
docker-compose up -d

# Ver logs
docker-compose logs -f app
\`\`\`

## ⚙️ Configuración Detallada

### Variables de Entorno (.env)

\`\`\`env
# Base de datos
DATABASE_URL="mysql://optifactura:password123@localhost:3306/optifactura_db"

# JWT
JWT_SECRET="tu_jwt_secret_super_seguro_aqui"

# Email (Gmail)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="tu_email@gmail.com"
EMAIL_PASS="tu_password_de_aplicacion"

# Configuración de la aplicación
NODE_ENV="development"
PORT=3000

# Scraping
SCRAPING_ENABLED=true
SCRAPING_INTERVAL="0 2 * * *"  # Diario a las 2 AM

# Uploads
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES="pdf,jpg,jpeg,png"
\`\`\`

### Configuración de Email

#### Gmail
1. Habilitar autenticación de 2 factores
2. Generar contraseña de aplicación
3. Usar la contraseña de aplicación en `EMAIL_PASS`

#### Otros proveedores
- **Outlook**: smtp-mail.outlook.com:587
- **Yahoo**: smtp.mail.yahoo.com:587

## 🧪 Verificación de Instalación

### 1. Verificar Servicios
\`\`\`bash
# Verificar base de datos
npm run prisma:studio

# Probar scraper
npm run test-scraper

# Ejecutar tests
npm test
\`\`\`

### 2. Acceder a la Aplicación
- **Página principal**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard.html
- **Login**: http://localhost:3000/login.html

### 3. Usuarios de Prueba
- **Admin**: admin@optifactura.co / admin123
- **Usuario**: test@optifactura.co / test123

## 🔧 Solución de Problemas

### Error: "Cannot find module"
\`\`\`bash
# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
\`\`\`

### Error de Base de Datos
\`\`\`bash
# Verificar conexión
mysql -u optifactura -p optifactura_db

# Resetear migraciones
npx prisma migrate reset
\`\`\`

### Error de Puppeteer
\`\`\`bash
# En Linux, instalar dependencias
sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
\`\`\`

### Puertos en Uso
\`\`\`bash
# Cambiar puerto en .env
PORT=3001

# O matar proceso en puerto 3000
sudo lsof -ti:3000 | xargs kill -9
\`\`\`

## 📊 Monitoreo y Logs

### Ver Logs
\`\`\`bash
# Logs de aplicación
tail -f logs/app.log

# Logs de scraping
tail -f logs/scraping.log

# Logs de errores
tail -f logs/error.log
\`\`\`

### Métricas
- **Adminer**: http://localhost:8080 (con Docker)
- **Prisma Studio**: `npm run prisma:studio`

## 🔄 Actualizaciones

\`\`\`bash
# Obtener últimos cambios
git pull origin main

# Instalar nuevas dependencias
npm install

# Ejecutar migraciones
npx prisma migrate dev

# Reiniciar aplicación
npm restart
\`\`\`

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs en `logs/`
2. Verifica la configuración en `.env`
3. Consulta la documentación de la API en `API.md`
4. Crea un issue en GitHub

## 🎯 Próximos Pasos

Una vez instalado:

1. **Configurar proveedores** en el dashboard
2. **Subir primera factura** para análisis
3. **Configurar notificaciones** por email
4. **Programar scraping** automático
5. **Revisar reportes** generados

¡Listo! OptiFactura Montería está funcionando 🚀
