import test from 'node:test';
import assert from 'node:assert/strict';
import { crearRouterFalso, llamar, crearDbFalsa } from './ayudas.js';
import { crearLimitador } from '../src/lib/ratelimit.js';
import { generarHash } from '../src/lib/password.js';
import { cargarConfig } from '../src/config.js';
import { montar as montarTickets } from '../src/routes/tickets.js';
import { montar as montarDatos } from '../src/routes/datos.js';
import { purgarCuentasVencidas } from '../src/lib/cuentas.js';

const config = cargarConfig({ SECRET_KEY: 'x'.repeat(40) }, { warn() {} });
const HASH = await generarHash('Clave123');

function entorno(reglas) {
  const db = crearDbFalsa([[/INSERT INTO logs_admin/, { insertId: 1 }], ...reglas]);
  const correos = [];
  const correo = { enviar: async (...a) => { correos.push(a); return true; }, notificarEmpresa: async (...a) => { correos.push(a); return true; } };
  const router = crearRouterFalso();
  const deps = { config, db, limitador: crearLimitador(), correo };
  montarTickets(router, deps);
  montarDatos(router, deps);
  return { router, db, correos };
}

const cliente = (extra = {}) => ({ id: 7, nombre: 'Ana Gómez', email: 'ana@correo.com', rol: 'usuario', ...extra });
const moderador = { id: 2, nombre: 'Mod', email: 'mod@nodalia.example', rol: 'moderador' };
const fila = (extra = {}) => ({
  id: 4, asunto: 'Sin internet', descripcion: 'No hay señal', categoria: 'servicio', estado: 'abierto',
  creado_en: 'x', actualizado_en: 'x', total_respuestas: 0, usuario_id: 7, usuario_nombre: 'Ana Gómez', usuario_email: 'ana@correo.com', ...extra,
});

test('tickets: exigen sesión y el cliente solo ve los suyos', async () => {
  const { router, db } = entorno([[/FROM tickets t WHERE t.id = \? AND t.usuario_id = \?/, []]]);
  assert.equal((await llamar(router, 'GET', '/api/tickets')).res.estado, 401);
  assert.equal((await llamar(router, 'GET', '/api/tickets/4', { usuario: cliente() })).res.estado, 404);
  assert.deepEqual(db.vecesQue(/usuario_id = \?/)[0].params, [4, 7]);
});

test('tickets: el cliente no puede entrar a las rutas del equipo', async () => {
  const { router } = entorno([]);
  assert.equal((await llamar(router, 'GET', '/api/admin/tickets', { usuario: cliente() })).res.estado, 404);
  assert.equal((await llamar(router, 'POST', '/api/admin/tickets/4/responder', { usuario: cliente(), body: { mensaje: 'hola' } })).res.estado, 404);
});

test('tickets: crear valida campos, guarda y avisa a la empresa', async () => {
  const { router, db, correos } = entorno([
    [/COUNT\(\*\) AS total FROM tickets/, [{ total: 0 }]],
    [/INSERT INTO tickets/, { insertId: 9 }],
  ]);
  const malo = await llamar(router, 'POST', '/api/tickets', { usuario: cliente(), body: { asunto: 'a', descripcion: 'b' } });
  assert.equal(malo.res.estado, 400);
  assert.ok(malo.res.cuerpo.errors.asunto && malo.res.cuerpo.errors.descripcion);

  const ok = await llamar(router, 'POST', '/api/tickets', {
    usuario: cliente(), body: { asunto: 'Sin internet', descripcion: 'Desde ayer no hay señal', categoria: 'servicio' },
  });
  assert.equal(ok.res.estado, 201);
  assert.equal(ok.res.cuerpo.id, 9);
  assert.deepEqual(db.vecesQue(/INSERT INTO tickets/)[0].params, [7, 'Sin internet', 'Desde ayer no hay señal', 'servicio']);
  assert.equal(correos.length, 1);
});

test('tickets: límite de reportes por hora y de reportes activos', async () => {
  const { router } = entorno([
    [/COUNT\(\*\) AS total FROM tickets/, [{ total: 10 }]],
  ]);
  const lleno = await llamar(router, 'POST', '/api/tickets', {
    usuario: cliente(), body: { asunto: 'Otro problema', descripcion: 'Descripción suficiente' },
  });
  assert.equal(lleno.res.estado, 400);

  const e2 = entorno([[/COUNT\(\*\) AS total FROM tickets/, [{ total: 0 }]], [/INSERT INTO tickets/, { insertId: 1 }]]);
  const cuerpo = { asunto: 'Otro problema', descripcion: 'Descripción suficiente' };
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await llamar(e2.router, 'POST', '/api/tickets', { usuario: cliente(), body: cuerpo })).res.estado, 201);
  }
  assert.equal((await llamar(e2.router, 'POST', '/api/tickets', { usuario: cliente(), body: cuerpo })).res.estado, 429);
});

