import {
  envolver, adminOModerador, soloAdministrador, auditar,
} from '../middleware.js';
import {
  validarProducto, validarFactura, ROLES_VALIDOS, ESTADOS_FACTURA_VALIDOS, texto,
} from '../lib/validate.js';
import { generarCsv } from '../lib/csv.js';
import { inicioVentana, rellenarMeses, rellenarCalificaciones, rellenarEstados } from '../lib/estadisticas.js';
import { guardarArchivo, borrarArchivo, rutaSegura, recibirArchivo, EXT_IMAGENES, EXT_FACTURAS } from '../lib/uploads.js';
import {
  facturaPublica, estadosParaCliente, paginar, entero,
} from './comun.js';
import { urlProducto } from './publico.js';

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function enviarCsv(res, nombreArchivo, contenido) {
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename=${nombreArchivo}`,
    'Cache-Control': 'no-store',
  });
  res.send(contenido);
}

function filtrosFacturas(consulta) {
  const usuarioId = texto(consulta.usuario_id);
  const estado = texto(consulta.estado);
  const desde = texto(consulta.fecha_desde);
  const hasta = texto(consulta.fecha_hasta);
  const condiciones = [];
  const params = [];
  if (/^\d+$/.test(usuarioId)) { condiciones.push('f.usuario_id = ?'); params.push(Number(usuarioId)); }
  if (ESTADOS_FACTURA_VALIDOS.has(estado)) { condiciones.push('f.estado = ?'); params.push(estado); }
  if (FECHA_RE.test(desde)) { condiciones.push('f.fecha_factura >= ?'); params.push(desde); }
  if (FECHA_RE.test(hasta)) { condiciones.push('f.fecha_factura <= ?'); params.push(hasta); }
  return {
    where: condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '',
    params,
    filtros: { usuario_id: usuarioId, estado, fecha_desde: desde, fecha_hasta: hasta },
  };
}

const SELECT_FACTURA_ADMIN = 'SELECT f.id, f.numero_factura, f.monto, f.estado, f.fecha_factura, f.fecha_subida, '
  + 'f.filename, f.notas, u.id AS usuario_id, u.nombre AS usuario_nombre, u.email AS usuario_email '
  + 'FROM facturas f JOIN usuarios u ON f.usuario_id = u.id';

export function montar(router, { config, db, subida = recibirArchivo }) {
  const aud = (req, accion, detalle) => auditar(db, req, accion, detalle);
  const noEncontrado = (res) => res.status(404).json({ message: 'No encontrado.' });
  const porPagina = config.itemsPorPagina;

  router.get('/api/admin/dashboard', adminOModerador, envolver(async (req, res) => {
    const contar = async (sql) => Number((await db.query(sql))[0]?.total ?? 0);
    const mensajesSinLeer = await contar('SELECT COUNT(*) AS total FROM mensajes WHERE leido = FALSE');
    const resenasPendientes = await contar('SELECT COUNT(*) AS total FROM resenas WHERE aprobada = FALSE');
    let statsAdmin = null;
    if (req.usuario.rol === 'administrador') {
      statsAdmin = {
        totalUsuarios: await contar('SELECT COUNT(*) AS total FROM usuarios'),
        totalFacturas: await contar('SELECT COUNT(*) AS total FROM facturas'),
        totalMensajes: await contar('SELECT COUNT(*) AS total FROM mensajes'),
        totalResenasPublicadas: await contar('SELECT COUNT(*) AS total FROM resenas WHERE aprobada = TRUE'),
        totalProductos: await contar('SELECT COUNT(*) AS total FROM productos'),
      };
    }
    res.json({ mensajesSinLeer, resenasPendientes, statsAdmin });
  }));

  router.get('/api/admin/estadisticas', soloAdministrador, envolver(async (req, res) => {
    const meses = 6;
    const desde = inicioVentana(meses);
    const [mensajes, resenas, facturas, roles] = await Promise.all([
      db.query("SELECT DATE_FORMAT(fecha, '%Y-%m') AS mes, COUNT(*) AS total FROM mensajes WHERE fecha >= ? GROUP BY mes", [desde]),
      db.query('SELECT calificacion, COUNT(*) AS total FROM resenas WHERE aprobada = TRUE GROUP BY calificacion'),
      db.query('SELECT estado, COUNT(*) AS total, COALESCE(SUM(monto), 0) AS suma FROM facturas GROUP BY estado'),
      db.query('SELECT rol, COUNT(*) AS total FROM usuarios GROUP BY rol'),
    ]);
    res.json({
      mensajesPorMes: rellenarMeses(mensajes, meses),
      resenasPorCalificacion: rellenarCalificaciones(resenas),
      facturasPorEstado: rellenarEstados(facturas),
      usuariosPorRol: roles.map((r) => ({ rol: String(r.rol), total: Number(r.total) })),
    });
  }));

  router.get('/api/admin/mensajes/exportar.csv', adminOModerador, envolver(async (req, res) => {
    const filas = await db.query('SELECT nombre, email, mensaje, leido, fecha FROM mensajes ORDER BY fecha DESC');
    await aud(req, 'exportar_mensajes_csv');
    enviarCsv(res, 'mensajes_conexion_total.csv', generarCsv(
      ['Nombre', 'Correo', 'Mensaje', 'Leído', 'Fecha'],
      filas.map((m) => [m.nombre, m.email, m.mensaje, m.leido ? 'Sí' : 'No', m.fecha]),
    ));
  }));

  router.get('/api/admin/mensajes', adminOModerador, envolver(async (req, res) => {
    const datos = await paginar(db, {
      contar: { sql: 'SELECT COUNT(*) AS total FROM mensajes' },
      listar: { sql: 'SELECT id, nombre, email, mensaje, leido, fecha FROM mensajes ORDER BY fecha DESC LIMIT ? OFFSET ?' },
      pagina: req.query.pagina,
      porPagina,
    });
    res.json({ ...datos, items: datos.items.map((m) => ({ ...m, leido: Boolean(m.leido) })) });
  }));

  router.post('/api/admin/mensajes/:id/marcar-leido', adminOModerador, envolver(async (req, res) => {
    const id = entero(req.params.id);
    if (!id) return noEncontrado(res);
    await db.query('UPDATE mensajes SET leido = TRUE WHERE id = ?', [id]);
    return res.json({ message: 'Mensaje marcado como leído.' });
  }));

  router.delete('/api/admin/mensajes/:id', adminOModerador, envolver(async (req, res) => {
    const id = entero(req.params.id);
    if (!id) return noEncontrado(res);
    await db.query('DELETE FROM mensajes WHERE id = ?', [id]);
    await aud(req, 'eliminar_mensaje', `mensaje #${id}`);
    return res.json({ message: 'Mensaje eliminado.' });
  }));

  router.get('/api/admin/resenas', adminOModerador, envolver(async (req, res) => {
    const datos = await paginar(db, {
      contar: { sql: 'SELECT COUNT(*) AS total FROM resenas' },
      listar: {
        sql: 'SELECT id, nombre, comentario, calificacion, aprobada, fecha FROM resenas '
          + 'ORDER BY aprobada ASC, fecha DESC LIMIT ? OFFSET ?',
      },
      pagina: req.query.pagina,
      porPagina,
    });
    res.json({ ...datos, items: datos.items.map((r) => ({ ...r, aprobada: Boolean(r.aprobada) })) });
  }));

  const cambiarResena = (accion, aprobada, mensaje) => envolver(async (req, res) => {
    const id = entero(req.params.id);
    if (!id) return noEncontrado(res);
    await db.query('UPDATE resenas SET aprobada = ? WHERE id = ?', [aprobada, id]);
    await aud(req, accion, `reseña #${id}`);
    return res.json({ message: mensaje });
  });
  router.post('/api/admin/resenas/:id/aprobar', adminOModerador, cambiarResena('aprobar_resena', true, 'Reseña aprobada y publicada.'));
  router.post('/api/admin/resenas/:id/ocultar', adminOModerador, cambiarResena('ocultar_resena', false, 'Reseña ocultada de la página pública.'));

  router.delete('/api/admin/resenas/:id', adminOModerador, envolver(async (req, res) => {
    const id = entero(req.params.id);
    if (!id) return noEncontrado(res);
    await db.query('DELETE FROM resenas WHERE id = ?', [id]);
    await aud(req, 'eliminar_resena', `reseña #${id}`);
    return res.json({ message: 'Reseña eliminada.' });
  }));

  router.get('/api/admin/usuarios/exportar.csv', soloAdministrador, envolver(async (req, res) => {
    const filas = await db.query('SELECT nombre, email, rol, fecha_registro FROM usuarios ORDER BY fecha_registro DESC');
    await aud(req, 'exportar_usuarios_csv');
    enviarCsv(res, 'usuarios_conexion_total.csv', generarCsv(
      ['Nombre', 'Correo', 'Rol', 'Fecha de registro'],
      filas.map((u) => [u.nombre, u.email, u.rol, u.fecha_registro]),
    ));
  }));

  router.get('/api/admin/usuarios', soloAdministrador, envolver(async (req, res) => {
    const datos = await paginar(db, {
      contar: { sql: 'SELECT COUNT(*) AS total FROM usuarios' },
      listar: {
        sql: 'SELECT id, nombre, email, rol, google_id, fecha_registro FROM usuarios '
          + 'ORDER BY fecha_registro DESC, id DESC LIMIT ? OFFSET ?',
      },
      pagina: req.query.pagina,
      porPagina,
    });
    res.json({
      ...datos,
      items: datos.items.map((u) => ({ ...u, google_id: u.google_id ? true : null })),
      roles: ROLES_VALIDOS,
    });
  }));

  router.post('/api/admin/usuarios/:id/rol', soloAdministrador, envolver(async (req, res) => {
    const id = entero(req.params.id);
    const rol = texto(req.body?.rol);
    if (!id) return noEncontrado(res);
    if (!ROLES_VALIDOS.includes(rol)) return res.status(400).json({ message: 'Rol no válido.' });
    if (id === req.usuario.id && rol !== 'administrador') {
      return res.status(400).json({ message: 'No puedes quitarte a ti mismo el rol de administrador.' });
    }
    await db.query('UPDATE usuarios SET rol = ? WHERE id = ?', [rol, id]);
    await aud(req, 'cambiar_rol', `usuario #${id} → ${rol}`);
    return res.json({ message: 'Rol actualizado correctamente.' });
  }));

  router.delete('/api/admin/usuarios/:id', soloAdministrador, envolver(async (req, res) => {
    const id = entero(req.params.id);
    if (!id) return noEncontrado(res);
    if (id === req.usuario.id) return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta desde aquí.' });
    const facturas = await db.query('SELECT filename FROM facturas WHERE usuario_id = ? AND filename IS NOT NULL', [id]);
    const usuario = await db.query('SELECT profile_picture FROM usuarios WHERE id = ?', [id]);
    await db.query('DELETE FROM usuarios WHERE id = ?', [id]);
    await Promise.all(facturas.map((f) => borrarArchivo(config.carpetas.facturas, f.filename)));
    await borrarArchivo(config.carpetas.uploads, usuario[0]?.profile_picture);
    await aud(req, 'eliminar_usuario', `usuario #${id}`);
    return res.json({ message: 'Usuario eliminado.' });
  }));

  const productoPublico = (p) => ({
    id: p.id, nombre: p.nombre, descripcion: p.descripcion, imagen: urlProducto(p.imagen), activo: Boolean(p.activo),
  });

  router.get('/api/admin/productos', soloAdministrador, envolver(async (req, res) => {
    const datos = await paginar(db, {
      contar: { sql: 'SELECT COUNT(*) AS total FROM productos' },
      listar: { sql: 'SELECT id, nombre, descripcion, imagen, activo FROM productos ORDER BY nombre ASC LIMIT ? OFFSET ?' },
      pagina: req.query.pagina,
      porPagina,
    });
    res.json({ ...datos, items: datos.items.map(productoPublico) });
  }));

  router.get('/api/admin/productos/:id', soloAdministrador, envolver(async (req, res) => {
    const id = entero(req.params.id);
    const filas = id ? await db.query('SELECT id, nombre, descripcion, imagen, activo FROM productos WHERE id = ?', [id]) : [];
    if (!filas[0]) return noEncontrado(res);
    return res.json({ producto: productoPublico(filas[0]) });
  }));

  router.post('/api/admin/productos', soloAdministrador, subida('imagen'), envolver(async (req, res) => {
    const { datos, errores } = validarProducto(req.body);
    if (errores) return res.status(400).json({ message: 'Revisa los campos del formulario.', errors: errores });
    const imagen = req.file
      ? await guardarArchivo(req.file, config.carpetas.productos, EXT_IMAGENES, { comprimir: true, anchoMaximo: 900 })
      : null;
    await db.query('INSERT INTO productos (nombre, descripcion, imagen) VALUES (?, ?, ?)', [datos.nombre, datos.descripcion, imagen]);
    await aud(req, 'crear_producto', datos.nombre);
    return res.status(201).json({ message: 'Producto creado correctamente.' });
  }));

  router.put('/api/admin/productos/:id', soloAdministrador, subida('imagen'), envolver(async (req, res) => {
    const id = entero(req.params.id);
    const filas = id ? await db.query('SELECT imagen FROM productos WHERE id = ?', [id]) : [];
    if (!filas[0]) return noEncontrado(res);
    const { datos, errores } = validarProducto(req.body);
    if (errores) return res.status(400).json({ message: 'Revisa los campos del formulario.', errors: errores });
    let imagen = filas[0].imagen;
    if (req.file) {
      imagen = await guardarArchivo(req.file, config.carpetas.productos, EXT_IMAGENES, { comprimir: true, anchoMaximo: 900 });
    }
    await db.query('UPDATE productos SET nombre = ?, descripcion = ?, imagen = ? WHERE id = ?', [datos.nombre, datos.descripcion, imagen, id]);
    if (req.file) await borrarArchivo(config.carpetas.productos, filas[0].imagen);
    await aud(req, 'editar_producto', `producto #${id}: ${datos.nombre}`);
    return res.json({ message: 'Producto actualizado correctamente.' });
  }));

  const cambiarProducto = (accion, activo, mensaje) => envolver(async (req, res) => {
    const id = entero(req.params.id);
    if (!id) return noEncontrado(res);
    await db.query('UPDATE productos SET activo = ? WHERE id = ?', [activo, id]);
    await aud(req, accion, `producto #${id}`);
    return res.json({ message: mensaje });
  });
  router.post('/api/admin/productos/:id/activar', soloAdministrador, cambiarProducto('activar_producto', true, 'Producto visible en el sitio nuevamente.'));
  router.post('/api/admin/productos/:id/desactivar', soloAdministrador, cambiarProducto('desactivar_producto', false, 'Producto oculto del sitio (no se eliminó, solo se ocultó).'));

  router.delete('/api/admin/productos/:id', soloAdministrador, envolver(async (req, res) => {
    const id = entero(req.params.id);
    if (!id) return noEncontrado(res);
    const filas = await db.query('SELECT imagen FROM productos WHERE id = ?', [id]);
    await db.query('DELETE FROM productos WHERE id = ?', [id]);
    await borrarArchivo(config.carpetas.productos, filas[0]?.imagen);
    await aud(req, 'eliminar_producto', `producto #${id}`);
    return res.json({ message: 'Producto eliminado permanentemente.' });
  }));

  router.get('/api/admin/auditoria', soloAdministrador, envolver(async (req, res) => {
    const datos = await paginar(db, {
      contar: { sql: 'SELECT COUNT(*) AS total FROM logs_admin' },
      listar: { sql: 'SELECT id, admin_nombre, accion, detalle, fecha FROM logs_admin ORDER BY fecha DESC, id DESC LIMIT ? OFFSET ?' },
      pagina: req.query.pagina,
      porPagina: 20,
    });
    res.json(datos);
  }));

  async function opcionesUsuarios() {
    const filas = await db.query('SELECT id, nombre, email FROM usuarios ORDER BY nombre ASC');
    return filas.map((u) => ({ id: u.id, etiqueta: `${u.nombre} (${u.email})` }));
  }

  router.get('/api/admin/facturas/formulario', soloAdministrador, envolver(async (req, res) => {
    res.json({ usuarios: await opcionesUsuarios(), estados: estadosParaCliente() });
  }));

  router.get('/api/admin/facturas/exportar.csv', soloAdministrador, envolver(async (req, res) => {
    const { where, params } = filtrosFacturas(req.query);
    const filas = await db.query(
      'SELECT f.numero_factura, u.nombre AS usuario_nombre, u.email AS usuario_email, f.monto, f.estado, '
        + 'f.fecha_factura, f.fecha_subida FROM facturas f JOIN usuarios u ON f.usuario_id = u.id '
        + `${where} ORDER BY f.fecha_subida DESC`,
      params,
    );
    await aud(req, 'exportar_facturas_csv');
    enviarCsv(res, 'facturas_conexion_total.csv', generarCsv(
      ['Número', 'Cliente', 'Correo', 'Monto', 'Estado', 'Fecha factura', 'Fecha de subida'],
      filas.map((f) => [f.numero_factura ?? '', f.usuario_nombre, f.usuario_email, f.monto ?? '', f.estado, f.fecha_factura ?? '', f.fecha_subida]),
    ));
  }));

  router.get('/api/admin/facturas', soloAdministrador, envolver(async (req, res) => {
    const { where, params, filtros } = filtrosFacturas(req.query);
    const datos = await paginar(db, {
      contar: { sql: `SELECT COUNT(*) AS total FROM facturas f ${where}`, params },
      listar: { sql: `${SELECT_FACTURA_ADMIN} ${where} ORDER BY f.fecha_subida DESC, f.id DESC LIMIT ? OFFSET ?`, params },
      pagina: req.query.pagina,
      porPagina,
    });
    res.json({
      ...datos,
      items: datos.items.map((f) => facturaPublica(f)),
      filtros,
      usuarios: await opcionesUsuarios(),
      estados: estadosParaCliente(),
    });
  }));

  router.get('/api/admin/facturas/:id/descargar', soloAdministrador, envolver(async (req, res) => {
    const id = entero(req.params.id);
    const filas = id ? await db.query('SELECT filename FROM facturas WHERE id = ?', [id]) : [];
    const ruta = filas[0]?.filename ? rutaSegura(config.carpetas.facturas, filas[0].filename) : null;
    if (!ruta) return noEncontrado(res);
    return res.download(ruta, filas[0].filename, { dotfiles: 'deny' });
  }));

  router.get('/api/admin/facturas/:id', soloAdministrador, envolver(async (req, res) => {
    const id = entero(req.params.id);
    const filas = id ? await db.query(`${SELECT_FACTURA_ADMIN} WHERE f.id = ?`, [id]) : [];
    if (!filas[0]) return noEncontrado(res);
    return res.json({ factura: facturaPublica(filas[0], { conNotas: true }) });
  }));

  async function clienteExiste(id) {
    return (await db.query('SELECT id FROM usuarios WHERE id = ?', [id])).length > 0;
  }

  router.post('/api/admin/facturas', soloAdministrador, subida('archivo'), envolver(async (req, res) => {
    const { datos, errores } = validarFactura(req.body);
    if (errores) return res.status(400).json({ message: 'Revisa los campos del formulario.', errors: errores });
    if (!(await clienteExiste(datos.usuario_id))) {
      return res.status(400).json({ message: 'El cliente seleccionado no existe.', errors: { usuario_id: 'El cliente seleccionado no existe.' } });
    }
    const archivo = req.file ? await guardarArchivo(req.file, config.carpetas.facturas, EXT_FACTURAS) : null;
    await db.query(
      'INSERT INTO facturas (usuario_id, filename, numero_factura, monto, estado, fecha_factura, notas, creada_por) '
        + 'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [datos.usuario_id, archivo, datos.numero_factura, datos.monto, datos.estado, datos.fecha_factura, datos.notas, req.usuario.id],
    );
    await aud(req, 'crear_factura', `factura para usuario #${datos.usuario_id}`);
    return res.status(201).json({ message: 'Factura creada correctamente.' });
  }));

  router.put('/api/admin/facturas/:id', soloAdministrador, subida('archivo'), envolver(async (req, res) => {
    const id = entero(req.params.id);
    const filas = id ? await db.query('SELECT filename FROM facturas WHERE id = ?', [id]) : [];
    if (!filas[0]) return noEncontrado(res);
    const { datos, errores } = validarFactura(req.body);
    if (errores) return res.status(400).json({ message: 'Revisa los campos del formulario.', errors: errores });
    if (!(await clienteExiste(datos.usuario_id))) {
      return res.status(400).json({ message: 'El cliente seleccionado no existe.', errors: { usuario_id: 'El cliente seleccionado no existe.' } });
    }
    let archivo = filas[0].filename;
    if (req.file) archivo = await guardarArchivo(req.file, config.carpetas.facturas, EXT_FACTURAS);
    await db.query(
      'UPDATE facturas SET usuario_id = ?, filename = ?, numero_factura = ?, monto = ?, estado = ?, fecha_factura = ?, notas = ? WHERE id = ?',
      [datos.usuario_id, archivo, datos.numero_factura, datos.monto, datos.estado, datos.fecha_factura, datos.notas, id],
    );
    if (req.file) await borrarArchivo(config.carpetas.facturas, filas[0].filename);
    await aud(req, 'editar_factura', `factura #${id}`);
    return res.json({ message: 'Factura actualizada correctamente.' });
  }));

  router.post('/api/admin/facturas/:id/estado', soloAdministrador, envolver(async (req, res) => {
    const id = entero(req.params.id);
    const estado = texto(req.body?.estado);
    if (!id) return noEncontrado(res);
    if (!ESTADOS_FACTURA_VALIDOS.has(estado)) return res.status(400).json({ message: 'Estado no válido.' });
    await db.query('UPDATE facturas SET estado = ? WHERE id = ?', [estado, id]);
    await aud(req, 'cambiar_estado_factura', `factura #${id} → ${estado}`);
    return res.json({ message: 'Estado de la factura actualizado.' });
  }));

  router.delete('/api/admin/facturas/:id', soloAdministrador, envolver(async (req, res) => {
    const id = entero(req.params.id);
    if (!id) return noEncontrado(res);
    const filas = await db.query('SELECT filename FROM facturas WHERE id = ?', [id]);
    await db.query('DELETE FROM facturas WHERE id = ?', [id]);
    await borrarArchivo(config.carpetas.facturas, filas[0]?.filename);
    await aud(req, 'eliminar_factura', `factura #${id}`);
    return res.json({ message: 'Factura eliminada permanentemente.' });
  }));
}
