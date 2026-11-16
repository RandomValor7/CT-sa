import { envolver, requiereSesion, adminOModerador, auditar } from '../middleware.js';
import {
  validarTicket, validarRespuestaTicket, ESTADOS_TICKET, ESTADOS_TICKET_VALIDOS,
  CATEGORIAS_TICKET, texto,
} from '../lib/validate.js';
import { LIMITES } from '../lib/ratelimit.js';
import { paginar, entero } from './comun.js';

const MAX_ABIERTOS = 10;
const ETIQUETA_ESTADO = Object.fromEntries(ESTADOS_TICKET.map((e) => [e.valor, e.etiqueta]));

const COLUMNAS = 't.id, t.asunto, t.descripcion, t.categoria, t.estado, t.creado_en, t.actualizado_en';

function ticketPublico(fila) {
  return {
    id: fila.id,
    asunto: fila.asunto,
    descripcion: fila.descripcion,
    categoria: fila.categoria,
    estado: fila.estado,
    creado_en: fila.creado_en,
    actualizado_en: fila.actualizado_en,
    respuestas: Number(fila.total_respuestas ?? 0),
    ...(fila.usuario_nombre !== undefined && {
      usuario_id: fila.usuario_id, usuario_nombre: fila.usuario_nombre, usuario_email: fila.usuario_email,
    }),
  };
}

const respuestaPublica = (r) => ({
  id: r.id, autor: r.autor_nombre, mensaje: r.mensaje, creado_en: r.creado_en,
});

const opciones = () => ({
  estados: ESTADOS_TICKET.map((e) => ({ valor: e.valor, etiqueta: e.etiqueta })),
  categorias: CATEGORIAS_TICKET.map((c) => ({ valor: c.valor, etiqueta: c.etiqueta })),
});

