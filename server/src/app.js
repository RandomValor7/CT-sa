import express from 'express';
import helmet from 'helmet';
import cookieSession from 'cookie-session';
import {
  asegurarCsrf, protegerCsrf, cargarUsuario, configuracionHelmet, redirigirAHttps,
  manejadorRutaApi, crearManejadorErrores,
} from './middleware.js';
import { crearSpa } from './spa.js';
import { montar as montarPublico } from './routes/publico.js';
import { montar as montarAuth } from './routes/auth.js';
import { montar as montarPerfil } from './routes/perfil.js';
import { montar as montarAdmin } from './routes/admin.js';

export function crearApp(deps) {
  const { config } = deps;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  if (config.forzarHttps) app.use(redirigirAHttps);
  app.use(helmet(configuracionHelmet(config)));

  const opcionesMedia = { index: false, dotfiles: 'deny', maxAge: '7d', fallthrough: false };
  app.use('/media/uploads', express.static(config.carpetas.uploads, opcionesMedia));
  app.use('/media/productos', express.static(config.carpetas.productos, opcionesMedia));
  app.use(express.static(config.dist, {
    index: false,
    dotfiles: 'deny',
    maxAge: '1d',
    setHeaders(res, ruta) {
      if (ruta.includes('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      else if (/\/(sw\.js|manifest\.webmanifest|offline\.html)$/.test(ruta)) res.setHeader('Cache-Control', 'no-cache');
    },
  }));

  const sesion = cookieSession({
    name: 'ct_sesion',
    keys: [config.claveSecreta],
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSegura,
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  });

  app.use(['/api', '/login/google'], sesion, asegurarCsrf, cargarUsuario(deps.db));
  app.use('/api', express.json({ limit: '100kb' }), protegerCsrf);

  const router = express.Router();
  montarPublico(router, deps);
  montarAuth(router, deps);
  montarPerfil(router, deps);
  montarAdmin(router, deps);
  app.use(router);

  app.use('/api', manejadorRutaApi);
  app.use(crearSpa(config, deps.registro));
  app.use(crearManejadorErrores(deps.registro));
  return app;
}
