# Despliegue en Hostinger (Business o Cloud, Node.js)

## 1. Base de datos
1. hPanel > Bases de datos > crear base, usuario y contraseña.
2. phpMyAdmin > Importar > `schema.sql`.
3. Para llevar datos existentes: exportar con MySQL Workbench o `tools/backup_bd.sh` e importar en phpMyAdmin.

## 2. Aplicación
1. hPanel > Sitios web > Aplicación web Node.js; subir el ZIP o conectar el repositorio de GitHub.
2. Versión de Node: 20 o superior. Comando de compilación: `npm install && npm run build`. Archivo de inicio: `server/src/index.js`.
3. Variables de entorno (no subir `.env` al repositorio):
   - `NODE_ENV=production`
   - `BASE_URL=https://su-dominio.com`
   - `TRUST_PROXY=1` (obligatorio detrás del proxy de Hostinger; sin esto el límite de intentos usa la IP del proxy)
   - `FORCE_HTTPS=true`, `COOKIE_SECURE=true`
   - `SECRET_KEY` (nueva, larga y aleatoria)
   - `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DB`, `MYSQL_PORT` (los de hPanel)
   - `RATE_LIMIT_BACKEND=mysql`
   - `CSP_MODO=enforce`
   - `FACTURAS_FOLDER` en una ruta fuera de la carpeta pública, si es posible
   - correo, Google, Analytics y Turnstile como en `.env.example`
4. Activar SSL gratuito para el dominio.

## 3. Servicios externos
- Google Cloud: agregar como URI de redirección `https://su-dominio.com/login/google/callback`.
- Cloudflare Turnstile: agregar el dominio a la lista de dominios permitidos.
- Correo: usar una contraseña de aplicación nueva.

## 4. Antes de salir a producción
- Rotar la contraseña de aplicación de Gmail, el secreto de Google OAuth y la clave secreta de Turnstile expuestos durante el desarrollo.
- Cambiar las contraseñas de los usuarios de prueba (`admin@ct.co`, etc.) y crear el administrador real.
- Pasar las cuentas (Google, Cloudflare, Analytics, dominio) a nombre de la empresa.
- Revisión legal de la política de tratamiento de datos (Ley 1581 de 2012); la fecha de actualización en `client/src/pages/Privacidad.jsx` es fija.
- Probar: registro, verificación por correo, login, recuperación, 2FA, subida y descarga de facturas, panel de administración.

## Cambios de comportamiento respecto a Flask
- Desactivar 2FA exige un código vigente.
- Una cuenta sin verificar pierde su contraseña al entrar con Google.
- Cambiar el correo reinicia la verificación.
- Los cambios de rol aplican de inmediato.
