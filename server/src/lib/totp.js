import crypto from 'node:crypto';

const ALFABETO_B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Codificar(buffer) {
  let bits = 0;
  let valor = 0;
  let salida = '';
  for (const byte of buffer) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      salida += ALFABETO_B32[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) salida += ALFABETO_B32[(valor << (5 - bits)) & 31];
  return salida;
}

export function base32Decodificar(texto) {
  const limpio = texto.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let valor = 0;
  const bytes = [];
  for (const caracter of limpio) {
    const indice = ALFABETO_B32.indexOf(caracter);
    if (indice === -1) throw new Error('Secreto base32 inválido');
    valor = (valor << 5) | indice;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generarSecretoTotp() {
  return base32Codificar(crypto.randomBytes(20));
}

function hotp(secretoB32, contador, digitos = 6) {
  const clave = base32Decodificar(secretoB32);
  const mensaje = Buffer.alloc(8);
  mensaje.writeBigUInt64BE(BigInt(contador));
  const hmac = crypto.createHmac('sha1', clave).update(mensaje).digest();
  const desplazamiento = hmac[hmac.length - 1] & 0x0f;
  const codigo = (hmac.readUInt32BE(desplazamiento) & 0x7fffffff) % 10 ** digitos;
  return String(codigo).padStart(digitos, '0');
}

export function generarTotp(secretoB32, momentoSegundos = Date.now() / 1000, paso = 30, digitos = 6) {
  return hotp(secretoB32, Math.floor(momentoSegundos / paso), digitos);
}

export function verificarTotp(secretoB32, codigo, ventana = 1, paso = 30, momentoSegundos = Date.now() / 1000) {
  const limpio = typeof codigo === 'string' ? codigo.trim() : '';
  if (!/^\d{6}$/.test(limpio)) return false;
  const t = Math.floor(momentoSegundos / paso);
  let coincide = false;
  for (let delta = -ventana; delta <= ventana; delta += 1) {
    const esperado = Buffer.from(hotp(secretoB32, t + delta));
    const recibido = Buffer.from(limpio);
    if (crypto.timingSafeEqual(esperado, recibido)) coincide = true;
  }
  return coincide;
}

export function totpUri(secretoB32, email, emisor = 'Nodalia Ingenieria') {
  const etiqueta = encodeURIComponent(`${emisor}:${email}`);
  const parametros = new URLSearchParams({ secret: secretoB32, issuer: emisor });
  return `otpauth://totp/${etiqueta}?${parametros.toString()}`;
}
