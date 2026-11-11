import test from 'node:test';
import assert from 'node:assert/strict';
import { generarHash, verificarHash } from '../src/lib/password.js';
import {
  base32Codificar, base32Decodificar, generarSecretoTotp, generarTotp, verificarTotp, totpUri,
} from '../src/lib/totp.js';
import {
  generarToken, verificarToken, generarTokenRecuperacion, verificarTokenRecuperacion,
  generarTokenVerificacion, verificarTokenVerificacion, huellaPassword, PROPOSITO_RECUPERACION,
} from '../src/lib/tokens.js';
import { generarCsv } from '../src/lib/csv.js';
import { crearLimitador } from '../src/lib/ratelimit.js';
import { construirCsp, cspComoTexto } from '../src/lib/csp.js';

const HASH_WERKZEUG_SCRYPT = 'scrypt:32768:8:1$LLqpvhy65N8ACEls$c6ad4f3b139637f1fe213f3f4130f530ff6a42a147eca1da30b8d83712509efa11e02e9c6c2ebb5afb4c8f6e007ebad59da0917a53b53e38a5f66e586bde4db5';
const HASH_WERKZEUG_PBKDF2 = 'pbkdf2:sha256:1000000$YL9XpGQJXjRIqY4W$81e6e08bb4d9fc59c1ab76750f689cd6c185c0f29ca80bd260899a41cf9a6626';

test('acepta hashes scrypt generados por Werkzeug (usuarios de la base actual)', async () => {
  assert.equal(await verificarHash(HASH_WERKZEUG_SCRYPT, 'Clave123'), true);
  assert.equal(await verificarHash(HASH_WERKZEUG_SCRYPT, 'clave123'), false);
});

test('acepta hashes pbkdf2 generados por Werkzeug, incluida la ñ', async () => {
  assert.equal(await verificarHash(HASH_WERKZEUG_PBKDF2, 'Contraseña-ñ9'), true);
  assert.equal(await verificarHash(HASH_WERKZEUG_PBKDF2, 'Contrasena-n9'), false);
});

test('los hashes nuevos usan el mismo formato y se verifican', async () => {
  const hash = await generarHash('NuevaClave789');
  assert.match(hash, /^scrypt:32768:8:1\$[A-Za-z0-9]{16}\$[0-9a-f]{128}$/);
  assert.equal(await verificarHash(hash, 'NuevaClave789'), true);
  assert.equal(await verificarHash(hash, 'otra'), false);
  assert.notEqual(await generarHash('NuevaClave789'), hash);
});

test('rechaza hashes mal formados o con parámetros abusivos', async () => {
  assert.equal(await verificarHash(null, 'x'), false);
  assert.equal(await verificarHash('texto-plano', 'x'), false);
  assert.equal(await verificarHash('scrypt:99999999999:8:1$sal$aa', 'x'), false);
  assert.equal(await verificarHash('md5$sal$aa', 'x'), false);
  assert.equal(await verificarHash('pbkdf2:sha256:999999999$sal$aa', 'x'), false);
});

