import test from 'node:test';
import assert from 'node:assert/strict';
import { crearRouterFalso, llamar, crearDbFalsa } from './ayudas.js';
import { crearLimitador } from '../src/lib/ratelimit.js';
import { generarHash } from '../src/lib/password.js';
import { generarSecretoTotp, generarTotp } from '../src/lib/totp.js';
import { generarTokenRecuperacion, generarTokenVerificacion } from '../src/lib/tokens.js';
import { cargarConfig } from '../src/config.js';
import { protegerCsrf, cargarUsuario, requiereRol, nuevoTokenCsrf } from '../src/middleware.js';
import { montar as montarPublico } from '../src/routes/publico.js';
import { montar as montarAuth } from '../src/routes/auth.js';
import { montar as montarPerfil } from '../src/routes/perfil.js';
import { montar as montarAdmin } from '../src/routes/admin.js';
import { inyectarMeta, paginaDe } from '../src/spa.js';

const config = cargarConfig({ SECRET_KEY: 'x'.repeat(40), GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'sec' }, { warn() {} });
const HASH = await generarHash('Clave123');
const sinCorreo = () => ({ enviar: async () => true, notificarEmpresa: async () => true });

function entorno(reglas, extra = {}) {
  const db = crearDbFalsa(reglas);
  const limitador = crearLimitador();
  const correos = [];
  const correo = { enviar: async (...a) => { correos.push(a); return true; }, notificarEmpresa: async (...a) => { correos.push(a); return true; } };
  const deps = {
    config, db, limitador, correo, verificarTurnstile: async () => true,
    google: { urlAutorizacion: async () => 'https://accounts.google.com/x', obtenerPerfil: async () => ({}) },
    subida: () => (req, res, next) => next(),
    ...extra,
  };
  const router = crearRouterFalso();
  montarPublico(router, deps);
  montarAuth(router, deps);
  montarPerfil(router, deps);
  montarAdmin(router, deps);
  return { router, db, limitador, correos };
}

const usuarioFila = (extra = {}) => ({
  id: 7, nombre: 'Ana Gómez', email: 'ana@correo.com', rol: 'usuario', profile_picture: null,
  email_verificado: 1, totp_habilitado: 0, password: HASH, ...extra,
});

test('login correcto abre una sesión nueva con token CSRF distinto', async () => {
  const { router } = entorno([[/FROM usuarios WHERE email/, [usuarioFila()]]]);
  const session = { csrf: 'viejo', basura: 1 };
  const { req, res } = await llamar(router, 'POST', '/api/auth/login', { body: { email: 'ana@correo.com', password: 'Clave123' }, session });
  assert.equal(res.estado, 200);
  assert.equal(res.cuerpo.usuario.email, 'ana@correo.com');
  assert.equal(res.cuerpo.usuario.password, undefined);
  assert.equal(req.session.uid, 7);
  assert.notEqual(req.session.csrf, 'viejo');
  assert.equal(res.cuerpo.csrfToken, req.session.csrf);
  assert.equal(req.session.basura, undefined);
});

test('login incorrecto: mismo mensaje para usuario inexistente y clave mala, y se bloquea al 5.º intento', async () => {
  const { router } = entorno([[/FROM usuarios WHERE email = \?/, (sql, [email]) => (email === 'ana@correo.com' ? [usuarioFila()] : [])]]);
  const a = await llamar(router, 'POST', '/api/auth/login', { body: { email: 'ana@correo.com', password: 'Equivocada1' } });
  const b = await llamar(router, 'POST', '/api/auth/login', { body: { email: 'nadie@correo.com', password: 'Equivocada1' } });
  assert.equal(a.res.estado, 401);
  assert.equal(b.res.estado, 401);
  assert.equal(a.res.cuerpo.message, b.res.cuerpo.message);
  for (let i = 0; i < 3; i += 1) await llamar(router, 'POST', '/api/auth/login', { body: { email: 'ana@correo.com', password: 'Equivocada1' } });
  const bloqueado = await llamar(router, 'POST', '/api/auth/login', { body: { email: 'ana@correo.com', password: 'Clave123' } });
  assert.equal(bloqueado.res.estado, 429);
  const otraIp = await llamar(router, 'POST', '/api/auth/login', { body: { email: 'ana@correo.com', password: 'Clave123' }, ip: '9.9.9.9' });
  assert.equal(otraIp.res.estado, 200);
});

