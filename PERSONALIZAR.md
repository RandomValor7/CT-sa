# Cómo personalizar este sitio para otra empresa

La empresa que trae el proyecto (**Nodalia Ingeniería S.A.S.**, Villa Aurora) es **ficticia**: nombre, NIT, teléfonos, correo (`.example`), dirección, clientes y zonas son inventados. Para entregarlo a un cliente real, cambia esto:

| Qué | Dónde |
|---|---|
| Nombre, NIT, dirección, teléfonos, correo, WhatsApp | `server/src/config.js` (bloque `empresa`) y `.env` (`EMPRESA_WHATSAPP`, `EMPRESA_EMAIL`) |
| Logo de la barra superior | `client/public/imagenes/logo.png` (letras claras sobre fondo transparente, proporción ~5:1) |
| Logo para redes (Open Graph) | `client/public/imagenes/logo.jpg` (1200×630) |
| Ícono de pestaña / producto por defecto | `client/public/imagenes/logee.png` |
| Íconos de la app instalable | `client/public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` |
| Nombre de la app instalable, colores | `client/public/manifest.webmanifest`, `client/public/offline.html`, `client/index.html` |
| Textos de inicio (titular, cobertura, clientes) | `client/src/pages/Inicio.jsx` |
| Quiénes somos, misión, visión, valores | `client/src/pages/Nosotros.jsx` |
| Servicios y zonas de cobertura | `client/src/pages/Servicios.jsx` + imágenes en `client/public/imagenes/` |
| Respuestas del chatbot | `client/src/components/Chatbot.jsx` |
| Títulos y descripciones para buscadores | `server/src/spa.js` y `client/src/App.jsx` |
| Nombre en el cuadro de 2FA | `server/src/lib/totp.js` |
| Colores de marca | variables al inicio de `client/src/styles/main.css` |
| Nombre de la base de datos | `.env` (`MYSQL_DB`), `schema.sql` y `migrations/` |

Después: `npm test`, `npm run build`, sube `client/public/sw.js` a una versión nueva (`VERSION`) para que los navegadores refresquen la caché.

**Antes de vender o publicar:** revisa con un abogado la política de privacidad y los textos legales, y verifica que el nombre que elijas para el cliente no choque con una marca registrada.
