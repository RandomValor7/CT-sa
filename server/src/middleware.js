import crypto from 'node:crypto';
import { construirCsp } from './lib/csp.js';

export const envolver = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export function nuevoTokenCsrf() {
  return crypto.randomBytes(32).toString('base64url');
}

export function asegurarCsrf(req, res, next) {
  if (!req.session.csrf) req.session.csrf = nuevoTokenCsrf();
  next();
}

export function protegerCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const recibido = Buffer.from(String(req.get('x-csrf-token') ?? ''));
  const esperado = Buffer.from(String(req.session.csrf ?? ''));
  if (esperado.length === 0 || recibido.length !== esperado.length || !crypto.timingSafeEqual(recibido, esperado)) {
    return res.status(403).json({ message: 'La sesión de seguridad expiró. Recarga la página e inténtalo de nuevo.' });
  }
  return next();
}

export function fotoPerfilUrl(archivo) {
  return archivo ? `/media/uploads/${archivo}` : '/imagenes/default.jpg';
}

export function usuarioPublico(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    email: fila.email,
    rol: fila.rol,
    foto_perfil: fotoPerfilUrl(fila.profile_picture),
    email_verificado: Boolean(fila.email_verificado),
    totp_habilitado: Boolean(fila.totp_habilitado),
  };
}

export function cargarUsuario(db) {
  return envolver(async (req, res, next) => {
    req.usuario = null;
    const id = Number(req.session.uid);
    if (Number.isInteger(id) && id > 0) {
      const filas = await db.query(
        'SELECT id, nombre, email, rol, profile_picture, email_verificado, totp_habilitado FROM usuarios WHERE id = ?',
        [id],
      );
      if (filas[0]) {
        req.usuario = filas[0];
      } else {
        req.session = { csrf: nuevoTokenCsrf() };
      }
    }
    next();
  });
}

export function iniciarSesion(req, usuarioId) {
  req.session = { uid: usuarioId, csrf: nuevoTokenCsrf() };
  return req.session.csrf;
}

export function cerrarSesion(req) {
  req.session = { csrf: nuevoTokenCsrf() };
  return req.session.csrf;
}

export function requiereSesion(req, res, next) {
  if (!req.usuario) return res.status(401).json({ message: 'Por favor, inicia sesión para continuar.' });
  return next();
}

export const requiereRol = (...roles) => (req, res, next) => {
  if (!req.usuario) return res.status(401).json({ message: 'Por favor, inicia sesión para continuar.' });
  if (!roles.includes(req.usuario.rol)) return res.status(404).json({ message: 'No encontrado.' });
  return next();
};

export const adminOModerador = requiereRol('administrador', 'moderador');
export const soloAdministrador = requiereRol('administrador');

export function configuracionHelmet(config) {
  const directivas = construirCsp({
    analytics: Boolean(config.analyticsId),
    turnstile: Boolean(config.turnstile.siteKey),
  });
  const opciones = {
    contentSecurityPolicy: config.cspModo === 'off'
      ? false
      : { useDefaults: false, directives: directivas, reportOnly: config.cspModo === 'report' },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    strictTransportSecurity: config.forzarHttps ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    frameguard: { action: 'deny' },
  };
  return opciones;
}

export function redirigirAHttps(req, res, next) {
  if (req.secure) return next();
  const host = req.get('host');
  return res.redirect(301, `https://${host}${req.originalUrl}`);
}

export function manejadorRutaApi(req, res) {
  res.status(404).json({ message: 'No encontrado.' });
}

export function crearManejadorErrores(registro = console) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    if (res.headersSent) return next(err);
    let estado = Number(err?.status ?? err?.statusCode) || 500;
    let mensaje = estado < 500 ? err.message : 'Ocurrió un error interno. Inténtalo de nuevo más tarde.';

    if (err?.type === 'entity.parse.failed') {
      estado = 400;
      mensaje = 'La solicitud no tiene un formato válido.';
    } else if (err?.type === 'entity.too.large') {
      estado = 413;
      mensaje = 'La solicitud es demasiado grande.';
    }

    if (estado >= 500) registro.error('Error interno:', err);
    return res.status(estado).json({ message: mensaje });
  };
}

export async function auditar(db, req, accion, detalle = '', registro = console) {
  try {
    await db.query(
      'INSERT INTO logs_admin (admin_id, admin_nombre, accion, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario?.id ?? null, req.usuario?.nombre ?? '?', accion, detalle],
    );
  } catch (err) {
    registro.error(`No se pudo registrar la entrada de auditoría: ${accion}`, err.message);
  }
}
