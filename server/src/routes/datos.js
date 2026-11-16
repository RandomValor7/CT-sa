import { envolver, requiereSesion, auditar } from '../middleware.js';
import { verificarHash } from '../lib/password.js';
import { texto } from '../lib/validate.js';
import { LIMITES } from '../lib/ratelimit.js';
import { POLITICA_VERSION, DIAS_ELIMINACION } from '../lib/privacidad.js';

const DIA_MS = 24 * 60 * 60 * 1000;

// Derechos del titular (Ley 1581 de 2012): conocer, descargar y suprimir sus datos.
export function montar(router, { db, limitador, correo, config }) {
  router.get('/api/perfil/datos', requiereSesion, envolver(async (req, res) => {
    const filas = await db.query(
      'SELECT politica_aceptada_en, politica_version, eliminacion_programada_en, fecha_registro FROM usuarios WHERE id = ?',
      [req.usuario.id],
    );
    const f = filas[0] ?? {};
    res.json({
      politica_aceptada_en: f.politica_aceptada_en ?? null,
      politica_version: f.politica_version ?? null,
      fecha_registro: f.fecha_registro ?? null,
      eliminacion_programada_en: f.eliminacion_programada_en ?? null,
      diasEliminacion: DIAS_ELIMINACION,
      versionActual: POLITICA_VERSION,
      puedeEliminar: req.usuario.rol !== 'administrador',
    });
  }));

  router.get('/api/perfil/datos/exportar', requiereSesion, envolver(async (req, res) => {
    const { maximo, ventana } = LIMITES.exportacion;
    if (await limitador.excedido('exportacion', `u:${req.usuario.id}`, maximo, ventana)) {
      return res.status(429).json({ message: 'Ya descargaste tus datos varias veces. Intenta de nuevo más tarde.' });
    }
    await limitador.registrar('exportacion', `u:${req.usuario.id}`);
    const id = req.usuario.id;
    const [cuenta, facturas, tickets, mensajes] = await Promise.all([
      db.query(
        'SELECT nombre, email, rol, email_verificado, totp_habilitado, google_id, fecha_registro, politica_aceptada_en, politica_version FROM usuarios WHERE id = ?',
        [id],
      ),
      db.query('SELECT numero_factura, monto, estado, fecha_factura, fecha_subida, filename FROM facturas WHERE usuario_id = ?', [id]),
      db.query('SELECT id, asunto, descripcion, categoria, estado, creado_en FROM tickets WHERE usuario_id = ?', [id]),
      db.query('SELECT mensaje, fecha FROM mensajes WHERE email = ?', [req.usuario.email]),
    ]);
    const respuestas = tickets.length > 0
      ? await db.query(
        `SELECT ticket_id, autor_nombre, mensaje, creado_en FROM ticket_respuestas WHERE ticket_id IN (${tickets.map(() => '?').join(',')})`,
        tickets.map((t) => t.id),
      )
      : [];
    const c = cuenta[0] ?? {};
    const datos = {
      generado_en: new Date().toISOString(),
      aviso: 'Copia de los datos personales que Nodalia Ingeniería S.A.S. guarda sobre ti. No incluye tu contraseña (solo guardamos una huella cifrada).',
      cuenta: {
        nombre: c.nombre, email: c.email, rol: c.rol,
        correo_verificado: Boolean(c.email_verificado),
        verificacion_dos_pasos: Boolean(c.totp_habilitado),
        inicio_con_google: Boolean(c.google_id),
        fecha_registro: c.fecha_registro ?? null,
        politica_aceptada_en: c.politica_aceptada_en ?? null,
        politica_version: c.politica_version ?? null,
      },
      facturas: facturas.map((f) => ({ ...f, filename: undefined, tiene_archivo: Boolean(f.filename) })),
      reportes_de_soporte: tickets.map((t) => ({
        ...t, respuestas: respuestas.filter((r) => r.ticket_id === t.id).map(({ ticket_id, ...resto }) => resto),
      })),
      mensajes_de_contacto: mensajes,
    };
    await auditar(db, req, 'exportar_mis_datos', `usuario #${id}`);
    res.set({
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename=mis_datos_nodalia.json',
      'Cache-Control': 'no-store',
    });
    res.send(JSON.stringify(datos, null, 2));
  }));

  router.post('/api/perfil/eliminacion', requiereSesion, envolver(async (req, res) => {
    if (req.usuario.rol === 'administrador') {
      return res.status(400).json({ message: 'Las cuentas de administrador se eliminan desde el panel por otro administrador.' });
    }
    const { maximo, ventana } = LIMITES.login;
    const clave = `del:${req.usuario.id}`;
    if (await limitador.excedido('login', clave, maximo, ventana)) {
      return res.status(429).json({ message: 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.' });
    }
    if (texto(req.body?.confirmacion).toUpperCase() !== 'ELIMINAR') {
      return res.status(400).json({ message: 'Escribe ELIMINAR para confirmar.', errors: { confirmacion: 'Escribe ELIMINAR para confirmar.' } });
    }
    const filas = await db.query('SELECT password, eliminacion_programada_en FROM usuarios WHERE id = ?', [req.usuario.id]);
    const f = filas[0];
    if (f?.eliminacion_programada_en) {
      return res.json({ message: 'Tu cuenta ya tiene una eliminación programada.', eliminacion_programada_en: f.eliminacion_programada_en });
    }
    if (f?.password) {
      const ok = typeof req.body?.password === 'string' && await verificarHash(f.password, req.body.password);
      if (!ok) {
        await limitador.registrar('login', clave);
        return res.status(400).json({ message: 'La contraseña no coincide.', errors: { password: 'La contraseña no coincide.' } });
      }
    }
    const fecha = new Date(Date.now() + DIAS_ELIMINACION * DIA_MS);
    await db.query('UPDATE usuarios SET eliminacion_programada_en = ? WHERE id = ?', [fecha, req.usuario.id]);
    await auditar(db, req, 'solicitar_eliminacion_cuenta', `usuario #${req.usuario.id}`);
    correo.enviar(
      req.usuario.email,
      'Recibimos tu solicitud de eliminación — Nodalia Ingeniería',
      `Hola ${req.usuario.nombre},\n\nTu cuenta y tus datos se borrarán definitivamente el ${fecha.toLocaleDateString('es-CO')}.\n`
        + `Si cambias de opinión, inicia sesión antes de esa fecha y cancela la solicitud en Mi perfil → Mis datos.\n\n`
        + 'Si no fuiste tú, cambia tu contraseña y cancela la solicitud de inmediato.',
    );
    return res.json({
      message: `Listo. Tu cuenta se borrará el ${fecha.toLocaleDateString('es-CO')}. Puedes cancelarlo antes.`,
      eliminacion_programada_en: fecha.toISOString(),
    });
  }));

  router.delete('/api/perfil/eliminacion', requiereSesion, envolver(async (req, res) => {
    await db.query('UPDATE usuarios SET eliminacion_programada_en = NULL WHERE id = ?', [req.usuario.id]);
    await auditar(db, req, 'cancelar_eliminacion_cuenta', `usuario #${req.usuario.id}`);
    res.json({ message: 'Cancelamos la eliminación. Tu cuenta sigue activa.' });
  }));
}
