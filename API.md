# Contrato de la API (Express) — Conexión Total

Todo es JSON salvo donde se indica. Prefijo `/api`. La sesión viaja en una cookie firmada
(`ct_sesion`, HttpOnly, SameSite=Lax). Toda petición que no sea GET/HEAD debe llevar el
encabezado `X-CSRF-Token` con el valor de `csrfToken` que entrega `GET /api/session`.
Las subidas de archivos son `multipart/form-data` (también con el encabezado CSRF).

Errores: `{ "message": "texto para mostrar", "errors": { "campo": "mensaje" } }` (errors es opcional).
Códigos: 400 validación, 401 sin sesión, 404 no encontrado / sin permiso de admin (las rutas
`/api/admin/*` responden 404 si el rol no alcanza), 403 CSRF inválido, 413 archivo grande, 429 límite de intentos.

Las páginas del frontend (React) usan estas rutas: `/`, `/servicios`, `/nosotros`, `/contacto`,
`/privacidad`, `/registro`, `/login`, `/login/verificar-2fa`, `/recuperar`, `/restablecer/:token`,
`/verificar/:token`, `/perfil`, `/perfil/editar`, `/perfil/2fa/activar`, `/mis-facturas`,
`/mis-facturas/:id`, `/admin`, `/admin/mensajes`, `/admin/resenas`, `/admin/usuarios`,
`/admin/productos`, `/admin/productos/nuevo`, `/admin/productos/:id/editar`, `/admin/facturas`,
`/admin/facturas/nueva`, `/admin/facturas/:id/editar`, `/admin/auditoria`.

URLs de imágenes que devuelve la API: fotos de perfil `/media/uploads/<archivo>`, productos
`/media/productos/<archivo>`; si no hay imagen: perfil `/imagenes/default.jpg`, producto `/imagenes/logee.png`.

## Sesión y configuración

`GET /api/session` →
```json
{
  "usuario": null,
  "csrfToken": "…",
  "config": {
    "googleDisponible": true,
    "turnstileSiteKey": "…|null",
    "googleAnalyticsId": "G-…|null",
    "empresa": { "nombre": "", "whatsapp": "", "email": "", "direccion": "", "telefonos": "", "nit": "" }
  }
}
```
Cuando hay sesión, `usuario` es `{ id, nombre, email, rol, foto_perfil, email_verificado, totp_habilitado }`
(`rol`: `usuario` | `moderador` | `administrador`). Se vuelve a pedir tras login, logout y 2FA
porque el token CSRF cambia al iniciar o cerrar sesión.

## Público

- `GET /api/home` → `{ resenas: [{nombre, comentario, calificacion, fecha}], productos: [{nombre, descripcion, imagen}] }`
- `POST /api/contacto` `{nombre, email, mensaje, "cf-turnstile-response"}` →
  201 `{status:"success", message}`; 400 `{status:"error", message, errors}`; 429 `{status:"error", message}`.
  Reglas: nombre 3–50, email válido, mensaje 10–2000.
- `POST /api/resenas` `{nombre?, comentario, calificacion, "cf-turnstile-response"}` →
  201 `{message}`; 400; 429. Reglas: nombre ≤100, comentario 5–1000, calificacion 1–5.
- `GET /sitemap.xml`, `GET /robots.txt` (no JSON).

## Autenticación

- `POST /api/auth/registro` `{nombre, email, password, acepto_politica}` → 201 `{message}`; 400 con `errors`.
  Reglas: nombre 3–50, email válido, password ≥6 con al menos una letra y un número, acepto_politica verdadero.
- `POST /api/auth/login` `{email, password}` → 200 `{usuario, csrfToken}`; o 200 `{requiere2fa:true, csrfToken}` si la cuenta
  tiene 2FA; 401 `{message}`; 429. `csrfToken` es el token nuevo (cambia al iniciar sesión).
- `POST /api/auth/2fa/verificar` `{codigo}` → 200 `{usuario, csrfToken}`; 400 `{message}`; 429.
- `POST /api/auth/logout` → 200 `{message, csrfToken}`.
- `POST /api/auth/verificar-email` `{token}` → 200 `{message}`; 400 `{message}`.
- `POST /api/auth/reenviar-verificacion` (con sesión) → 200 `{message}`; 502 si no se pudo enviar el correo.
- `POST /api/auth/recuperar` `{email}` → 200 `{message}` (respuesta genérica); 429.
- `GET /api/auth/restablecer/:token` → 200 `{valido:true}`; 400 `{message}`.
- `POST /api/auth/restablecer` `{token, password, confirmar_password}` → 200 `{message}`; 400.
- `GET /login/google` → redirección del navegador a Google (enlace `<a href>`, no fetch). Callback en
  `/login/google/callback`; termina redirigiendo a `/perfil` (éxito), `/login/verificar-2fa` (si hay 2FA) o
  `/login?error=<mensaje>`.