test('cuenta solo-Google no entra con contraseña', async () => {
  const { router } = entorno([[/FROM usuarios WHERE email/, [usuarioFila({ password: null })]]]);
  const { res } = await llamar(router, 'POST', '/api/auth/login', { body: { email: 'ana@correo.com', password: 'Clave123' } });
  assert.equal(res.estado, 401);
  assert.match(res.cuerpo.message, /Google/);
});

test('con 2FA activo el login no abre sesión hasta verificar el código', async () => {
  const secreto = generarSecretoTotp();
  const { router } = entorno([
    [/SELECT .*password FROM usuarios WHERE email/, [usuarioFila({ totp_habilitado: 1 })]],
    [/totp_secret FROM usuarios WHERE id/, [usuarioFila({ totp_habilitado: 1, totp_secret: secreto })]],
  ]);
  const paso1 = await llamar(router, 'POST', '/api/auth/login', { body: { email: 'ana@correo.com', password: 'Clave123' }, session: { csrf: 'c' } });
  assert.equal(paso1.res.cuerpo.requiere2fa, true);
  assert.equal(paso1.req.session.uid, undefined);
  assert.equal(paso1.res.cuerpo.usuario, undefined);

  const mal = await llamar(router, 'POST', '/api/auth/2fa/verificar', { body: { codigo: '000000' }, session: paso1.req.session });
  assert.equal(mal.res.estado, 400);
  assert.equal(mal.req.session.uid, undefined);

  const bien = await llamar(router, 'POST', '/api/auth/2fa/verificar', { body: { codigo: generarTotp(secreto) }, session: paso1.req.session });
  assert.equal(bien.res.estado, 200);
  assert.equal(bien.req.session.uid, 7);
  assert.equal(bien.req.session.pendiente2fa, undefined);
});

test('2FA: sin paso previo, vencido o con demasiados fallos se rechaza', async () => {
  const secreto = generarSecretoTotp();
  const { router } = entorno([[/totp_secret FROM usuarios WHERE id/, [usuarioFila({ totp_secret: secreto })]]]);
  const sin = await llamar(router, 'POST', '/api/auth/2fa/verificar', { body: { codigo: generarTotp(secreto) }, session: {} });
  assert.equal(sin.res.estado, 400);
  const vencido = await llamar(router, 'POST', '/api/auth/2fa/verificar', {
    body: { codigo: generarTotp(secreto) }, session: { pendiente2fa: { id: 7, hasta: Date.now() - 1 } },
  });
  assert.equal(vencido.res.estado, 400);
  const session = { pendiente2fa: { id: 7, hasta: Date.now() + 60_000 } };
  for (let i = 0; i < 5; i += 1) await llamar(router, 'POST', '/api/auth/2fa/verificar', { body: { codigo: '111111' }, session });
  const bloqueado = await llamar(router, 'POST', '/api/auth/2fa/verificar', { body: { codigo: generarTotp(secreto) }, session });
  assert.equal(bloqueado.res.estado, 429);
});

