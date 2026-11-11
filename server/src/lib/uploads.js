import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const MAX_BYTES = 5 * 1024 * 1024;
export const EXT_IMAGENES = new Set(['png', 'jpg', 'jpeg', 'gif']);
export const EXT_FACTURAS = new Set(['pdf', 'png', 'jpg', 'jpeg']);

export function detectarTipo(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  const cabecera = buffer.subarray(0, 6).toString('latin1');
  if (cabecera === 'GIF87a' || cabecera === 'GIF89a') return 'gif';
  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  return null;
}

export function extensionDe(nombre) {
  const punto = typeof nombre === 'string' ? nombre.lastIndexOf('.') : -1;
  return punto === -1 ? '' : nombre.slice(punto + 1).toLowerCase();
}

export function coincideTipo(extension, tipoReal) {
  if (extension === 'jpeg') return tipoReal === 'jpg';
  return extension === tipoReal;
}

export class ErrorArchivo extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorArchivo';
    this.status = 400;
  }
}

export const recibirArchivo = (campo) => {
  let procesador = null;

  async function obtener() {
    if (procesador) return procesador;
    const { default: multer } = await import('multer');
    const subir = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_BYTES, files: 1, fields: 20, fieldSize: 20_000 },
    }).single(campo);
    procesador = { subir, MulterError: multer.MulterError };
    return procesador;
  }

  return async (req, res, next) => {
    let herramientas;
    try {
      herramientas = await obtener();
    } catch (err) {
      return next(err);
    }
    return herramientas.subir(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        err.status = 413;
        err.message = 'El archivo es demasiado grande. El límite es 5 MB.';
      } else if (err instanceof herramientas.MulterError) {
        err.status = 400;
        err.message = 'No se pudo procesar el archivo enviado.';
      }
      return next(err);
    });
  };
};

async function comprimirImagen(buffer, tipo, anchoMaximo) {
  if (tipo !== 'jpg' && tipo !== 'png') return buffer;
  try {
    const { default: sharp } = await import('sharp');
    const imagen = sharp(buffer, { failOn: 'error' }).rotate().resize({ width: anchoMaximo, withoutEnlargement: true });
    return tipo === 'png'
      ? await imagen.png({ compressionLevel: 9 }).toBuffer()
      : await imagen.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  } catch (err) {
    if (err?.code === 'ERR_MODULE_NOT_FOUND') return buffer;
    throw new ErrorArchivo('La imagen está dañada o no es un archivo de imagen válido.');
  }
}

export async function guardarArchivo(archivo, carpeta, extensionesPermitidas, { comprimir = false, anchoMaximo = 1200 } = {}) {
  if (!archivo || !archivo.originalname) throw new ErrorArchivo('No se seleccionó ningún archivo.');

  const extension = extensionDe(archivo.originalname);
  if (!extensionesPermitidas.has(extension)) {
    const permitidas = [...extensionesPermitidas].sort().join(', ').toUpperCase();
    throw new ErrorArchivo(`Tipo de archivo no permitido. Usa: ${permitidas}.`);
  }

  const tipoReal = detectarTipo(archivo.buffer);
  if (!tipoReal || !coincideTipo(extension, tipoReal)) {
    throw new ErrorArchivo('El contenido del archivo no coincide con su extensión.');
  }

  const contenido = comprimir ? await comprimirImagen(archivo.buffer, tipoReal, anchoMaximo) : archivo.buffer;
  const extensionFinal = tipoReal === 'jpg' ? 'jpg' : tipoReal;
  const nombre = `${crypto.randomUUID().replaceAll('-', '')}.${extensionFinal}`;

  await fs.mkdir(carpeta, { recursive: true });
  await fs.writeFile(path.join(carpeta, nombre), contenido, { flag: 'wx', mode: 0o640 });
  return nombre;
}

export function rutaSegura(carpeta, nombre) {
  if (typeof nombre !== 'string' || nombre.length === 0) return null;
  const base = path.resolve(carpeta);
  const completa = path.resolve(base, path.basename(nombre));
  return completa.startsWith(base + path.sep) ? completa : null;
}

export async function borrarArchivo(carpeta, nombre) {
  const ruta = rutaSegura(carpeta, nombre);
  if (!ruta) return;
  try {
    await fs.unlink(ruta);
  } catch {
    // el archivo ya no existe: nada que hacer
  }
}