## Perfil (requiere sesión; si no, 401)

- `GET /api/perfil` → `{ usuario:{nombre,email,foto_perfil,email_verificado,totp_habilitado}, facturas:[Factura], totalFacturas }`
- `PUT /api/perfil` `{nombre, email}` → `{usuario}`; 400 con `errors`.
- `POST /api/perfil/foto` (multipart `profile_picture`) → `{foto_perfil, message}`.
- `POST /api/perfil/facturas` (multipart `factura`) → 201 `{message}`.
- `GET /api/perfil/facturas/:id/descargar` → archivo (descarga). Solo del dueño.
- `GET /api/mis-facturas?pagina=1&estado=` → `{ items:[Factura], pagina, totalPaginas, total, estados:[{valor,etiqueta}] }`
- `GET /api/mis-facturas/:id` → `{ factura: Factura }` (incluye `notas`); 404 si no es suya.
- `POST /api/perfil/2fa/iniciar` → `{ secreto, otpauthUri }` (guarda el secreto pendiente en la sesión).
- `POST /api/perfil/2fa/activar` `{codigo}` → `{message}`; 400.
- `POST /api/perfil/2fa/desactivar` `{codigo}` → `{message}`; 400 si el código de la app autenticadora no es válido.

`Factura` = `{ id, numero_factura, monto, estado, fecha_factura, fecha_subida, notas?,
tieneArchivo, usuario_id?, usuario_nombre?, usuario_email? }`. `estado`: `pendiente` | `pagada` | `anulada`.
`monto` viene como número o null; las fechas como texto: `2026-10-21` (fecha_factura) y `2026-10-21 15:04:05` (marcas de tiempo).

## Administración (prefijo `/api/admin`)

Moderador o administrador: dashboard, mensajes, reseñas. Solo administrador: usuarios, productos, facturas, auditoría.
Las listas devuelven `{ items, pagina, totalPaginas, total }` y aceptan `?pagina=`.

- `GET /dashboard` → `{ mensajesSinLeer, resenasPendientes, statsAdmin: null | {totalUsuarios,totalFacturas,totalMensajes,totalResenasPublicadas,totalProductos} }`
- `GET /mensajes` items `{id,nombre,email,mensaje,leido,fecha}`; `GET /mensajes/exportar.csv`;
  `POST /mensajes/:id/marcar-leido`; `DELETE /mensajes/:id`.
- `GET /resenas` items `{id,nombre,comentario,calificacion,aprobada,fecha}`;
  `POST /resenas/:id/aprobar`; `POST /resenas/:id/ocultar`; `DELETE /resenas/:id`.
- `GET /usuarios` items `{id,nombre,email,rol,google_id,fecha_registro}` (`google_id` es `true` o `null`) + `roles`; `GET /usuarios/exportar.csv`;
  `POST /usuarios/:id/rol` `{rol}`; `DELETE /usuarios/:id`. Un admin no puede quitarse su rol ni borrarse a sí mismo (400).
- `GET /productos` items `{id,nombre,descripcion,imagen,activo}` (imagen ya como URL);
  `GET /productos/:id`; `POST /productos` y `PUT /productos/:id` (multipart: `nombre`, `descripcion`, `imagen?`);
  `POST /productos/:id/activar`; `POST /productos/:id/desactivar`; `DELETE /productos/:id`.
  Reglas: nombre 2–100, descripcion 10–1000.
- `GET /auditoria` items `{id,admin_nombre,accion,detalle,fecha}` (20 por página).
- `GET /facturas?usuario_id=&estado=&fecha_desde=&fecha_hasta=&pagina=` →
  `{ items:[Factura con usuario_*], pagina, totalPaginas, total, filtros, usuarios:[{id,etiqueta}], estados:[{valor,etiqueta}] }`
- `GET /facturas/formulario` → `{ usuarios:[{id,etiqueta}], estados:[{valor,etiqueta}] }`
- `GET /facturas/exportar.csv` (mismos filtros); `GET /facturas/:id` → `{ factura }`;
  `POST /facturas` y `PUT /facturas/:id` (multipart: `usuario_id`, `numero_factura?`, `monto?`, `estado`,
  `fecha_factura?` (AAAA-MM-DD), `notas?`, `archivo?`); `POST /facturas/:id/estado` `{estado}`;
  `GET /facturas/:id/descargar` (archivo); `DELETE /facturas/:id`.
  Reglas: numero_factura ≤50, monto ≥0, estado válido, notas ≤1000.

Las respuestas de acciones (POST/DELETE) devuelven `{ message }` para mostrar como aviso.