test('TOTP coincide con los vectores del RFC 6238 (SHA-1)', () => {
  const secreto = base32Codificar(Buffer.from('12345678901234567890'));
  assert.equal(secreto, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  assert.equal(generarTotp(secreto, 59, 30, 8), '94287082');
  assert.equal(generarTotp(secreto, 1111111109, 30, 8), '07081804');
  assert.equal(generarTotp(secreto, 1234567890, 30, 8), '89005924');
  assert.equal(generarTotp(secreto, 2000000000, 30, 8), '69279037');
});

test('TOTP verifica con margen de ±1 paso y rechaza códigos inválidos', () => {
  const secreto = generarSecretoTotp();
  const ahora = 1_700_000_000;
  const codigo = generarTotp(secreto, ahora);
  assert.equal(verificarTotp(secreto, codigo, 1, 30, ahora), true);
  assert.equal(verificarTotp(secreto, codigo, 1, 30, ahora + 30), true);
  assert.equal(verificarTotp(secreto, codigo, 1, 30, ahora - 30), true);
  assert.equal(verificarTotp(secreto, codigo, 1, 30, ahora + 120), false);
  assert.equal(verificarTotp(secreto, '12345', 1, 30, ahora), false);
  assert.equal(verificarTotp(secreto, 'abcdef', 1, 30, ahora), false);
  assert.equal(verificarTotp(secreto, '', 1, 30, ahora), false);
  assert.equal(verificarTotp(secreto, undefined, 1, 30, ahora), false);
});

test('base32 ida y vuelta y URI otpauth', () => {
  const bytes = Buffer.from([1, 2, 3, 250, 251, 252, 0, 99, 100]);
  assert.deepEqual(base32Decodificar(base32Codificar(bytes)), bytes);
  assert.equal(generarSecretoTotp().length, 32);
  const uri = totpUri('ABCDEF234567', 'a@b.co');
  assert.ok(uri.startsWith('otpauth://totp/Conexion%20Total%20Ingenieria%3Aa%40b.co?'));
  assert.ok(uri.includes('secret=ABCDEF234567'));
});

test('tokens firmados: válidos, vencidos, manipulados y de otro propósito', () => {
  const secreto = 's3creto';
  const t0 = 1_700_000_000;
  const token = generarToken(secreto, 'x', { a: 1 }, t0);
  assert.deepEqual(verificarToken(secreto, 'x', token, 60, t0 + 30), { a: 1 });
  assert.equal(verificarToken(secreto, 'x', token, 60, t0 + 61), null);
  assert.equal(verificarToken('otro', 'x', token, 60, t0 + 1), null);
  assert.equal(verificarToken(secreto, 'y', token, 60, t0 + 1), null);
  assert.equal(verificarToken(secreto, 'x', `${token}a`, 60, t0 + 1), null);
  assert.equal(verificarToken(secreto, 'x', 'basura', 60, t0 + 1), null);
  assert.equal(verificarToken(secreto, 'x', undefined, 60, t0 + 1), null);
  const [carga, firma] = token.split('.');
  const adulterada = Buffer.from(JSON.stringify({ d: { a: 2 }, t: t0 })).toString('base64url');
  assert.equal(verificarToken(secreto, 'x', `${adulterada}.${firma}`, 60, t0 + 1), null);
  assert.ok(carga.length > 0);
});

test('el token de recuperación deja de servir cuando cambia la contraseña', () => {
  const secreto = 'abc';
  const token = generarTokenRecuperacion(secreto, 'u@x.co', 'hash-viejo');
  const datos = verificarTokenRecuperacion(secreto, token);
  assert.equal(datos.email, 'u@x.co');
  assert.equal(datos.h, huellaPassword('hash-viejo'));
  assert.notEqual(datos.h, huellaPassword('hash-nuevo'));
  const verificacion = generarTokenVerificacion(secreto, 'u@x.co');
  assert.equal(verificarTokenVerificacion(secreto, verificacion), 'u@x.co');
  assert.equal(verificarTokenRecuperacion(secreto, verificacion), null);
  assert.equal(verificarTokenVerificacion(secreto, token), null);
  assert.ok(PROPOSITO_RECUPERACION.length > 0);
});

test('CSV: comillas, saltos de línea, BOM y neutralización de fórmulas', () => {
  const csv = generarCsv(['Nombre', 'Mensaje'], [
    ['Ana', 'hola, "mundo"\nlínea 2'],
    ['=CMD()', '+1'],
    ['Ñandú', null],
  ]);
  assert.ok(csv.startsWith('﻿Nombre,Mensaje\r\n'));
  assert.ok(csv.includes('Ana,"hola, ""mundo""\nlínea 2"'));
  assert.ok(csv.includes("'=CMD(),'+1"));
  assert.ok(csv.includes('Ñandú,\r\n'));
});

test('límite de intentos en memoria: bloquea, vence la ventana y se limpia', async () => {
  let reloj = 1_000_000;
  const limitador = crearLimitador({ ahora: () => reloj });
  for (let i = 0; i < 4; i += 1) await limitador.registrar('login', '1.1.1.1');
  assert.equal(await limitador.excedido('login', '1.1.1.1', 5, 300), false);
  await limitador.registrar('login', '1.1.1.1');
  assert.equal(await limitador.excedido('login', '1.1.1.1', 5, 300), true);
  assert.equal(await limitador.excedido('login', '2.2.2.2', 5, 300), false);
  assert.equal(await limitador.excedido('contacto', '1.1.1.1', 5, 300), false);
  reloj += 301_000;
  assert.equal(await limitador.excedido('login', '1.1.1.1', 5, 300), false);
  await limitador.registrar('login', '3.3.3.3');
  await limitador.limpiar('login', '3.3.3.3');
  assert.equal(await limitador.excedido('login', '3.3.3.3', 1, 300), false);
});

test('límite de intentos con respaldo MySQL: usa la tabla intentos_seguridad', async () => {
  const llamadas = [];
  const db = {
    async query(sql, params) {
      llamadas.push({ sql, params });
      if (sql.startsWith('SELECT')) return [{ total: 5 }];
      return [];
    },
  };
  const limitador = crearLimitador({ db, backend: 'mysql' });
  assert.equal(await limitador.excedido('login', '9.9.9.9', 5, 300), true);
  await limitador.registrar('login', '9.9.9.9');
  assert.ok(llamadas.some((l) => l.sql.startsWith('INSERT INTO intentos_seguridad')));
});

test('CSP: solo habilita Turnstile y Analytics cuando están configurados', () => {
  const base = cspComoTexto(construirCsp());
  assert.ok(base.includes("script-src 'self'"));
  assert.ok(!base.includes('cloudflare'));
  assert.ok(!base.includes('googletagmanager'));
  assert.ok(base.includes("frame-src 'none'"));
  const completa = cspComoTexto(construirCsp({ analytics: true, turnstile: true }));
  assert.ok(completa.includes('https://challenges.cloudflare.com'));
  assert.ok(completa.includes('https://www.googletagmanager.com'));
  assert.ok(completa.includes("frame-ancestors 'none'"));
  assert.ok(completa.includes("object-src 'none'"));
});
