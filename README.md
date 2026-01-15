# OptiFactura Montería

Sistema integrado para análisis de facturas de servicios públicos en Montería.

## Descripción

OptiFactura Montería es una plataforma que permite a los usuarios analizar sus facturas de servicios públicos (electricidad, agua y gas) para detectar cobros excesivos, anomalías en el consumo y verificar que las tarifas aplicadas correspondan a las tarifas oficiales vigentes.

El sistema utiliza tecnologías de OCR (Reconocimiento Óptico de Caracteres) para extraer información de las facturas, web scraping para obtener las tarifas oficiales actualizadas de los proveedores de servicios públicos, y algoritmos de análisis para detectar anomalías y generar recomendaciones.

## Características principales

- Extracción automática de datos de facturas mediante OCR
- Actualización automática de tarifas oficiales mediante web scraping
- Análisis de facturas y detección de anomalías
- Comparación con datos históricos de consumo
- Generación de recomendaciones personalizadas
- Dashboard con estadísticas y gráficos
- Notificaciones por email sobre anomalías detectadas

## Tecnologías utilizadas

- Node.js y Express para el backend
- Prisma como ORM para la base de datos
- MySQL como base de datos
- Puppeteer para web scraping
- Tesseract.js para OCR
- Bootstrap para el frontend
- Chart.js para gráficos

## Instalación

1. Clona este repositorio:
   \`\`\`
   git clone https://github.com/tu-usuario/optifactura-monteria.git
   cd optifactura-monteria
   \`\`\`

2. Instala las dependencias:
   \`\`\`
   npm install
   \`\`\`

3. Copia el archivo `.env.example` a `.env` y configura las variables de entorno:
   \`\`\`
   cp .env.example .env
   \`\`\`

4. Genera los clientes de Prisma:
   \`\`\`
   npx prisma generate
   \`\`\`

5. Ejecuta las migraciones de la base de datos:
   \`\`\`
   npx prisma migrate dev
   \`\`\`

6. Inicia el servidor:
   \`\`\`
   npm run dev
   \`\`\`

## Estructura del proyecto

\`\`\`
optifactura-monteria/
├── index.js                # Punto de entrada principal
├── routes/                 # Rutas de la API y web
├── services/               # Servicios principales
├── lib/                    # Bibliotecas y utilidades
│   ├── analysis/           # Motor de análisis
│   ├── ocr/                # Procesamiento OCR
│   └── tarifas-scraper.js  # Scraper de tarifas
├── prisma/                 # Esquema y migraciones de Prisma
├── public/                 # Archivos estáticos
└── uploads/                # Directorio para archivos subidos
\`\`\`

## Uso

1. Accede a la aplicación en `http://localhost:3000`
2. Regístrate o inicia sesión
3. Sube una factura de servicios públicos
4. Espera a que el sistema procese y analice la factura
5. Revisa los resultados y recomendaciones

## Contribución

Las contribuciones son bienvenidas. Por favor, sigue estos pasos:

1. Haz fork del repositorio
2. Crea una rama para tu característica (`git checkout -b feature/amazing-feature`)
3. Haz commit de tus cambios (`git commit -m 'Add some amazing feature'`)
4. Haz push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## Contacto

Equipo OptiFactura - info@optifactura.co