test('tickets: el moderador responde, cambia estado, audita y avisa al cliente', async () => {
  const { router, db, correos } = entorno([
    [/FROM tickets t JOIN usuarios u/, [fila()]],
    [/INSERT INTO ticket_respuestas/, { insertId: 1 }],
    [/UPDATE tickets SET estado/, { affectedRows: 1 }],
    [/FROM ticket_respuestas WHERE ticket_id/, [{ id: 1, autor_nombre: 'Mod', mensaje: 'Vamos en camino', creado_en: 'x' }]],
  ]);
  const vacio = await llamar(router, 'POST', '/api/admin/tickets/4/responder', { usuario: moderador, body: { mensaje: ' ' } });
  assert.equal(vacio.res.estado, 400);

  const r = await llamar(router, 'POST', '/api/admin/tickets/4/responder', { usuario: moderador, body: { mensaje: 'Vamos en camino' } });
  assert.equal(r.res.estado, 200);
  assert.equal(r.res.cuerpo.ticket.estado, 'en_proceso');
  assert.deepEqual(db.vecesQue(/UPDATE tickets SET estado/)[0].params, ['en_proceso', 4]);
  assert.ok(db.vecesQue(/INSERT INTO logs_admin/)[0].params.includes('responder_ticket'));
  assert.equal(correos[0][0], 'ana@correo.com');

  const e = await llamar(router, 'PUT', '/api/admin/tickets/4/estado', { usuario: moderador, body: { estado: 'resuelto' } });
  assert.equal(e.res.estado, 200);
  const mal = await llamar(router, 'PUT', '/api/admin/tickets/4/estado', { usuario: moderador, body: { estado: 'inventado' } });
  assert.equal(mal.res.estado, 400);
});

test('datos: la exportación no incluye contraseña ni 2FA y queda auditada', async () => {
  const { router, db } = entorno([
    [/FROM usuarios WHERE id/, [{ nombre: 'Ana', email: 'ana@correo.com', rol: 'usuario', email_verificado: 1, totp_habilitado: 0, google_id: null, fecha_registro: 'x' }]],
    [/FROM facturas/, [{ numero_factura: 'F1', monto: 10, estado: 'pendiente', filename: 'a.pdf' }]],
    [/FROM tickets WHERE usuario_id/, [{ id: 1, asunto: 'x', descripcion: 'y', categoria: 'otro', estado: 'abierto', creado_en: 'z' }]],
    [/FROM mensajes/, []],
    [/FROM ticket_respuestas/, [{ ticket_id: 1, autor_nombre: 'Mod', mensaje: 'ok', creado_en: 'z' }]],
  ]);
  assert.equal((await llamar(router, 'GET', '/api/perfil/datos/exportar')).res.estado, 401);
  const { res } = await llamar(router, 'GET', '/api/perfil/datos/exportar', { usuario: cliente() });
  assert.match(res.cabeceras['Content-Disposition'], /attachment/);
  assert.doesNotMatch(res.cuerpo, /password|totp_secret|a\.pdf/);
  const json = JSON.parse(res.cuerpo);
  assert.equal(json.reportes_de_soporte[0].respuestas[0].mensaje, 'ok');
  assert.ok(db.vecesQue(/INSERT INTO logs_admin/).length === 1);
});

test('datos: pedir eliminación exige confirmación y contraseña; se puede cancelar', async () => {
  const { router, db } = entorno([
    [/SELECT password, eliminacion_programada_en/, [{ password: HASH, eliminacion_programada_en: null }]],
    [/UPDATE usuarios SET eliminacion_programada_en = \?/, { affectedRows: 1 }],
    [/UPDATE usuarios SET eliminacion_programada_en = NULL/, { affectedRows: 1 }],
  ]);
  const sinTexto = await llamar(router, 'POST', '/api/perfil/eliminacion', { usuario: cliente(), body: { password: 'Clave123' } });
  assert.equal(sinTexto.res.estado, 400);
  const mala = await llamar(router, 'POST', '/api/perfil/eliminacion', { usuario: cliente(), body: { confirmacion: 'ELIMINAR', password: 'Otra123' } });
  assert.equal(mala.res.estado, 400);
  assert.equal(db.vecesQue(/SET eliminacion_programada_en = \?/).length, 0);

  const ok = await llamar(router, 'POST', '/api/perfil/eliminacion', { usuario: cliente(), body: { confirmacion: 'eliminar', password: 'Clave123' } });
  assert.equal(ok.res.estado, 200);
  const fecha = db.vecesQue(/SET eliminacion_programada_en = \?/)[0].params[0];
  const dias = (fecha.getTime() - Date.now()) / 86_400_000;
  assert.ok(dias > 14.9 && dias <= 15);

  const cancel = await llamar(router, 'DELETE', '/api/perfil/eliminacion', { usuario: cliente() });
  assert.equal(cancel.res.estado, 200);
  assert.equal(db.vecesQue(/= NULL WHERE id/).length, 1);

  const admin = await llamar(router, 'POST', '/api/perfil/eliminacion', { usuario: cliente({ rol: 'administrador' }), body: { confirmacion: 'ELIMINAR', password: 'Clave123' } });
  assert.equal(admin.res.estado, 400);
});

test('purga: borra solo cuentas con plazo vencido y deja constancia', async () => {
  const db = crearDbFalsa([
    [/SELECT id FROM usuarios WHERE eliminacion_programada_en/, [{ id: 5 }, { id: 6 }]],
    [/SELECT filename FROM facturas/, []],
    [/SELECT profile_picture/, [{ profile_picture: null }]],
    [/DELETE FROM usuarios/, { affectedRows: 1 }],
    [/INSERT INTO logs_admin/, { insertId: 1 }],
  ]);
  assert.equal(await purgarCuentasVencidas(db, config, { error() {} }), 2);
  assert.deepEqual(db.vecesQue(/DELETE FROM usuarios/).map((l) => l.params[0]), [5, 6]);
  assert.equal(db.vecesQue(/INSERT INTO logs_admin/).length, 2);
});