export function montar(router, { config, db, limitador, correo }) {
  const noEncontrado = (res) => res.status(404).json({ message: 'No encontrado.' });
  const cuentaRespuestas = '(SELECT COUNT(*) FROM ticket_respuestas r WHERE r.ticket_id = t.id) AS total_respuestas';

  async function cargarRespuestas(id) {
    const filas = await db.query(
      'SELECT id, autor_nombre, mensaje, creado_en FROM ticket_respuestas WHERE ticket_id = ? ORDER BY creado_en ASC, id ASC',
      [id],
    );
    return filas.map(respuestaPublica);
  }

  // ----- Cliente: solo reporta y lee lo que el equipo responde -----
  router.use('/api/tickets', requiereSesion);

  router.get('/api/tickets', envolver(async (req, res) => {
    const filas = await db.query(
      `SELECT ${COLUMNAS}, ${cuentaRespuestas} FROM tickets t WHERE t.usuario_id = ? ORDER BY t.actualizado_en DESC, t.id DESC LIMIT 50`,
      [req.usuario.id],
    );
    res.json({ items: filas.map(ticketPublico), ...opciones() });
  }));

  router.post('/api/tickets', envolver(async (req, res) => {
    const { maximo, ventana } = LIMITES.ticket;
    if (await limitador.excedido('ticket', `u:${req.usuario.id}`, maximo, ventana)) {
      return res.status(429).json({ message: 'Has enviado varios reportes seguidos. Espera un rato antes de crear otro.' });
    }
    const { datos, errores } = validarTicket(req.body);
    if (errores) return res.status(400).json({ message: 'Revisa los campos del formulario.', errors: errores });

    const abiertos = await db.query(
      "SELECT COUNT(*) AS total FROM tickets WHERE usuario_id = ? AND estado IN ('abierto', 'en_proceso')",
      [req.usuario.id],
    );
    if (Number(abiertos[0]?.total ?? 0) >= MAX_ABIERTOS) {
      return res.status(400).json({ message: `Ya tienes ${MAX_ABIERTOS} reportes activos. Espera a que el equipo los atienda.` });
    }

    await limitador.registrar('ticket', `u:${req.usuario.id}`);
    const r = await db.query(
      'INSERT INTO tickets (usuario_id, asunto, descripcion, categoria) VALUES (?, ?, ?, ?)',
      [req.usuario.id, datos.asunto, datos.descripcion, datos.categoria],
    );
    correo.notificarEmpresa(
      `Nuevo reporte de soporte #${r.insertId}: ${datos.asunto}`,
      `${req.usuario.nombre} <${req.usuario.email}> creó un reporte (${datos.categoria}):\n\n${datos.descripcion}\n\n`
        + `Respóndelo en: ${config.baseUrl}/admin/tickets/${r.insertId}`,
    );
    return res.status(201).json({ id: r.insertId, message: 'Reporte enviado. Te avisaremos por correo cuando el equipo responda.' });
  }));

  router.get('/api/tickets/:id', envolver(async (req, res) => {
    const id = entero(req.params.id);
    const filas = id ? await db.query(
      `SELECT ${COLUMNAS}, ${cuentaRespuestas} FROM tickets t WHERE t.id = ? AND t.usuario_id = ?`,
      [id, req.usuario.id],
    ) : [];
    if (!filas[0]) return noEncontrado(res);
    return res.json({ ticket: ticketPublico(filas[0]), respuestas: await cargarRespuestas(id), ...opciones() });
  }));

  // ----- Equipo (moderador y administrador) -----
  router.get('/api/admin/tickets', adminOModerador, envolver(async (req, res) => {
    const estado = texto(req.query.estado);
    const filtrar = ESTADOS_TICKET_VALIDOS.has(estado);
    const where = filtrar ? 'WHERE t.estado = ?' : '';
    const params = filtrar ? [estado] : [];
    const pagina = await paginar(db, {
      contar: { sql: `SELECT COUNT(*) AS total FROM tickets t ${where}`, params },
      listar: {
        sql: `SELECT ${COLUMNAS}, u.id AS usuario_id, u.nombre AS usuario_nombre, u.email AS usuario_email, ${cuentaRespuestas} `
          + `FROM tickets t JOIN usuarios u ON t.usuario_id = u.id ${where} `
          + "ORDER BY FIELD(t.estado, 'abierto', 'en_proceso', 'resuelto', 'cerrado'), t.actualizado_en DESC LIMIT ? OFFSET ?",
        params,
      },
      pagina: req.query.pagina,
      porPagina: config.itemsPorPagina,
    });
    res.json({ ...pagina, items: pagina.items.map(ticketPublico), filtroEstado: filtrar ? estado : '', ...opciones() });
  }));

  async function ticketConUsuario(id) {
    const filas = id ? await db.query(
      `SELECT ${COLUMNAS}, u.id AS usuario_id, u.nombre AS usuario_nombre, u.email AS usuario_email, ${cuentaRespuestas} `
      + 'FROM tickets t JOIN usuarios u ON t.usuario_id = u.id WHERE t.id = ?',
      [id],
    ) : [];
    return filas[0] ?? null;
  }

  router.get('/api/admin/tickets/:id', adminOModerador, envolver(async (req, res) => {
    const id = entero(req.params.id);
    const fila = await ticketConUsuario(id);
    if (!fila) return noEncontrado(res);
    return res.json({ ticket: ticketPublico(fila), respuestas: await cargarRespuestas(id), ...opciones() });
  }));

  router.post('/api/admin/tickets/:id/responder', adminOModerador, envolver(async (req, res) => {
    const id = entero(req.params.id);
    const fila = await ticketConUsuario(id);
    if (!fila) return noEncontrado(res);
    const { datos, errores } = validarRespuestaTicket(req.body);
    if (errores) return res.status(400).json({ message: 'Revisa los campos del formulario.', errors: errores });

    const nuevoEstado = datos.estado ?? (fila.estado === 'abierto' ? 'en_proceso' : fila.estado);
    await db.query(
      'INSERT INTO ticket_respuestas (ticket_id, autor_id, autor_nombre, mensaje) VALUES (?, ?, ?, ?)',
      [id, req.usuario.id, req.usuario.nombre, datos.mensaje],
    );
    await db.query('UPDATE tickets SET estado = ? WHERE id = ?', [nuevoEstado, id]);
    await auditar(db, req, 'responder_ticket', `ticket #${id} → ${nuevoEstado}`);
    correo.enviar(
      fila.usuario_email,
      `Respuesta a tu reporte #${id} — Nodalia Ingeniería`,
      `Hola ${fila.usuario_nombre},\n\nEl equipo respondió tu reporte "${fila.asunto}":\n\n${datos.mensaje}\n\n`
        + `Estado actual: ${ETIQUETA_ESTADO[nuevoEstado]}.\nPuedes verlo en: ${config.baseUrl}/perfil (pestaña Soporte).`,
    );
    return res.json({
      message: 'Respuesta enviada.',
      ticket: ticketPublico({ ...fila, estado: nuevoEstado, total_respuestas: Number(fila.total_respuestas) + 1 }),
      respuestas: await cargarRespuestas(id),
    });
  }));

  router.put('/api/admin/tickets/:id/estado', adminOModerador, envolver(async (req, res) => {
    const id = entero(req.params.id);
    const fila = await ticketConUsuario(id);
    if (!fila) return noEncontrado(res);
    const estado = texto(req.body?.estado);
    if (!ESTADOS_TICKET_VALIDOS.has(estado)) return res.status(400).json({ message: 'Estado no válido.' });
    await db.query('UPDATE tickets SET estado = ? WHERE id = ?', [estado, id]);
    await auditar(db, req, 'estado_ticket', `ticket #${id} → ${estado}`);
    return res.json({ message: `Reporte marcado como ${ETIQUETA_ESTADO[estado].toLowerCase()}.`, estado });
  }));
}
