-- Migración: gestión completa de facturas (admin) + panel de cliente
-- ampliado. Agrega número de factura, monto, estado, fecha de la
-- factura, notas internas y quién la creó (cliente o administrador).
--
-- Solo necesitas correr este archivo si tu base de datos `nodalia`
-- ya existía ANTES de este cambio. Si vas a crear la base de datos desde
-- cero, no necesitas esto: el schema.sql actualizado ya incluye todo.
--
--   "C:\xampp\mysql\bin\mysql.exe" -u root -p nodalia < migrations/007_gestion_facturas.sql

ALTER TABLE facturas ADD COLUMN numero_factura VARCHAR(50) DEFAULT NULL;
ALTER TABLE facturas ADD COLUMN monto DECIMAL(12,2) DEFAULT NULL;
ALTER TABLE facturas ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'pendiente';
ALTER TABLE facturas ADD COLUMN fecha_factura DATE DEFAULT NULL;
ALTER TABLE facturas ADD COLUMN notas TEXT DEFAULT NULL;
ALTER TABLE facturas ADD COLUMN creada_por INT DEFAULT NULL;

-- El archivo ya no es obligatorio en el momento de crear el registro:
-- el administrador puede registrar una factura primero (con monto y
-- estado) y adjuntar el PDF/imagen después, editando el registro.
ALTER TABLE facturas MODIFY COLUMN filename VARCHAR(255) DEFAULT NULL;

ALTER TABLE facturas
    ADD CONSTRAINT fk_facturas_creada_por
    FOREIGN KEY (creada_por) REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE INDEX idx_facturas_estado ON facturas (estado);
CREATE INDEX idx_facturas_fecha_factura ON facturas (fecha_factura);
CREATE INDEX idx_facturas_numero_factura ON facturas (numero_factura);

-- 'estado' válidos por convención de la aplicación (no hay ENUM/CHECK
-- para no complicar futuras migraciones): 'pendiente' | 'pagada' | 'anulada'.
-- Las filas existentes quedan en 'pendiente' por el DEFAULT de arriba;
-- ajústalas manualmente si ya sabes cuáles están pagadas.
