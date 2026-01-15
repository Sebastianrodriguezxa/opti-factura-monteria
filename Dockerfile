FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Configurar Puppeteer para usar Chromium instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci --only=production

# Generar cliente de Prisma
RUN npx prisma generate

# Copiar código fuente
COPY . .

# Crear directorios necesarios
RUN mkdir -p uploads datos_tarifas logs

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]
