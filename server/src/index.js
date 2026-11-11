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
