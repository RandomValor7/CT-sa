-- Migración: reemplaza el simple "es_admin" (sí/no) por un sistema de
-- roles con tres niveles: 'usuario', 'moderador', 'administrador'.
--
-- Cómo ejecutarlo:
--   phpMyAdmin: base "conexion_total" → pestaña "SQL" → pega esto → Continuar
--   Línea de comandos:
--     "C:\xampp\mysql\bin\mysql.exe" -u root -p conexion_total < migrations/003_roles.sql

ALTER TABLE usuarios ADD COLUMN rol VARCHAR(20) NOT NULL DEFAULT 'usuario';

-- Si ya habías corrido migrations/002_panel_admin.sql (existe la columna
-- es_admin), esta línea traslada esos datos al nuevo sistema de roles.
-- Si NUNCA corriste esa migración anterior y esta línea te da un error de
-- "columna es_admin no existe", es normal — simplemente ignórala y sigue
-- con el siguiente paso.
UPDATE usuarios SET rol = 'administrador' WHERE es_admin = TRUE;

-- Opcional: una vez confirmes que todo quedó bien, puedes eliminar la
-- columna anterior (ya no se usa en el código):
-- ALTER TABLE usuarios DROP COLUMN es_admin;

-- IMPORTANTE: si esta es la primera vez que activas el panel de admin
-- (nunca corriste 002_panel_admin.sql), nadie es administrador todavía.
-- Conviértete en uno con:
--
--   UPDATE usuarios SET rol = 'administrador' WHERE email = 'tu-correo@ejemplo.com';
