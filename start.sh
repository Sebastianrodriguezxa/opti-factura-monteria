echo "🚀 Iniciando OptiFactura Montería..."

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js 18 o superior."
    exit 1
fi

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado. Por favor instala npm."
    exit 1
fi

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Verificar si existe el archivo .env
if [ ! -f ".env" ]; then
    echo "⚙️ Creando archivo de configuración..."
    cp .env.example .env
    echo "✅ Archivo .env creado. Por favor configura las variables de entorno."
fi

# Generar cliente de Prisma
echo "🔧 Generando cliente de Prisma..."
npx prisma generate

# Ejecutar migraciones
echo "🗄️ Ejecutando migraciones de base de datos..."
npx prisma migrate dev --name init

# Ejecutar seed
echo "🌱 Inicializando datos de ejemplo..."
npm run seed

# Iniciar servidor
echo "🌐 Iniciando servidor..."
npm run dev
