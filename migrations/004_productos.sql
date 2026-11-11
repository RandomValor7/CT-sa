-- Migración: agrega la tabla de productos (antes vivían hardcodeados en
-- static/js/productos.js; ahora los administradores los gestionan desde
-- el panel /admin/productos).
--
-- Cómo ejecutarlo:
--   "C:\xampp\mysql\bin\mysql.exe" -u root -p conexion_total < migrations/004_productos.sql

CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    imagen VARCHAR(255) DEFAULT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Nota: los productos que antes estaban en static/js/productos.js (fibra
-- óptica, switches PoE, CCTV, UPS, racks) NO se insertan automáticamente
-- aquí — tendrás que volver a agregarlos desde /admin/productos una vez
-- corras esta migración, esta vez usando el formulario en vez de código.
