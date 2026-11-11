import crypto from 'node:crypto';
import { envolver, iniciarSesion, cerrarSesion, requiereSesion, usuarioPublico } from '../middleware.js';
import { googleDisponible } from '../config.js';
import { generarHash, verificarHash, HASH_FALSO } from '../lib/password.js';
import { verificarTotp } from '../lib/totp.js';
import {
  generarTokenRecuperacion, verificarTokenRecuperacion, huellaPassword,
  generarTokenVerificacion, verificarTokenVerificacion,
} from '../lib/tokens.js';
import { validarRegistro, validarLogin, validarRestablecer, esEmailValido, texto } from '../lib/validate.js';
import { LIMITES } from '../lib/ratelimit.js';

const VIGENCIA_2FA_MS = 10 * 60 * 1000;
const COLUMNAS_USUARIO = 'id, nombre, email, rol, profile_picture, email_verificado, totp_habilitado';

export function montar(router, { config, db, limitador, correo, google }) {
  async function excedido(accion, clave) {
    const { maximo, ventana } = LIMITES[accion];
    return limitador.excedido(accion, clave, maximo, ventana);
  }

  async function enviarVerificacion(nombre, email) {
    const token = generarTokenVerificacion(config.claveSecreta, email);
    const enlace = `${config.baseUrl}/verificar/${token}`;
    return correo.enviar(
      email,
      'Verifica tu correo — Conexión Total Ingeniería',
      `Hola ${nombre},\n\nConfirma tu correo con este enlace (válido por 24 horas):\n\n${enlace}\n\n`
        + 'Si tú no creaste esta cuenta, puedes ignorar este correo.',
    );
  }

  async function completarInicio(req, res, usuario) {
    const csrfToken = iniciarSesion(req, usuario.id);
    return res.json({ usuario: usuarioPublico(usuario), csrfToken });
  }

  function pedirSegundoFactor(req, res, usuario) {
    const csrfToken = req.session.csrf;
    req.session = { csrf: csrfToken, pendiente2fa: { id: usuario.id, hasta: Date.now() + VIGENCIA_2FA_MS } };
    return res.json({ requiere2fa: true, csrfToken });
  }

  router.post('/api/auth/registro', envolver(async (req, res) => {
    const ip = req.ip || 'desconocida';
    if (await excedido('registro', ip)) {
      return res.status(429).json({ message: 'Demasiados registros desde esta conexión. Espera unos minutos.' });
    }
    const { datos, errores } = validarRegistro(req.body);
    if (errores) return res.status(400).json({ message: 'Revisa los campos del formulario.', errors: errores });

    const existente = await db.query('SELECT id FROM usuarios WHERE email = ?', [datos.email]);
    if (existente.length > 0) {
      return res.status(400).json({
        message: 'Ese correo ya está registrado. Intenta iniciar sesión.',
        errors: { email: 'Ese correo ya está registrado.' },
      });
    }

    await limitador.registrar('registro', ip);
    const hash = await generarHash(datos.password);
    await db.query('INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)', [datos.nombre, datos.email, hash]);
    enviarVerificacion(datos.nombre, datos.email);
    return res.status(201).json({
      message: 'Registro exitoso. Te enviamos un correo para verificar tu cuenta — ya puedes iniciar sesión mientras tanto.',
    });
  }));

  router.post('/api/auth/login', envolver(async (req, res) => {
    const ip = req.ip || 'desconocida';
    if (await excedido('login', ip)) {
      return res.status(429).json({ message: 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.' });
    }
    const { datos, errores } = validarLogin(req.body);
    if (errores) return res.status(400).json({ message: 'Revisa los campos del formulario.', errors: errores });

    const filas = await db.query(`SELECT ${COLUMNAS_USUARIO}, password FROM usuarios WHERE email = ?`, [datos.email]);
    const usuario = filas[0];
    const coincide = await verificarHash(usuario?.password || HASH_FALSO, datos.password);

    if (usuario && usuario.password && coincide) {
      await limitador.limpiar('login', ip);
      if (usuario.totp_habilitado) return pedirSegundoFactor(req, res, usuario);
      return completarInicio(req, res, usuario);
    }

    await limitador.registrar('login', ip);
    if (usuario && !usuario.password) {
      return res.status(401).json({ message: 'Esta cuenta usa inicio de sesión con Google. Usa el botón "Continuar con Google".' });
    }
    return res.status(401).json({ message: 'Credenciales incorrectas. Inténtalo nuevamente.' });
  }));

  router.post('/api/auth/2fa/verificar', envolver(async (req, res) => {
    const pendiente = req.session.pendiente2fa;
    if (!pendiente || pendiente.hasta < Date.now()) {
      return res.status(400).json({ message: 'La verificación expiró. Inicia sesión de nuevo.' });
    }
    const clave = `2fa:${pendiente.id}`;
    if (await excedido('login', clave)) {
      return res.status(429).json({ message: 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.' });
    }
    const filas = await db.query(`SELECT ${COLUMNAS_USUARIO}, totp_secret FROM usuarios WHERE id = ?`, [pendiente.id]);
    const usuario = filas[0];
    if (usuario?.totp_secret && verificarTotp(usuario.totp_secret, texto(req.body?.codigo))) {
      await limitador.limpiar('login', clave);
      return completarInicio(req, res, usuario);
    }
    await limitador.registrar('login', clave);
    return res.status(400).json({ message: 'Código incorrecto o expirado. Inténtalo de nuevo.' });
  }));

  router.post('/api/auth/logout', (req, res) => {
    const csrfToken = cerrarSesion(req);
    res.json({ message: 'Sesión cerrada con éxito.', csrfToken });
  });

  router.post('/api/auth/verificar-email', envolver(async (req, res) => {
    const email = verificarTokenVerificacion(config.claveSecreta, req.body?.token);
    if (!email) {
      return res.status(400).json({ message: 'El enlace de verificación no es válido o ya expiró. Puedes pedir uno nuevo desde tu perfil.' });
    }
    await db.query('UPDATE usuarios SET email_verificado = TRUE WHERE email = ?', [email]);
    return res.json({ message: '¡Tu correo fue verificado correctamente!' });
  }));

  router.post('/api/auth/reenviar-verificacion', requiereSesion, envolver(async (req, res) => {
    if (req.usuario.email_verificado) return res.json({ message: 'Tu correo ya está verificado.' });
    if (await excedido('reenvio', `u:${req.usuario.id}`)) {
      return res.status(429).json({ message: 'Ya te enviamos varios correos. Espera unos minutos antes de pedir otro.' });
    }
    await limitador.registrar('reenvio', `u:${req.usuario.id}`);
    const enviado = await enviarVerificacion(req.usuario.nombre, req.usuario.email);
    if (!enviado) {
      return res.status(502).json({ message: 'No se pudo enviar el correo. Inténtalo más tarde o avisa a la empresa.' });
    }
    return res.json({ message: 'Te reenviamos el correo de verificación. Revisa tu bandeja de entrada.' });
  }));

  router.post('/api/auth/recuperar', envolver(async (req, res) => {
    const ip = req.ip || 'desconocida';
    const email = texto(req.body?.email);
    if (!esEmailValido(email)) {
      return res.status(400).json({ message: 'Ingresa un correo electrónico válido.', errors: { email: 'Ingresa un correo electrónico válido.' } });
    }
    if (await excedido('recuperacion', ip)) {
      return res.status(429).json({ message: 'Demasiadas solicitudes. Espera unos minutos antes de intentar de nuevo.' });
    }
    await limitador.registrar('recuperacion', ip);

    const filas = await db.query('SELECT nombre, password FROM usuarios WHERE email = ?', [email]);
    if (filas[0]) {
      const token = generarTokenRecuperacion(config.claveSecreta, email, filas[0].password);
      const enlace = `${config.baseUrl}/restablecer/${token}`;
      correo.enviar(
        email,
        'Recupera tu contraseña — Conexión Total Ingeniería',
        `Hola ${filas[0].nombre},\n\nRecibimos una solicitud para restablecer tu contraseña. `
          + `Este enlace es válido por 30 minutos y solo puede usarse una vez:\n\n${enlace}\n\n`
          + 'Si tú no solicitaste esto, puedes ignorar este correo; tu contraseña actual seguirá funcionando.',
      );
    }
    return res.json({ message: 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.' });
  }));

  async function usuarioDeToken(token) {
    const datos = verificarTokenRecuperacion(config.claveSecreta, token);
    if (!datos) return null;
    const filas = await db.query('SELECT id, password FROM usuarios WHERE email = ?', [datos.email]);
    if (!filas[0] || huellaPassword(filas[0].password) !== datos.h) return null;
    return filas[0];
  }

  const MENSAJE_ENLACE = 'El enlace no es válido o ya expiró. Solicita uno nuevo.';

  router.get('/api/auth/restablecer/:token', envolver(async (req, res) => {
    if (!(await usuarioDeToken(req.params.token))) return res.status(400).json({ message: MENSAJE_ENLACE });
    return res.json({ valido: true });
  }));

  router.post('/api/auth/restablecer', envolver(async (req, res) => {
    const usuario = await usuarioDeToken(req.body?.token);
    if (!usuario) return res.status(400).json({ message: MENSAJE_ENLACE });
    const { datos, errores } = validarRestablecer(req.body);
    if (errores) return res.status(400).json({ message: 'Revisa los campos del formulario.', errors: errores });
    await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [await generarHash(datos.password), usuario.id]);
    return res.json({ message: 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.' });
  }));

  function errorGoogle(res, mensaje) {
    return res.redirect(`/login?error=${encodeURIComponent(mensaje)}`);
  }

  router.get('/login/google', envolver(async (req, res) => {
    if (!googleDisponible(config)) return errorGoogle(res, 'El inicio de sesión con Google no está configurado en este servidor.');
    const state = crypto.randomBytes(24).toString('base64url');
    const nonce = crypto.randomBytes(24).toString('base64url');
    req.session.oauth = { state, nonce, hasta: Date.now() + 10 * 60 * 1000 };
    return res.redirect(await google.urlAutorizacion({ state, nonce }));
  }));

  router.get('/login/google/callback', envolver(async (req, res) => {
    if (!googleDisponible(config)) return res.redirect('/login');
    const guardado = req.session.oauth;
    delete req.session.oauth;
    const state = String(req.query.state ?? '');
    const valido = guardado && guardado.hasta > Date.now()
      && state.length === guardado.state.length
      && crypto.timingSafeEqual(Buffer.from(state), Buffer.from(guardado.state));
    if (!valido || typeof req.query.code !== 'string') {
      return errorGoogle(res, 'No se pudo completar el inicio de sesión con Google. Intenta de nuevo.');
    }

    let perfil;
    try {
      perfil = await google.obtenerPerfil(req.query.code, guardado.nonce);
    } catch (err) {
      console.error('Error en la autenticación con Google:', err.message);
      return errorGoogle(res, 'No se pudo completar el inicio de sesión con Google. Intenta de nuevo.');
    }

    if (!perfil?.email) return errorGoogle(res, 'No se pudo obtener tu correo desde Google.');
    if (perfil.email_verified !== true) {
      return errorGoogle(res, 'Google indica que ese correo no está verificado, así que no se puede usar para iniciar sesión.');
    }

    const nombre = (perfil.name || perfil.email.split('@')[0]).slice(0, 50);
    const filas = await db.query(
      `SELECT ${COLUMNAS_USUARIO}, password FROM usuarios WHERE google_id = ? OR email = ?`,
      [perfil.sub, perfil.email],
    );
    let usuario = filas[0];

    if (usuario) {
      if (!usuario.email_verificado && usuario.password) {
        await db.query(
          'UPDATE usuarios SET google_id = ?, email_verificado = TRUE, password = NULL WHERE id = ?',
          [perfil.sub, usuario.id],
        );
      } else {
        await db.query('UPDATE usuarios SET google_id = ?, email_verificado = TRUE WHERE id = ?', [perfil.sub, usuario.id]);
      }
      if (usuario.totp_habilitado) {
        const csrf = req.session.csrf;
        req.session = { csrf, pendiente2fa: { id: usuario.id, hasta: Date.now() + VIGENCIA_2FA_MS } };
        return res.redirect('/login/verificar-2fa');
      }
    } else {
      const resultado = await db.query(
        'INSERT INTO usuarios (nombre, email, password, google_id, email_verificado) VALUES (?, ?, NULL, ?, TRUE)',
        [nombre, perfil.email, perfil.sub],
      );
      usuario = { id: resultado.insertId };
    }

    iniciarSesion(req, usuario.id);
    return res.redirect('/perfil');
  }));
}
