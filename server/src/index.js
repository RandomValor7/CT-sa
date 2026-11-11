import fs from 'node:fs/promises';
import dotenv from 'dotenv';
import { cargarConfig, RAIZ } from './config.js';
import { crearDb } from './db.js';
import { crearLimitador } from './lib/ratelimit.js';
import { crearCorreo, crearTurnstile } from './lib/servicios.js';
import { crearGoogle } from './lib/google.js';
import { crearApp } from './app.js';

dotenv.config({ path: `${RAIZ}/.env` });

const registro = console;
const config = cargarConfig(process.env, registro);

await Promise.all(Object.values(config.carpetas).map((c) => fs.mkdir(c, { recursive: true })));

const db = await crearDb(config);
const TABLAS = ['usuarios', 'facturas', 'mensajes', 'resenas', 'productos', 'logs_admin', 'intentos_seguridad'];
try {
  const existentes = (await db.query('SHOW TABLES')).map((f) => Object.values(f)[0]);
  const faltan = TABLAS.filter((t) => !existentes.includes(t));
  registro.info(`Base de datos conectada: ${config.db.database}@${config.db.host}:${config.db.port}`);
  if (faltan.length) registro.error(`Faltan tablas en ${config.db.database}: ${faltan.join(', ')}. Importa schema.sql.`);
} catch (err) {
  registro.error(`No se pudo usar la base de datos (${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database}): [${err.code || 'ERROR'}] ${err.message}`);
}
const limitador = crearLimitador({ db, backend: config.limiteBackend });
setInterval(() => limitador.purgar(), 10 * 60 * 1000).unref();

const app = crearApp({
  config,
  db,
  limitador,
  registro,
  correo: crearCorreo(config, registro),
  verificarTurnstile: crearTurnstile(config, registro),
  google: crearGoogle(config),
});

if (config.produccion && !config.forzarHttps) {
  registro.warn('FORCE_HTTPS=false en producción. Si ya tienes dominio con SSL, ponlo en true en el .env.');
}
registro.info(`Límite de intentos: ${config.limiteBackend}. Proxy de confianza: ${String(config.trustProxy)}.`);

const servidor = app.listen(config.puerto, () => {
  registro.info(`Conexión Total escuchando en ${config.baseUrl} (puerto ${config.puerto})`);
});

async function apagar() {
  servidor.close(async () => {
    await db.cerrar().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', apagar);
process.on('SIGINT', apagar);
