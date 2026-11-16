import { borrarArchivo } from './uploads.js';

// Borra de forma definitiva a una persona y los archivos que subió.
// Las facturas, tickets y respuestas se eliminan en cascada por las llaves foráneas.
export async function eliminarCuentaDefinitiva(db, config, id) {
  const facturas = await db.query('SELECT filename FROM facturas WHERE usuario_id = ? AND filename IS NOT NULL', [id]);
  const usuario = await db.query('SELECT profile_picture FROM usuarios WHERE id = ?', [id]);
  await db.query('DELETE FROM usuarios WHERE id = ?', [id]);
  await Promise.all(facturas.map((f) => borrarArchivo(config.carpetas.facturas, f.filename)));
  await borrarArchivo(config.carpetas.uploads, usuario[0]?.profile_picture);
}

// Se ejecuta al arrancar y cada hora: borra las cuentas cuyo plazo de gracia ya venció.
export async function purgarCuentasVencidas(db, config, registro = console) {
  try {
    const filas = await db.query(
      "SELECT id FROM usuarios WHERE eliminacion_programada_en IS NOT NULL AND eliminacion_programada_en <= NOW() AND rol != 'administrador'",
    );
    for (const { id } of filas) {
      await eliminarCuentaDefinitiva(db, config, id);
      await db.query(
        'INSERT INTO logs_admin (admin_id, admin_nombre, accion, detalle) VALUES (NULL, ?, ?, ?)',
        ['sistema', 'eliminacion_cuenta_programada', `usuario #${id}`],
      );
    }
    return filas.length;
  } catch (err) {
    registro.error('No se pudo ejecutar la purga de cuentas:', err.code || err.message);
    return 0;
  }
}
