import crypto from 'node:crypto';

function b64url(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

function clavePara(secreto, proposito) {
  return crypto.createHmac('sha256', secreto).update(`ct-token:${proposito}`).digest();
}

function firmar(secreto, proposito, carga) {
  return b64url(crypto.createHmac('sha256', clavePara(secreto, proposito)).update(carga).digest());
}

export const PROPOSITO_RECUPERACION = 'recuperacion-contrasena';
export const PROPOSITO_VERIFICACION = 'verificacion-correo';
export const EXPIRACION_RECUPERACION_SEGUNDOS = 60 * 30;
export const EXPIRACION_VERIFICACION_SEGUNDOS = 60 * 60 * 24;

export function huellaPassword(hashPassword) {
  return crypto.createHash('sha256').update(String(hashPassword ?? '')).digest('hex').slice(0, 16);
}

export function generarToken(secreto, proposito, datos, ahoraSegundos = Math.floor(Date.now() / 1000)) {
  const carga = b64url(JSON.stringify({ d: datos, t: ahoraSegundos }));
  return `${carga}.${firmar(secreto, proposito, carga)}`;
}

export function verificarToken(secreto, proposito, token, maxEdadSegundos, ahoraSegundos = Math.floor(Date.now() / 1000)) {
  if (typeof token !== 'string' || token.length > 2000) return null;
  const partes = token.split('.');
  if (partes.length !== 2) return null;
  const [carga, firma] = partes;

  const esperada = Buffer.from(firmar(secreto, proposito, carga));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) return null;

  let contenido;
  try {
    contenido = JSON.parse(Buffer.from(carga, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!contenido || typeof contenido.t !== 'number') return null;

  const edad = ahoraSegundos - contenido.t;
  if (edad < 0 || edad > maxEdadSegundos) return null;
  return contenido.d;
}

export function generarTokenRecuperacion(secreto, email, hashPassword) {
  return generarToken(secreto, PROPOSITO_RECUPERACION, { email, h: huellaPassword(hashPassword) });
}

export function verificarTokenRecuperacion(secreto, token) {
  const datos = verificarToken(secreto, PROPOSITO_RECUPERACION, token, EXPIRACION_RECUPERACION_SEGUNDOS);
  if (!datos || typeof datos.email !== 'string' || typeof datos.h !== 'string') return null;
  return datos;
}

export function generarTokenVerificacion(secreto, email) {
  return generarToken(secreto, PROPOSITO_VERIFICACION, { email });
}

export function verificarTokenVerificacion(secreto, token) {
  const datos = verificarToken(secreto, PROPOSITO_VERIFICACION, token, EXPIRACION_VERIFICACION_SEGUNDOS);
  if (!datos || typeof datos.email !== 'string') return null;
  return datos.email;
}
