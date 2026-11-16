import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function entero(valor, defecto) {
  const n = Number.parseInt(valor, 10);
  return Number.isInteger(n) && n > 0 ? n : defecto;
}

function booleano(valor, defecto = false) {
  if (valor === undefined || valor === '') return defecto;
  return String(valor).toLowerCase() === 'true';
}

function proxyDe(valor) {
  if (valor === undefined || valor === '') return 1;
  if (String(valor).toLowerCase() === 'false') return false;
  if (String(valor).toLowerCase() === 'true') return true;
  const n = Number.parseInt(valor, 10);
  return Number.isInteger(n) && String(n) === String(valor).trim() ? n : valor;
}

export function cargarConfig(env = process.env, registro = console) {
  const puerto = entero(env.PORT, 5000);
  const baseUrl = (env.BASE_URL || `http://localhost:${puerto}`).replace(/\/+$/, '');
  const produccion = env.NODE_ENV === 'production';

  let claveSecreta = env.SECRET_KEY;
  if (!claveSecreta || claveSecreta.length < 16) {
    claveSecreta = crypto.randomBytes(32).toString('hex');
    registro.warn(
      'AVISO: SECRET_KEY no está definida (o es muy corta) en el .env. Se generó una clave temporal: '
        + 'las sesiones se cerrarán al reiniciar. Define una SECRET_KEY larga antes de producción.',
    );
  }

  const storage = path.resolve(RAIZ, env.STORAGE_DIR || 'storage');

  return {
    produccion,
    puerto,
    baseUrl,
    clientUrl: (env.CLIENT_URL || baseUrl).replace(/\/+$/, ''),
    trustProxy: proxyDe(env.TRUST_PROXY),
    forzarHttps: booleano(env.FORCE_HTTPS, false),
    cookieSegura: booleano(env.COOKIE_SECURE, baseUrl.startsWith('https://')),
    cspModo: ['enforce', 'report', 'off'].includes(env.CSP_MODO) ? env.CSP_MODO : 'enforce',
    claveSecreta,
    dist: path.resolve(RAIZ, 'client', 'dist'),
    db: {
      host: env.MYSQL_HOST || 'localhost',
      user: env.MYSQL_USER || 'root',
      password: env.MYSQL_PASSWORD || '',
      database: env.MYSQL_DB || 'nodalia',
      port: entero(env.MYSQL_PORT, 3306),
    },
    carpetas: {
      uploads: path.join(storage, 'uploads'),
      productos: path.join(storage, 'productos'),
      facturas: env.FACTURAS_FOLDER ? path.resolve(RAIZ, env.FACTURAS_FOLDER) : path.join(storage, 'facturas'),
    },
    mail: {
      servidor: env.MAIL_SERVER || 'smtp.gmail.com',
      puerto: entero(env.MAIL_PORT, 587),
      usuario: env.MAIL_USERNAME || '',
      clave: env.MAIL_PASSWORD || '',
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID || '',
      clientSecret: env.GOOGLE_CLIENT_SECRET || '',
    },
    analyticsId: env.GOOGLE_ANALYTICS_ID || '',
    turnstile: {
      siteKey: env.TURNSTILE_SITE_KEY || '',
      claveSecreta: env.TURNSTILE_SECRET_KEY || '',
    },
    limiteBackend: env.RATE_LIMIT_BACKEND === 'mysql' ? 'mysql' : 'memory',
    itemsPorPagina: entero(env.ADMIN_ITEMS_POR_PAGINA, 12),
    empresa: {
      nombre: 'Nodalia Ingeniería S.A.S.',
      whatsapp: env.EMPRESA_WHATSAPP || '573000000000',
      email: env.EMPRESA_EMAIL || 'contacto@nodalia.example',
      direccion: 'Carrera 00 # 00-00, Villa Aurora, Colombia (dirección ficticia de demostración)',
      telefonos: '300 000 0000 - 300 000 0001',
      nit: '900000000-0',
    },
  };
}

export const googleDisponible = (config) => Boolean(config.google.clientId && config.google.clientSecret);
