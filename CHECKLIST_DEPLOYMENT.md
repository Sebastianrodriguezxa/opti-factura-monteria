# OptiFactura Montería - Checklist de Deployment

## Pre-Deployment

- [ ] Todas las funcionalidades completadas
- [ ] Código probado en local
- [ ] No hay errores en consola
- [ ] Base de datos sincronizada
- [ ] Variables de entorno configuradas
- [ ] Dependencias actualizadas

## Configuración de Base de Datos

- [ ] MySQL instalado y corriendo
- [ ] Base de datos "optifactura" creada
- [ ] Usuario de BD con permisos
- [ ] DATABASE_URL configurada correctamente
- [ ] Migraciones ejecutadas: `npx prisma migrate deploy`
- [ ] Seed de datos ejecutado: `npm run seed`

## Configuración de Archivos

- [ ] `.env` copiado desde `.env.example`
- [ ] NEXTAUTH_SECRET es único y seguro
- [ ] EMAIL_* configurados correctamente
- [ ] FRONTEND_URL apunta a dominio correcto
- [ ] PORT configurado si es necesario

## Dependencias

- [ ] `npm install` ejecutado sin errores
- [ ] `npm run prisma:generate` completado
- [ ] Todos los módulos instalados

## Pruebas Locales

- [ ] Servidor inicia correctamente
- [ ] Base de datos se conecta
- [ ] API responde en http://localhost:3000
- [ ] Páginas cargan correctamente
- [ ] Autenticación funciona
- [ ] Análisis de facturas funciona
- [ ] Dashboard muestra datos
- [ ] Notificaciones se envían

## Deployment

### Docker

- [ ] Docker instalado
- [ ] docker-compose.yml configurado
- [ ] Comando: `docker-compose up -d`
- [ ] Contenedor corre sin errores
- [ ] API accesible desde navegador
- [ ] BD está en contenedor separado

### Manual

- [ ] Node.js v18+ instalado
- [ ] npm instalado
- [ ] MySQL corriendo
- [ ] Comando: `npm start`
- [ ] Puerto 3000 abierto
- [ ] Firewall configurado

### Producción

- [ ] NODE_ENV=production en .env
- [ ] NEXTAUTH_SECRET cambiado
- [ ] SSL/HTTPS configurado
- [ ] Dominio apunta a servidor
- [ ] Backups automáticos configurados
- [ ] Logs centralizados
- [ ] Monitoreo habilitado

## Verificación Final

- [ ] http://localhost:3000 carga
- [ ] /login.html accesible
- [ ] /registro.html accesible
- [ ] /dashboard.html requiere autenticación
- [ ] API /auth/login responde
- [ ] API /api/tarifas requiere autenticación
- [ ] Seed users funcionan (admin/test)

## Post-Deployment

- [ ] Crear primer usuario admin
- [ ] Crear usuarios de prueba
- [ ] Probar flujo completo de análisis
- [ ] Verificar emails se envían
- [ ] Checkear logs por errores
- [ ] Documentar cambios realizados
- [ ] Notificar a usuarios

## Troubleshooting

### Error: Cannot find module
**Solución**: `npm install && npm run prisma:generate`

### Error: Connection refused (BD)
**Solución**: Verificar que MySQL corre y DATABASE_URL es correcto

### Error: Port 3000 already in use
**Solución**: `PORT=3001 npm start` o matar proceso: `lsof -ti:3000 | xargs kill -9`

### Error: Token inválido
**Solución**: Usar nuevo token o verificar NEXTAUTH_SECRET

### Error: OCR timeout
**Solución**: Aumentar OCR_TIMEOUT en .env

---

**Sistema listo para producción.**