test('registro: valida, rechaza duplicados y guarda la contraseña con hash', async () => {
  const { router, db, correos } = entorno([
    [/SELECT id FROM usuarios WHERE email/, (sql, [email]) => (email === 'dup@correo.com' ? [{ id: 1 }] : [])],
    [/INSERT INTO usuarios/, { insertId: 9 }],
  ]);
  const invalido = await llamar(router, 'POST', '/api/auth/registro', { body: { nombre: 'A', email: 'x', password: '123', acepto_politica: false } });
  assert.equal(invalido.res.estado, 400);
  assert.ok(invalido.res.cuerpo.errors.nombre && invalido.res.cuerpo.errors.email && invalido.res.cuerpo.errors.acepto_politica);

  const dup = await llamar(router, 'POST', '/api/auth/registro', { body: { nombre: 'Ana Gómez', email: 'dup@correo.com', password: 'abc123', acepto_politica: true } });
  assert.equal(dup.res.estado, 400);

  const ok = await llamar(router, 'POST', '/api/auth/registro', { body: { nombre: 'Ana Gómez', email: 'nueva@correo.com', password: 'abc123', acepto_politica: true } });
  assert.equal(ok.res.estado, 201);
  const insert = db.vecesQue(/INSERT INTO usuarios/)[0];
  assert.match(insert.params[2], /^scrypt:32768:8:1\$/);
  assert.notEqual(insert.params[2], 'abc123');
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(correos[0][0], 'nueva@correo.com');
  assert.match(correos[0][2], /\/verificar\//);
});

test('el enlace de recuperación sirve una sola vez', async () => {
  let hashActual = HASH;
  const { router, db } = entorno([
    [/SELECT id, password FROM usuarios WHERE email/, () => [{ id: 7, password: hashActual }]],
    [/UPDATE usuarios SET password/, (sql, [nuevo]) => { hashActual = nuevo; return {}; }],
  ]);
  const token = generarTokenRecuperacion(config.claveSecreta, 'ana@correo.com', HASH);
  const valido = await llamar(router, 'GET', `/api/auth/restablecer/${token}`);
  assert.equal(valido.res.estado, 200);

  const corto = await llamar(router, 'POST', '/api/auth/restablecer', { body: { token, password: 'abc', confirmar_password: 'abc' } });
  assert.equal(corto.res.estado, 400);
  const distinto = await llamar(router, 'POST', '/api/auth/restablecer', { body: { token, password: 'abc123', confirmar_password: 'abc124' } });
  assert.equal(distinto.res.estado, 400);

  const cambio = await llamar(router, 'POST', '/api/auth/restablecer', { body: { token, password: 'NuevaClave1', confirmar_password: 'NuevaClave1' } });
  assert.equal(cambio.res.estado, 200);
  assert.equal(db.vecesQue(/UPDATE usuarios SET password/).length, 1);

  const reuso = await llamar(router, 'POST', '/api/auth/restablecer', { body: { token, password: 'Otra12345', confirmar_password: 'Otra12345' } });
  assert.equal(reuso.res.estado, 400);
  const basura = await llamar(router, 'GET', '/api/auth/restablecer/token-falso');
  assert.equal(basura.res.estado, 400);
});

test('recuperar: respuesta idéntica exista o no el correo, con límite por IP', async () => {
  const { router, correos } = entorno([[/SELECT nombre, password FROM usuarios/, (sql, [email]) => (email === 'ana@correo.com' ? [{ nombre: 'Ana', password: HASH }] : [])]]);
  const a = await llamar(router, 'POST', '/api/auth/recuperar', { body: { email: 'ana@correo.com' } });
  const b = await llamar(router, 'POST', '/api/auth/recuperar', { body: { email: 'nadie@correo.com' } });
  assert.equal(a.res.estado, 200);
  assert.deepEqual(a.res.cuerpo, b.res.cuerpo);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(correos.length, 1);
  await llamar(router, 'POST', '/api/auth/recuperar', { body: { email: 'nadie@correo.com' } });
  const cuarta = await llamar(router, 'POST', '/api/auth/recuperar', { body: { email: 'nadie@correo.com' } });
  assert.equal(cuarta.res.estado, 429);
});

test('verificar correo con token válido y con token ajeno', async () => {
  const { router, db } = entorno([[/UPDATE usuarios SET email_verificado/, {}]]);
  const bueno = await llamar(router, 'POST', '/api/auth/verificar-email', { body: { token: generarTokenVerificacion(config.claveSecreta, 'ana@correo.com') } });
  assert.equal(bueno.res.estado, 200);
  assert.deepEqual(db.llamadas[0].params, ['ana@correo.com']);
  const malo = await llamar(router, 'POST', '/api/auth/verificar-email', { body: { token: generarTokenVerificacion('otra-clave', 'ana@correo.com') } });
  assert.equal(malo.res.estado, 400);
});

test('rutas de perfil y facturas exigen sesión (401) y las facturas son solo del dueño', async () => {
  const { router, db } = entorno([[/FROM facturas WHERE id = \? AND usuario_id = \?/, []]]);
  assert.equal((await llamar(router, 'GET', '/api/perfil')).res.estado, 401);
  assert.equal((await llamar(router, 'GET', '/api/mis-facturas')).res.estado, 401);
  assert.equal((await llamar(router, 'GET', '/api/perfil/facturas/3/descargar')).res.estado, 401);
  const ajena = await llamar(router, 'GET', '/api/perfil/facturas/3/descargar', { usuario: usuarioFila() });
  assert.equal(ajena.res.estado, 404);
  assert.deepEqual(db.llamadas[0].params, [3, 7]);
  const detalle = await llamar(router, 'GET', '/api/mis-facturas/3', { usuario: usuarioFila() });
  assert.equal(detalle.res.estado, 404);
});

test('descarga de factura propia usa una ruta dentro de la carpeta privada', async () => {
  const { router } = entorno([[/SELECT filename FROM facturas/, [{ filename: '../../etc/passwd' }]]]);
  const { res } = await llamar(router, 'GET', '/api/perfil/facturas/3/descargar', { usuario: usuarioFila() });
  assert.ok(res.descarga.ruta.startsWith(config.carpetas.facturas));
  assert.ok(res.descarga.ruta.endsWith('passwd'));
});

test('2FA: activar necesita el código y desactivar también', async () => {
  const secreto = generarSecretoTotp();
  const { router, db } = entorno([
    [/UPDATE usuarios SET totp_secret = \?/, {}],
    [/UPDATE usuarios SET totp_secret = NULL/, {}],
    [/SELECT totp_secret FROM usuarios/, [{ totp_secret: secreto }]],
  ]);
  const usuario = usuarioFila();
  const inicio = await llamar(router, 'POST', '/api/perfil/2fa/iniciar', { usuario, session: {} });
  assert.match(inicio.res.cuerpo.otpauthUri, /^otpauth:\/\/totp\//);
  const guardado = inicio.req.session.secreto2fa;

  const mal = await llamar(router, 'POST', '/api/perfil/2fa/activar', { usuario, session: inicio.req.session, body: { codigo: '123456' } });
  assert.equal(mal.res.estado, 400);
  assert.equal(db.vecesQue(/SET totp_secret = \?/).length, 0);
  const bien = await llamar(router, 'POST', '/api/perfil/2fa/activar', { usuario, session: inicio.req.session, body: { codigo: generarTotp(guardado) } });
  assert.equal(bien.res.estado, 200);
  assert.equal(bien.req.session.secreto2fa, undefined);

  const activo = usuarioFila({ totp_habilitado: 1 });
  const sinCodigo = await llamar(router, 'POST', '/api/perfil/2fa/desactivar', { usuario: activo, body: {} });
  assert.equal(sinCodigo.res.estado, 400);
  assert.equal(db.vecesQue(/totp_secret = NULL/).length, 0);
  const conCodigo = await llamar(router, 'POST', '/api/perfil/2fa/desactivar', { usuario: activo, body: { codigo: generarTotp(secreto) } });
  assert.equal(conCodigo.res.estado, 200);
  assert.equal(db.vecesQue(/totp_secret = NULL/).length, 1);
});

test('permisos del panel: sin sesión 401, rol insuficiente 404, moderador solo lo suyo', async () => {
  const { router } = entorno([
    [/COUNT\(\*\) AS total/, [{ total: 3 }]],
    [/FROM usuarios ORDER BY nombre/, []],
    [/INSERT INTO logs_admin/, {}],
  ]);
  const comun = usuarioFila();
  const moderador = usuarioFila({ rol: 'moderador' });
  const admin = usuarioFila({ rol: 'administrador' });

  assert.equal((await llamar(router, 'GET', '/api/admin/dashboard')).res.estado, 401);
  assert.equal((await llamar(router, 'GET', '/api/admin/dashboard', { usuario: comun })).res.estado, 404);
  assert.equal((await llamar(router, 'GET', '/api/admin/usuarios', { usuario: comun })).res.estado, 404);

  const panelMod = await llamar(router, 'GET', '/api/admin/dashboard', { usuario: moderador });
  assert.equal(panelMod.res.estado, 200);
  assert.equal(panelMod.res.cuerpo.statsAdmin, null);
  for (const ruta of ['/api/admin/usuarios', '/api/admin/productos', '/api/admin/facturas', '/api/admin/auditoria', '/api/admin/facturas/formulario']) {
    assert.equal((await llamar(router, 'GET', ruta, { usuario: moderador })).res.estado, 404, ruta);
  }
  const panelAdmin = await llamar(router, 'GET', '/api/admin/dashboard', { usuario: admin });
  assert.equal(panelAdmin.res.cuerpo.statsAdmin.totalUsuarios, 3);
  assert.equal((await llamar(router, 'DELETE', '/api/admin/usuarios/5', { usuario: moderador })).res.estado, 404);
});

test('admin: no puede quitarse el rol ni borrarse a sí mismo, y toda acción queda auditada', async () => {
  const { router, db } = entorno([
    [/UPDATE usuarios SET rol/, {}],
    [/FROM facturas WHERE usuario_id/, []],
    [/SELECT profile_picture/, [{ profile_picture: null }]],
    [/DELETE FROM usuarios/, {}],
    [/INSERT INTO logs_admin/, {}],
  ]);
  const admin = usuarioFila({ id: 1, rol: 'administrador', nombre: 'Jefe' });
  const propio = await llamar(router, 'POST', '/api/admin/usuarios/1/rol', { usuario: admin, body: { rol: 'usuario' } });
  assert.equal(propio.res.estado, 400);
  const invalido = await llamar(router, 'POST', '/api/admin/usuarios/2/rol', { usuario: admin, body: { rol: 'superadmin' } });
  assert.equal(invalido.res.estado, 400);
  assert.equal(db.vecesQue(/UPDATE usuarios SET rol/).length, 0);
  const ok = await llamar(router, 'POST', '/api/admin/usuarios/2/rol', { usuario: admin, body: { rol: 'moderador' } });
  assert.equal(ok.res.estado, 200);
  assert.deepEqual(db.vecesQue(/UPDATE usuarios SET rol/)[0].params, ['moderador', 2]);
  const auto = await llamar(router, 'DELETE', '/api/admin/usuarios/1', { usuario: admin });
  assert.equal(auto.res.estado, 400);
  const borrado = await llamar(router, 'DELETE', '/api/admin/usuarios/2', { usuario: admin });
  assert.equal(borrado.res.estado, 200);
  const auditorias = db.vecesQue(/INSERT INTO logs_admin/);
  assert.deepEqual(auditorias.map((a) => a.params[2]), ['cambiar_rol', 'eliminar_usuario']);
  assert.equal(auditorias[0].params[0], 1);
});

test('exportación CSV: cabeceras de descarga y auditoría', async () => {
  const { router, db } = entorno([
    [/FROM mensajes ORDER BY fecha DESC$/, [{ nombre: '=HYPERLINK("x")', email: 'a@b.co', mensaje: 'hola', leido: 0, fecha: '2026-10-21 10:00:00' }]],
    [/INSERT INTO logs_admin/, {}],
  ]);
  const { res } = await llamar(router, 'GET', '/api/admin/mensajes/exportar.csv', { usuario: usuarioFila({ rol: 'moderador' }) });
  assert.match(res.cabeceras['Content-Type'], /text\/csv/);
  assert.match(res.cabeceras['Content-Disposition'], /attachment; filename=mensajes_conexion_total\.csv/);
  assert.ok(res.cuerpo.includes("'=HYPERLINK"));
  assert.equal(db.vecesQue(/INSERT INTO logs_admin/).length, 1);
});

test('facturas del panel: filtros parametrizados, estado validado y cliente inexistente rechazado', async () => {
  const { router, db } = entorno([
    [/COUNT\(\*\) AS total FROM facturas f/, [{ total: 0 }]],
    [/FROM facturas f JOIN usuarios u/, []],
    [/FROM usuarios ORDER BY nombre/, []],
    [/SELECT id FROM usuarios WHERE id/, []],
  ]);
  const admin = usuarioFila({ rol: 'administrador' });
  const lista = await llamar(router, 'GET', '/api/admin/facturas', {
    usuario: admin,
    query: { usuario_id: "1; DROP TABLE usuarios", estado: 'pagada', fecha_desde: '2026-01-01', fecha_hasta: "2026-01-31' OR 1=1" },
  });
  assert.equal(lista.res.estado, 200);
  const conteo = db.vecesQue(/COUNT\(\*\) AS total FROM facturas f/)[0];
  assert.deepEqual(conteo.params, ['pagada', '2026-01-01']);
  assert.ok(!conteo.sql.includes('DROP'));

  const sinCliente = await llamar(router, 'POST', '/api/admin/facturas', {
    usuario: admin, body: { usuario_id: '999', estado: 'pendiente', monto: '10' },
  });
  assert.equal(sinCliente.res.estado, 400);
  const estadoMalo = await llamar(router, 'POST', '/api/admin/facturas/3/estado', { usuario: admin, body: { estado: 'regalada' } });
  assert.equal(estadoMalo.res.estado, 400);
});

test('contacto: valida, exige CAPTCHA, limita envíos y avisa a la empresa', async () => {
  let captcha = true;
  const { router, db, correos } = entorno([[/INSERT INTO mensajes/, {}]], { verificarTurnstile: async () => captcha });
  const cuerpo = { nombre: 'Ana', email: 'ana@correo.com', mensaje: 'Necesito cotizar fibra óptica' };

  captcha = false;
  assert.equal((await llamar(router, 'POST', '/api/contacto', { body: cuerpo })).res.estado, 400);
  captcha = true;
  const invalido = await llamar(router, 'POST', '/api/contacto', { body: { ...cuerpo, mensaje: 'corto' } });
  assert.equal(invalido.res.estado, 400);
  assert.ok(invalido.res.cuerpo.errors.mensaje);
  assert.equal(db.vecesQue(/INSERT INTO mensajes/).length, 0);

  for (let i = 0; i < 3; i += 1) assert.equal((await llamar(router, 'POST', '/api/contacto', { body: cuerpo })).res.estado, 201);
  assert.equal(correos.length, 3);
  assert.equal((await llamar(router, 'POST', '/api/contacto', { body: cuerpo })).res.estado, 429);
});

test('reseñas: quedan sin aprobar por defecto y validan calificación', async () => {
  const { router, db } = entorno([[/INSERT INTO resenas/, {}]]);
  const mala = await llamar(router, 'POST', '/api/resenas', { body: { comentario: 'Muy bueno todo', calificacion: 7 } });
  assert.equal(mala.res.estado, 400);
  const ok = await llamar(router, 'POST', '/api/resenas', { body: { comentario: 'Muy bueno todo', calificacion: 5 } });
  assert.equal(ok.res.estado, 201);
  assert.ok(!/aprobada/.test(db.llamadas[0].sql));
  assert.deepEqual(db.llamadas[0].params, ['Anónimo', 'Muy bueno todo', 5]);
});

test('/api/session no filtra secretos y /api/home arma las URLs de imágenes', async () => {
  const { router } = entorno([
    [/FROM resenas WHERE aprobada/, [{ nombre: 'Luis', comentario: 'Excelente', calificacion: 5, fecha: '2026-10-01 10:00:00' }]],
    [/FROM productos WHERE activo/, [{ nombre: 'A', descripcion: 'd', imagen: 'a.jpg' }, { nombre: 'B', descripcion: 'd', imagen: null }]],
  ]);
  const ses = await llamar(router, 'GET', '/api/session', { session: { csrf: 'tok' } });
  const texto = JSON.stringify(ses.res.cuerpo);
  assert.equal(ses.res.cuerpo.csrfToken, 'tok');
  assert.equal(ses.res.cuerpo.config.googleDisponible, true);
  for (const secreto of ['sec', config.claveSecreta, 'MAIL_PASSWORD']) assert.ok(!texto.includes(`"${secreto}"`));
  const home = await llamar(router, 'GET', '/api/home');
  assert.deepEqual(home.res.cuerpo.productos.map((p) => p.imagen), ['/media/productos/a.jpg', '/imagenes/logee.png']);
});

test('Google: rechaza state falso, correo no verificado y bloquea cuentas pre-registradas', async () => {
  let perfil = { sub: 'g1', email: 'ana@correo.com', email_verified: true, name: 'Ana', nonce: 'N' };
  const { router, db } = entorno(
    [
      [/FROM usuarios WHERE google_id = \? OR email/, [usuarioFila({ email_verificado: 0 })]],
      [/UPDATE usuarios SET google_id/, {}],
    ],
    { google: { urlAutorizacion: async () => 'https://accounts.google.com/o', obtenerPerfil: async () => perfil } },
  );
  const inicio = await llamar(router, 'GET', '/login/google', { session: { csrf: 'c' } });
  assert.equal(inicio.res.redireccion, 'https://accounts.google.com/o');
  const { state } = inicio.req.session.oauth;

  const falso = await llamar(router, 'GET', '/login/google/callback', { query: { state: 'x'.repeat(state.length), code: 'c' }, session: { csrf: 'c', oauth: inicio.req.session.oauth } });
  assert.match(falso.res.redireccion, /^\/login\?error=/);
  const sinSesion = await llamar(router, 'GET', '/login/google/callback', { query: { state, code: 'c' }, session: { csrf: 'c' } });
  assert.match(sinSesion.res.redireccion, /^\/login\?error=/);

  perfil = { ...perfil, email_verified: false };
  const noVerificado = await llamar(router, 'GET', '/login/google/callback', { query: { state, code: 'c' }, session: { csrf: 'c', oauth: { ...inicio.req.session.oauth } } });
  assert.match(noVerificado.res.redireccion, /^\/login\?error=/);
  assert.equal(db.vecesQue(/UPDATE usuarios/).length, 0);

  perfil = { ...perfil, email_verified: true };
  const ok = await llamar(router, 'GET', '/login/google/callback', { query: { state, code: 'c' }, session: { csrf: 'c', oauth: { ...inicio.req.session.oauth } } });
  assert.equal(ok.res.redireccion, '/perfil');
  assert.equal(ok.req.session.uid, 7);
  assert.match(db.vecesQue(/UPDATE usuarios/)[0].sql, /password = NULL/);
});

test('Google con 2FA activo pide el código antes de abrir sesión; usuario nuevo se crea verificado', async () => {
  let existentes = [usuarioFila({ totp_habilitado: 1 })];
  const { router, db } = entorno(
    [
      [/FROM usuarios WHERE google_id = \? OR email/, () => existentes],
      [/UPDATE usuarios SET google_id/, {}],
      [/INSERT INTO usuarios/, { insertId: 21 }],
    ],
    { google: { urlAutorizacion: async () => 'u', obtenerPerfil: async () => ({ sub: 'g1', email: 'ana@correo.com', email_verified: true, name: 'Ana' }) } },
  );
  const oauth = { state: 's'.repeat(32), nonce: 'n', hasta: Date.now() + 60_000 };
  const con2fa = await llamar(router, 'GET', '/login/google/callback', { query: { state: oauth.state, code: 'c' }, session: { csrf: 'c', oauth: { ...oauth } } });
  assert.equal(con2fa.res.redireccion, '/login/verificar-2fa');
  assert.equal(con2fa.req.session.uid, undefined);
  assert.equal(con2fa.req.session.pendiente2fa.id, 7);

  existentes = [];
  const nuevo = await llamar(router, 'GET', '/login/google/callback', { query: { state: oauth.state, code: 'c' }, session: { csrf: 'c', oauth: { ...oauth } } });
  assert.equal(nuevo.res.redireccion, '/perfil');
  assert.equal(nuevo.req.session.uid, 21);
  assert.match(db.vecesQue(/INSERT INTO usuarios/)[0].sql, /email_verificado.*TRUE/s);
});

test('CSRF: bloquea escrituras sin token o con token ajeno, deja pasar lecturas', () => {
  const token = nuevoTokenCsrf();
  const ejecutar = (metodo, cabecera, sesion = { csrf: token }) => {
    let resultado = 'next';
    const res = { status(n) { resultado = n; return this; }, json() { return this; } };
    protegerCsrf({ method: metodo, session: sesion, get: () => cabecera }, res, () => {});
    return resultado;
  };
  assert.equal(ejecutar('POST', undefined), 403);
  assert.equal(ejecutar('POST', 'otro'), 403);
  assert.equal(ejecutar('POST', token.slice(0, -1)), 403);
  assert.equal(ejecutar('DELETE', ''), 403);
  assert.equal(ejecutar('POST', token, {}), 403);
  assert.equal(ejecutar('POST', token), 'next');
  assert.equal(ejecutar('GET', undefined), 'next');
});

test('cargarUsuario: el rol sale siempre de la base de datos y una cuenta borrada pierde la sesión', async () => {
  let fila = [usuarioFila({ rol: 'administrador' })];
  const db = crearDbFalsa([[/FROM usuarios WHERE id/, () => fila]]);
  const mw = cargarUsuario(db);
  const req = { session: { uid: 7, csrf: 'c', rol: 'administrador' } };
  await new Promise((r) => mw(req, {}, r));
  assert.equal(req.usuario.rol, 'administrador');

  fila = [usuarioFila({ rol: 'usuario' })];
  const req2 = { session: { uid: 7, csrf: 'c' } };
  await new Promise((r) => mw(req2, {}, r));
  assert.equal(req2.usuario.rol, 'usuario');

  fila = [];
  const req3 = { session: { uid: 7, csrf: 'c' } };
  await new Promise((r) => mw(req3, {}, r));
  assert.equal(req3.usuario, null);
  assert.equal(req3.session.uid, undefined);

  const req4 = { session: { csrf: 'c' } };
  await new Promise((r) => mw(req4, {}, r));
  assert.equal(req4.usuario, null);
});

test('requiereRol deja pasar solo a los roles indicados', () => {
  const probar = (usuario) => {
    let r = 'next';
    const res = { status(n) { r = n; return this; }, json() { return this; } };
    requiereRol('administrador')({ usuario }, res, () => {});
    return r;
  };
  assert.equal(probar(null), 401);
  assert.equal(probar({ rol: 'moderador' }), 404);
  assert.equal(probar({ rol: 'administrador' }), 'next');
});

test('metadatos SEO: título por página, noindex en privadas y escape de HTML', () => {
  const plantilla = '<head><title>x</title>\n<meta name="description" content="viejo">\n<!--META--></head>';
  const base = { baseUrl: 'https://ct.example', empresa: 'Conexión "Total"' };
  const inicio = inyectarMeta(plantilla, { ...base, ruta: '/' });
  assert.match(inicio, /<title>Conexión Total Ingeniería S\.A\.S\. — Inicio<\/title>/);
  assert.ok(inicio.includes('<link rel="canonical" href="https://ct.example/">'));
  assert.ok(!inicio.includes('noindex'));
  assert.ok(!inicio.includes('viejo'));
  assert.ok(inicio.includes('Conexión &quot;Total&quot;'));
  assert.ok(inyectarMeta(plantilla, { ...base, ruta: '/perfil' }).includes('noindex'));
  assert.ok(inyectarMeta(plantilla, { ...base, ruta: '/admin/usuarios' }).includes('noindex'));
  assert.equal(paginaDe('/no-existe'), null);
  assert.ok(paginaDe('/restablecer/abc'));
  assert.ok(inyectarMeta(plantilla, { ...base, ruta: '/<script>' }).includes('noindex'));
  assert.ok(!inyectarMeta(plantilla, { ...base, ruta: '/"><script>' }).includes('"><script>'));
});

test('configuración: valores por defecto seguros y clave temporal con aviso', () => {
  const avisos = [];
  const c = cargarConfig({}, { warn: (m) => avisos.push(m) });
  assert.equal(c.puerto, 5000);
  assert.equal(c.cspModo, 'enforce');
  assert.equal(c.trustProxy, 1);
  assert.equal(c.cookieSegura, false);
  assert.equal(c.claveSecreta.length, 64);
  assert.equal(avisos.length, 1);
  const prod = cargarConfig({ SECRET_KEY: 'k'.repeat(32), BASE_URL: 'https://miempresa.com/', TRUST_PROXY: 'false', FACTURAS_FOLDER: '/var/privado/facturas' }, { warn() {} });
  assert.equal(prod.baseUrl, 'https://miempresa.com');
  assert.equal(prod.cookieSegura, true);
  assert.equal(prod.trustProxy, false);
  assert.equal(prod.carpetas.facturas, '/var/privado/facturas');
});
