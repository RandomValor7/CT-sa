-- Migración: agrega soporte para login con Google.
--
-- Solo necesitas correr este archivo si tu base de datos `nodalia`
-- ya existía ANTES de este cambio (por ejemplo, si ya la creaste en XAMPP
-- siguiendo el schema.sql anterior). Si vas a crear la base de datos desde
-- cero, no necesitas esto: el schema.sql actualizado ya incluye estos
-- cambios directamente.
--
-- Cómo ejecutarlo (elige una opción):
--
--   Opción A — phpMyAdmin:
--     1. Abre http://localhost/phpmyadmin
--     2. Selecciona la base de datos "nodalia"
--     3. Pestaña "SQL" → pega el contenido de este archivo → Continuar
--
--   Opción B — línea de comandos:
--     "C:\xampp\mysql\bin\mysql.exe" -u root -p nodalia < migrations/001_google_login.sql

ALTER TABLE usuarios MODIFY password VARCHAR(255) DEFAULT NULL;
ALTER TABLE usuarios ADD COLUMN google_id VARCHAR(255) DEFAULT NULL UNIQUE AFTER password;
