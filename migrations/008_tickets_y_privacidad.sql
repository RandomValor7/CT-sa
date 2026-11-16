-- Migración: tickets de soporte + herramientas de privacidad (Ley 1581).
--
-- Solo necesitas correr este archivo si tu base `nodalia` ya existía
-- ANTES de este cambio. Si la creas desde cero, schema.sql ya lo incluye.
--
--   "C:\xampp\mysql\bin\mysql.exe" -u root -p nodalia < migrations/008_tickets_y_privacidad.sql

CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    asunto VARCHAR(120) NOT NULL,
    descripcion TEXT NOT NULL,
    categoria VARCHAR(30) NOT NULL DEFAULT 'otro', -- 'factura' | 'servicio' | 'cuenta' | 'otro'
    estado VARCHAR(20) NOT NULL DEFAULT 'abierto', -- 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado'
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE INDEX idx_tickets_estado ON tickets (estado);
CREATE INDEX idx_tickets_usuario ON tickets (usuario_id);

CREATE TABLE IF NOT EXISTS ticket_respuestas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    autor_id INT DEFAULT NULL,
    autor_nombre VARCHAR(50) NOT NULL,
    mensaje TEXT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Constancia de aceptación de la política de datos y eliminación programada.
ALTER TABLE usuarios ADD COLUMN politica_aceptada_en DATETIME DEFAULT NULL;
ALTER TABLE usuarios ADD COLUMN politica_version VARCHAR(20) DEFAULT NULL;
ALTER TABLE usuarios ADD COLUMN eliminacion_programada_en DATETIME DEFAULT NULL;
