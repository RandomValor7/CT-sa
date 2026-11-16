import { envolver, requiereSesion, usuarioPublico, fotoPerfilUrl } from '../middleware.js';
import { generarSecretoTotp, totpUri, verificarTotp } from '../lib/totp.js';
import { validarPerfil, ESTADOS_FACTURA_VALIDOS, texto } from '../lib/validate.js';
import { guardarArchivo, borrarArchivo, rutaSegura, recibirArchivo, EXT_IMAGENES, EXT_FACTURAS } from '../lib/uploads.js';
import { generarTokenVerificacion } from '../lib/tokens.js';
import { LIMITES } from '../lib/ratelimit.js';
import { COLUMNAS_FACTURA, facturaPublica, estadosParaCliente, paginar, entero } from './comun.js';

export function montar(router, { config, db, limitador, correo, subida = recibirArchivo }) {
  router.use(['/api/perfil', '/api/mis-facturas'], requiereSesion);

  router.get('/api/perfil', envolver(async (req, res) => {
    const facturas = await db.query(
      `SELECT ${COLUMNAS_FACTURA} FROM facturas WHERE usuario_id = ? ORDER BY fecha_subida DESC LIMIT 5`,
      [req.usuario.id],
    );
    const total = await db.query('SELECT COUNT(*) AS total FROM facturas WHERE usuario_id = ?', [req.usuario.id]);
    res.json({
      usuario: usuarioPublico(req.usuario),
      facturas: facturas.map((f) => facturaPublica(f)),
      totalFacturas: Number(total[0]?.total ?? 0),
    });
  }));

  router.put('/api/perfil', envolver(async (req, res) => {
    const { datos, errores } = validarPerfil(req.body);
    if (errores) return res.status(400).json({ message: 'Revisa los campos del formulario.', errors: errores });

    const cambioCorreo = datos.email.toLowerCase() !== req.usuario.email.toLowerCase();
    if (cambioCorreo) {
      const otro = await db.query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [datos.email, req.usuario.id]);
      if (otro.length > 0) {
        return res.status(400).json({
          message: 'Ese correo ya está en uso por otra cuenta.',
          errors: { email: 'Ese correo ya está en uso por otra cuenta.' },
        });
      }
    }

    await db.query(
      'UPDATE usuarios SET nombre = ?, email = ?, email_verificado = ? WHERE id = ?',
      [datos.nombre, datos.email, cambioCorreo ? false : Boolean(req.usuario.email_verificado), req.usuario.id],
    );
    if (cambioCorreo) {
      const token = generarTokenVerificacion(config.claveSecreta, datos.email);
      correo.enviar(
        datos.email,
        'Verifica tu correo — Nodalia Ingeniería',
        `Hola ${datos.nombre},\n\nConfirma tu nuevo correo con este enlace (válido por 24 horas):\n\n${config.baseUrl}/verificar/${token}`,
      );
    }
    const filas = await db.query(
      'SELECT id, nombre, email, rol, profile_picture, email_verificado, totp_habilitado FROM usuarios WHERE id = ?',
      [req.usuario.id],
    );
    return res.json({ usuario: usuarioPublico(filas[0]), message: 'Tus datos fueron actualizados correctamente.' });
  }));

  router.post('/api/perfil/foto', subida('profile_picture'), envolver(async (req, res) => {
    const nombre = await guardarArchivo(req.file, config.carpetas.uploads, EXT_IMAGENES, { comprimir: true, anchoMaximo: 500 });
    const anterior = await db.query('SELECT profile_picture FROM usuarios WHERE id = ?', [req.usuario.id]);
    await db.query('UPDATE usuarios SET profile_picture = ? WHERE id = ?', [nombre, req.usuario.id]);
    await borrarArchivo(config.carpetas.uploads, anterior[0]?.profile_picture);
    res.json({ foto_perfil: fotoPerfilUrl(nombre), message: 'Foto de perfil actualizada exitosamente.' });
  }));

  router.post('/api/perfil/facturas', subida('factura'), envolver(async (req, res) => {
    const nombre = await guardarArchivo(req.file, config.carpetas.facturas, EXT_FACTURAS);
    await db.query('INSERT INTO facturas (usuario_id, filename) VALUES (?, ?)', [req.usuario.id, nombre]);
    res.status(201).json({ message: 'Factura subida exitosamente.' });
  }));

  router.get('/api/perfil/facturas/:id/descargar', envolver(async (req, res) => {
    const id = entero(req.params.id);
    const filas = id ? await db.query('SELECT filename FROM facturas WHERE id = ? AND usuario_id = ?', [id, req.usuario.id]) : [];
    const ruta = filas[0]?.filename ? rutaSegura(config.carpetas.facturas, filas[0].filename) : null;
    if (!ruta) return res.status(404).json({ message: 'No encontrado.' });
    return res.download(ruta, filas[0].filename, { dotfiles: 'deny' });
  }));

  router.get('/api/mis-facturas', envolver(async (req, res) => {
    const estado = texto(req.query.estado);
    const filtrar = ESTADOS_FACTURA_VALIDOS.has(estado);
    const where = filtrar ? 'WHERE usuario_id = ? AND estado = ?' : 'WHERE usuario_id = ?';
    const params = filtrar ? [req.usuario.id, estado] : [req.usuario.id];
    const pagina = await paginar(db, {
      contar: { sql: `SELECT COUNT(*) AS total FROM facturas ${where}`, params },
      listar: {
        sql: `SELECT ${COLUMNAS_FACTURA} FROM facturas ${where} ORDER BY fecha_subida DESC LIMIT ? OFFSET ?`,
        params,
      },
      pagina: req.query.pagina,
      porPagina: config.itemsPorPagina,
    });
    res.json({ ...pagina, items: pagina.items.map((f) => facturaPublica(f)), estados: estadosParaCliente() });
  }));

  router.get('/api/mis-facturas/:id', envolver(async (req, res) => {
    const id = entero(req.params.id);
    const filas = id ? await db.query(`SELECT ${COLUMNAS_FACTURA} FROM facturas WHERE id = ? AND usuario_id = ?`, [id, req.usuario.id]) : [];
    if (!filas[0]) return res.status(404).json({ message: 'No encontrado.' });
    return res.json({ factura: facturaPublica(filas[0], { conNotas: true }) });
  }));

  async function bloqueado2fa(req) {
    const { maximo, ventana } = LIMITES.login;
    return limitador.excedido('login', `2fa:${req.usuario.id}`, maximo, ventana);
  }

  router.post('/api/perfil/2fa/iniciar', envolver(async (req, res) => {
    if (req.usuario.totp_habilitado) {
      return res.status(400).json({ message: 'La verificación en dos pasos ya está activada en tu cuenta.' });
    }
    const secreto = generarSecretoTotp();
    req.session.secreto2fa = secreto;
    res.json({ secreto, otpauthUri: totpUri(secreto, req.usuario.email) });
  }));

  router.post('/api/perfil/2fa/activar', envolver(async (req, res) => {
    if (req.usuario.totp_habilitado) {
      return res.status(400).json({ message: 'La verificación en dos pasos ya está activada en tu cuenta.' });
    }
    const secreto = req.session.secreto2fa;
    if (!secreto) return res.status(400).json({ message: 'La sesión de configuración expiró, empieza de nuevo.' });
    if (await bloqueado2fa(req)) {
      return res.status(429).json({ message: 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.' });
    }
    if (!verificarTotp(secreto, texto(req.body?.codigo))) {
      await limitador.registrar('login', `2fa:${req.usuario.id}`);
      return res.status(400).json({ message: 'El código no coincide. Revisa la hora de tu teléfono e inténtalo otra vez.' });
    }
    await db.query('UPDATE usuarios SET totp_secret = ?, totp_habilitado = TRUE WHERE id = ?', [secreto, req.usuario.id]);
    delete req.session.secreto2fa;
    return res.json({ message: '¡Verificación en dos pasos activada! La necesitarás en tu próximo inicio de sesión.' });
  }));

  router.post('/api/perfil/2fa/desactivar', envolver(async (req, res) => {
    if (!req.usuario.totp_habilitado) return res.json({ message: 'La verificación en dos pasos no estaba activada.' });
    if (await bloqueado2fa(req)) {
      return res.status(429).json({ message: 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.' });
    }
    const filas = await db.query('SELECT totp_secret FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (!filas[0]?.totp_secret || !verificarTotp(filas[0].totp_secret, texto(req.body?.codigo))) {
      await limitador.registrar('login', `2fa:${req.usuario.id}`);
      return res.status(400).json({ message: 'Escribe el código actual de tu app autenticadora para desactivarla.' });
    }
    await db.query('UPDATE usuarios SET totp_secret = NULL, totp_habilitado = FALSE WHERE id = ?', [req.usuario.id]);
    return res.json({ message: 'Verificación en dos pasos desactivada.' });
  }));
}
