-- Migración: verificación en dos pasos (2FA) para admin/moderador,
-- registro de auditoría del panel de administración, y una tabla
-- opcional para compartir el límite de envíos entre varios workers.
--
-- Solo necesitas correr este archivo si tu base de datos `nodalia`
-- ya existía ANTES de este cambio. Si vas a crear la base de datos desde
-- cero, no necesitas esto: el schema.sql actualizado ya incluye todo.
--
--   "C:\xampp\mysql\bin\mysql.exe" -u root -p nodalia < migrations/006_2fa_auditoria_seguridad.sql

ALTER TABLE usuarios ADD COLUMN totp_secret VARCHAR(64) DEFAULT NULL;
ALTER TABLE usuarios ADD COLUMN totp_habilitado BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS logs_admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT DEFAULT NULL,
    admin_nombre VARCHAR(50) NOT NULL,
    accion VARCHAR(100) NOT NULL,
    detalle TEXT DEFAULT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS intentos_seguridad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    accion VARCHAR(50) NOT NULL,
    clave VARCHAR(120) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Nada de esto se activa solo: 2FA lo enciende cada usuario desde su
-- perfil, y el respaldo de rate-limit en MySQL solo se usa si pones
-- RATE_LIMIT_BACKEND=mysql en el .env. Sin esos pasos, el sitio sigue
-- funcionando exactamente igual que antes de correr esta migración.
