# Conexión Total — versión JavaScript

React (Vite) + Express + MySQL. Misma base de datos y mismas reglas de seguridad que la versión Flask.

## Requisitos
Node.js 20 o superior y MySQL 8 (o MariaDB 10.6+).

## Puesta en marcha local
1. `npm install`
2. Importar `schema.sql` en MySQL (MySQL Workbench: File > Run SQL Script).
3. Revisar `.env` (copiar de `.env.example` si no existe).
4. Desarrollo: `npm run dev:server` y en otra terminal `npm run dev:client` (http://localhost:5173).
5. Producción local: `npm run build` y `npm start` (http://localhost:5000).
6. Pruebas: `npm test`.

## Estructura
- `server/src`: API Express (`routes/`, `lib/`, `middleware.js`, `spa.js`).
- `client/src`: interfaz React.
- `storage/`: archivos subidos; las facturas nunca son públicas.
- `API.md`: contrato de la API. `migrations/`: cambios de esquema.

## Seguridad incluida
CSRF por cabecera, sesión en cookie httpOnly, usuario y rol leídos de la base en cada petición, 2FA TOTP, recuperación de contraseña de un solo uso, límite de intentos, validación de archivos por contenido, CSP sin scripts en línea, auditoría de acciones de administración y hashes compatibles con los de la versión Flask.
