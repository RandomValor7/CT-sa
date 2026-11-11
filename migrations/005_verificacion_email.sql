-- Migración: agrega verificación de correo al registrarse.
--
--   "C:\xampp\mysql\bin\mysql.exe" -u root -p conexion_total < migrations/005_verificacion_email.sql

ALTER TABLE usuarios ADD COLUMN email_verificado BOOLEAN NOT NULL DEFAULT FALSE;

-- Todas las cuentas que YA EXISTÍAN antes de correr esta migración quedan
-- marcadas como verificadas automáticamente (no tiene sentido pedirle a
-- alguien que ya usaba el sitio que de repente confirme un correo que
-- llevaba tiempo usando sin problema). Las cuentas nuevas, de aquí en
-- adelante, sí pasan por el flujo de verificación normal.
UPDATE usuarios SET email_verificado = TRUE WHERE fecha_registro < NOW();
