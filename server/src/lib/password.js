import crypto from 'node:crypto';

const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_DKLEN = 64;
const ALFABETO_SAL = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function scryptAsync(password, sal, dklen, opciones) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, sal, dklen, opciones, (err, clave) => (err ? reject(err) : resolve(clave)));
  });
}

function pbkdf2Async(password, sal, iteraciones, dklen, digest) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, sal, iteraciones, dklen, digest, (err, clave) => (err ? reject(err) : resolve(clave)));
  });
}

function generarSal(longitud = 16) {
  const bytes = crypto.randomBytes(longitud);
  let sal = '';
  for (let i = 0; i < longitud; i += 1) sal += ALFABETO_SAL[bytes[i] % ALFABETO_SAL.length];
  return sal;
}

function opcionesScrypt(n, r, p) {
  return { N: n, r, p, maxmem: 132 * n * r * p };
}

function iguales(a, b) {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function generarHash(password) {
  const sal = generarSal(16);
  const derivada = await scryptAsync(password, sal, SCRYPT_DKLEN, opcionesScrypt(SCRYPT_N, SCRYPT_R, SCRYPT_P));
  return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}$${sal}$${derivada.toString('hex')}`;
}

export async function verificarHash(hashGuardado, password) {
  if (typeof hashGuardado !== 'string' || typeof password !== 'string') return false;
  const partes = hashGuardado.split('$');
  if (partes.length !== 3) return false;

  const [metodo, sal, hashEsperado] = partes;
  const [algoritmo, ...parametros] = metodo.split(':');

  try {
    if (algoritmo === 'scrypt') {
      const n = Number(parametros[0]);
      const r = Number(parametros[1]);
      const p = Number(parametros[2]);
      if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p) || n < 2 || r < 1 || p < 1) return false;
      if (n > 1 << 20 || r > 64 || p > 16) return false;
      const derivada = await scryptAsync(password, sal, hashEsperado.length / 2, opcionesScrypt(n, r, p));
      return iguales(derivada.toString('hex'), hashEsperado);
    }

    if (algoritmo === 'pbkdf2') {
      const digest = parametros[0];
      const iteraciones = Number(parametros[1] ?? 1000000);
      if (!['sha1', 'sha256', 'sha512'].includes(digest)) return false;
      if (!Number.isInteger(iteraciones) || iteraciones < 1 || iteraciones > 5_000_000) return false;
      const derivada = await pbkdf2Async(password, sal, iteraciones, hashEsperado.length / 2, digest);
      return iguales(derivada.toString('hex'), hashEsperado);
    }
  } catch {
    return false;
  }

  return false;
}

export const HASH_FALSO = 'scrypt:32768:8:1$0000000000000000$' + '0'.repeat(128);
