-- Esquema de base de datos para Conexión Total Ingeniería
-- Ejecutar una vez en MySQL: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS conexion_total
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE conexion_total;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) DEFAULT NULL,
    google_id VARCHAR(255) DEFAULT NULL UNIQUE,
    profile_picture VARCHAR(255) DEFAULT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'usuario', -- 'usuario' | 'moderador' | 'administrador'
    email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    totp_secret VARCHAR(64) DEFAULT NULL,
    totp_habilitado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS facturas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    filename VARCHAR(255) DEFAULT NULL,
    numero_factura VARCHAR(50) DEFAULT NULL,
    monto DECIMAL(12,2) DEFAULT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- 'pendiente' | 'pagada' | 'anulada'
    fecha_factura DATE DEFAULT NULL,
    notas TEXT DEFAULT NULL,
    creada_por INT DEFAULT NULL,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (creada_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_facturas_estado ON facturas (estado);
CREATE INDEX idx_facturas_fecha_factura ON facturas (fecha_factura);
CREATE INDEX idx_facturas_numero_factura ON facturas (numero_factura);

CREATE TABLE IF NOT EXISTS mensajes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    email VARCHAR(120) NOT NULL,
    mensaje TEXT NOT NULL,
    leido BOOLEAN NOT NULL DEFAULT FALSE,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resenas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) DEFAULT 'Anónimo',
    comentario TEXT NOT NULL,
    calificacion TINYINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    aprobada BOOLEAN NOT NULL DEFAULT FALSE,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    imagen VARCHAR(255) DEFAULT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

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
-- Respaldo opcional de límite de envíos compartido entre workers.
-- Solo se usa si RATE_LIMIT_BACKEND=mysql en el .env (ver README.md).
-- Estas filas se pueden purgar periódicamente, no necesitan conservarse:
--   DELETE FROM intentos_seguridad WHERE creado_en < NOW() - INTERVAL 1 DAY;
