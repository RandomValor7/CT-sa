-- Migración: agrega el panel de administración (mensajes de contacto,
-- moderación de reseñas).
--
-- Solo necesitas correr este archivo si tu base de datos `conexion_total`
-- ya existía ANTES de este cambio. Si vas a crear la base de datos desde
-- cero, no necesitas esto: el schema.sql actualizado ya incluye todo.
--
-- Cómo ejecutarlo (elige una opción):
--
--   Opción A — phpMyAdmin:
--     1. Abre http://localhost/phpmyadmin
--     2. Selecciona la base de datos "conexion_total"
--     3. Pestaña "SQL" → pega el contenido de este archivo → Continuar
--
--   Opción B — línea de comandos:
--     "C:\xampp\mysql\bin\mysql.exe" -u root -p conexion_total < migrations/002_panel_admin.sql

ALTER TABLE usuarios ADD COLUMN es_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE mensajes ADD COLUMN leido BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE resenas ADD COLUMN aprobada BOOLEAN NOT NULL DEFAULT FALSE;

-- Las reseñas que ya existían antes de este cambio se marcan como
-- aprobadas automáticamente (ya estaban públicas, no tiene sentido
-- ocultarlas ahora). Las reseñas nuevas, de aquí en adelante, quedan
-- pendientes de aprobación hasta que un administrador las revise.
UPDATE resenas SET aprobada = TRUE WHERE fecha < NOW();

-- IMPORTANTE: después de correr esta migración, tienes que convertir a
-- alguien en administrador manualmente (nadie lo es por defecto). Corre
-- esto reemplazando el correo por el de tu cuenta ya registrada:
--
--   UPDATE usuarios SET es_admin = TRUE WHERE email = 'tu-correo@ejemplo.com';
