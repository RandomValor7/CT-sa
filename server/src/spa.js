import fs from 'node:fs/promises';
import path from 'node:path';

const DESCRIPCION = 'Conexión Total Ingeniería S.A.S. — Soluciones en fibra óptica, cableado estructurado, redes inalámbricas, instalaciones eléctricas y seguridad electrónica en Nariño, Colombia.';
const SUFIJO = 'Conexión Total Ingeniería S.A.S.';

const PAGINAS = [
  { patron: /^\/$/, titulo: `${SUFIJO} — Inicio`, descripcion: 'Empresa de ingeniería en Pasto, Nariño especializada en fibra óptica, cableado estructurado, redes inalámbricas, instalaciones eléctricas y seguridad electrónica. Cotiza tu proyecto por WhatsApp.' },
  { patron: /^\/servicios$/, titulo: `Servicios - ${SUFIJO}`, descripcion: 'Fibra óptica, cableado estructurado, redes inalámbricas, instalaciones eléctricas y seguridad electrónica (CCTV). Cobertura en Pasto, El Tambo, Chachagüí y municipios de Nariño.' },
  { patron: /^\/nosotros$/, titulo: 'Nosotros - Conexión Total Ingeniería', descripcion: 'Conoce a Conexión Total Ingeniería S.A.S., empresa nariñense de telecomunicaciones e ingeniería eléctrica desde 2020. Misión, visión y valores.' },
  { patron: /^\/contacto$/, titulo: `Contacto - ${SUFIJO}`, descripcion: 'Contáctanos para cotizar tu proyecto de fibra óptica, redes o instalaciones eléctricas en Nariño. WhatsApp, correo y formulario de contacto directo.' },
  { patron: /^\/privacidad$/, titulo: 'Política de tratamiento de datos personales - Conexión Total Ingeniería', descripcion: DESCRIPCION },
  { patron: /^\/registro$/, titulo: `Registrarse - ${SUFIJO}`, privada: true },
  { patron: /^\/login$/, titulo: `Iniciar sesión - ${SUFIJO}`, privada: true },
  { patron: /^\/login\/verificar-2fa$/, titulo: `Verificación en dos pasos - ${SUFIJO}`, privada: true },
  { patron: /^\/recuperar$/, titulo: `Recuperar contraseña - ${SUFIJO}`, privada: true },
  { patron: /^\/restablecer\/[^/]+$/, titulo: `Restablecer contraseña - ${SUFIJO}`, privada: true },
  { patron: /^\/verificar\/[^/]+$/, titulo: `Verificar correo - ${SUFIJO}`, privada: true },
  { patron: /^\/perfil$/, titulo: `Mi perfil - ${SUFIJO}`, privada: true },
  { patron: /^\/perfil\/editar$/, titulo: `Editar perfil - ${SUFIJO}`, privada: true },
  { patron: /^\/perfil\/2fa\/activar$/, titulo: `Activar verificación en dos pasos - ${SUFIJO}`, privada: true },
  { patron: /^\/mis-facturas$/, titulo: `Mis facturas - ${SUFIJO}`, privada: true },
  { patron: /^\/mis-facturas\/\d+$/, titulo: `Detalle de factura - ${SUFIJO}`, privada: true },
  { patron: /^\/admin(\/.*)?$/, titulo: `Panel de administración - ${SUFIJO}`, privada: true },
];

const escapar = (texto) => String(texto)
  .replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function paginaDe(ruta) {
  const limpia = ruta.length > 1 ? ruta.replace(/\/+$/, '') : ruta;
  return PAGINAS.find((p) => p.patron.test(limpia)) ?? null;
}

export function inyectarMeta(html, { ruta, baseUrl, empresa }) {
  const pagina = paginaDe(ruta);
  const titulo = pagina?.titulo ?? `Página no encontrada - Conexión Total Ingeniería`;
  const descripcion = pagina?.descripcion ?? DESCRIPCION;
  const canonica = `${baseUrl}${ruta === '/' ? '/' : ruta.replace(/\/+$/, '')}`;
  const etiquetas = [
    `<meta name="description" content="${escapar(descripcion)}">`,
    `<link rel="canonical" href="${escapar(canonica)}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${escapar(empresa)}">`,
    `<meta property="og:title" content="${escapar(titulo)}">`,
    `<meta property="og:description" content="${escapar(descripcion)}">`,
    `<meta property="og:image" content="${escapar(`${baseUrl}/imagenes/logo.jpg`)}">`,
    `<meta property="og:url" content="${escapar(canonica)}">`,
    '<meta property="og:locale" content="es_CO">',
  ];
  if (!pagina || pagina.privada) etiquetas.push('<meta name="robots" content="noindex, nofollow">');

  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapar(titulo)}</title>`)
    .replace(/<meta name="description"[^>]*>\s*/, '')
    .replace('<!--META-->', etiquetas.join('\n  '));
}

export function crearSpa(config, registro = console) {
  const archivo = path.join(config.dist, 'index.html');
  let cache = null;

  async function plantilla() {
    if (cache) return cache;
    const html = await fs.readFile(archivo, 'utf8');
    if (config.produccion) cache = html;
    return html;
  }

  return async function servir(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (/\.[a-z0-9]{2,5}$/i.test(req.path)) return res.status(404).type('text/plain').send('No encontrado');
    let html;
    try {
      html = await plantilla();
    } catch (err) {
      registro.error('No se encontró client/dist/index.html — ejecuta "npm run build".', err.message);
      return res.status(503).type('text/plain').send('El sitio todavía no está compilado. Ejecuta "npm run build".');
    }
    const existe = paginaDe(req.path) !== null;
    return res
      .status(existe ? 200 : 404)
      .set('Cache-Control', 'no-cache')
      .type('html')
      .send(inyectarMeta(html, { ruta: req.path, baseUrl: config.baseUrl, empresa: config.empresa.nombre }));
  };
}
