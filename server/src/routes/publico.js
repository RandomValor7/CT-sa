import { envolver, usuarioPublico } from '../middleware.js';
import { googleDisponible } from '../config.js';
import { validarContacto, validarResena } from '../lib/validate.js';
import { LIMITES } from '../lib/ratelimit.js';

export function urlProducto(archivo) {
  return archivo ? `/media/productos/${archivo}` : '/imagenes/logee.png';
}

export function montar(router, { config, db, limitador, correo, verificarTurnstile }) {
  router.get('/api/session', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({
      usuario: req.usuario ? usuarioPublico(req.usuario) : null,
      csrfToken: req.session.csrf,
      config: {
        googleDisponible: googleDisponible(config),
        turnstileSiteKey: config.turnstile.siteKey || null,
        googleAnalyticsId: config.analyticsId || null,
        empresa: config.empresa,
      },
    });
  });

  router.get('/api/home', envolver(async (req, res) => {
    const resenas = await db.query(
      'SELECT nombre, comentario, calificacion, fecha FROM resenas WHERE aprobada = TRUE ORDER BY fecha DESC LIMIT 9',
    );
    const productos = await db.query(
      'SELECT nombre, descripcion, imagen FROM productos WHERE activo = TRUE ORDER BY nombre ASC',
    );
    res.json({
      resenas,
      productos: productos.map((p) => ({ nombre: p.nombre, descripcion: p.descripcion, imagen: urlProducto(p.imagen) })),
    });
  }));

  async function limiteSuperado(accion, ip) {
    const { maximo, ventana } = LIMITES[accion];
    return limitador.excedido(accion, ip, maximo, ventana);
  }

  router.post('/api/contacto', envolver(async (req, res) => {
    const ip = req.ip || 'desconocida';
    if (await limiteSuperado('contacto', ip)) {
      return res.status(429).json({
        status: 'error',
        message: 'Demasiados mensajes enviados. Espera unos minutos antes de intentar de nuevo.',
      });
    }
    if (!(await verificarTurnstile(req.body?.['cf-turnstile-response'], ip))) {
      return res.status(400).json({
        status: 'error',
        message: 'No pudimos verificar que eres una persona. Inténtalo de nuevo.',
      });
    }
    const { datos, errores } = validarContacto(req.body);
    if (errores) {
      return res.status(400).json({ status: 'error', message: 'Revisa los campos del formulario.', errors: errores });
    }
    await db.query('INSERT INTO mensajes (nombre, email, mensaje) VALUES (?, ?, ?)', [datos.nombre, datos.email, datos.mensaje]);
    await limitador.registrar('contacto', ip);
    correo.notificarEmpresa(
      `Nuevo mensaje de contacto de ${datos.nombre}`,
      `Nombre: ${datos.nombre}\nEmail: ${datos.email}\n\nMensaje:\n${datos.mensaje}`,
    );
    return res.status(201).json({ status: 'success', message: '¡Gracias! Tu mensaje fue enviado correctamente, te contactaremos pronto.' });
  }));

  router.post('/api/resenas', envolver(async (req, res) => {
    const ip = req.ip || 'desconocida';
    if (await limiteSuperado('resena', ip)) {
      return res.status(429).json({ message: 'Demasiadas reseñas enviadas. Espera unos minutos antes de intentar de nuevo.' });
    }
    if (!(await verificarTurnstile(req.body?.['cf-turnstile-response'], ip))) {
      return res.status(400).json({ message: 'No pudimos verificar que eres una persona. Inténtalo de nuevo.' });
    }
    const { datos, errores } = validarResena(req.body);
    if (errores) {
      return res.status(400).json({ message: 'Revisa el formulario: comentario y calificación son obligatorios.', errors: errores });
    }
    await db.query(
      'INSERT INTO resenas (nombre, comentario, calificacion) VALUES (?, ?, ?)',
      [datos.nombre, datos.comentario, datos.calificacion],
    );
    await limitador.registrar('resena', ip);
    return res.status(201).json({ message: '¡Gracias por tu reseña! Se publicará en el sitio después de ser revisada.' });
  }));

  router.get('/sitemap.xml', (req, res) => {
    const paginas = [
      ['/', '1.0'], ['/servicios', '0.9'], ['/contacto', '0.8'], ['/nosotros', '0.7'], ['/privacidad', '0.3'],
    ];
    const filas = paginas.map(([ruta, prioridad]) => `  <url><loc>${config.baseUrl}${ruta === '/' ? '/' : ruta}</loc><priority>${prioridad}</priority></url>`);
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${filas.join('\n')}\n</urlset>`,
    );
  });

  router.get('/robots.txt', (req, res) => {
    res.type('text/plain').send([
      'User-agent: *',
      'Disallow: /admin',
      'Disallow: /api/',
      'Disallow: /perfil',
      'Disallow: /mis-facturas',
      'Disallow: /login',
      'Disallow: /registro',
      'Disallow: /recuperar',
      'Disallow: /restablecer/',
      '',
      `Sitemap: ${config.baseUrl}/sitemap.xml`,
    ].join('\n'));
  });
}
