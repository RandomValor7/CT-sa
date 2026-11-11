import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  validarRegistro, validarLogin, validarContacto, validarResena, validarPerfil,
  validarRestablecer, validarProducto, validarFactura, esEmailValido, paginaActual, totalPaginas,
} from '../src/lib/validate.js';
import {
  detectarTipo, coincideTipo, guardarArchivo, rutaSegura, EXT_FACTURAS, EXT_IMAGENES, ErrorArchivo,
} from '../src/lib/uploads.js';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(32)]);
const EXE = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(40)]);

test('correos válidos e inválidos', () => {
  assert.equal(esEmailValido('ana@correo.com'), true);
  assert.equal(esEmailValido('ana.perez+tag@sub.dominio.co'), true);
  assert.equal(esEmailValido('ana@correo'), false);
  assert.equal(esEmailValido('ana@@correo.com'), false);
  assert.equal(esEmailValido('ana..p@correo.com'), false);
  assert.equal(esEmailValido(''), false);
  assert.equal(esEmailValido(undefined), false);
});

test('registro: reglas de nombre, contraseña y política', () => {
  const ok = validarRegistro({ nombre: ' Ana Gómez ', email: 'a@b.co', password: 'abc123', acepto_politica: true });
  assert.deepEqual(ok.datos, { nombre: 'Ana Gómez', email: 'a@b.co', password: 'abc123' });

  const mal = validarRegistro({ nombre: 'Al', email: 'x', password: 'abcdef', acepto_politica: false });
  assert.ok(mal.errores.nombre && mal.errores.email && mal.errores.password && mal.errores.acepto_politica);
  assert.equal(validarRegistro({ nombre: 'Ana', email: 'a@b.co', password: '123456', acepto_politica: true }).errores.password,
    'La contraseña debe contener al menos una letra.');
  assert.equal(validarRegistro({ nombre: 'Ana', email: 'a@b.co', password: 'ab1', acepto_politica: true }).errores.password,
    'La contraseña debe tener al menos 6 caracteres.');
});

test('login, contacto, reseña y perfil', () => {
  assert.ok(validarLogin({ email: 'a@b.co', password: '123456' }).datos);
  assert.ok(validarLogin({ email: 'a@b.co', password: '12' }).errores.password);

  assert.ok(validarContacto({ nombre: 'Ana', email: 'a@b.co', mensaje: 'Hola, quiero una cotización' }).datos);
  assert.ok(validarContacto({ nombre: 'Ana', email: 'a@b.co', mensaje: 'corto' }).errores.mensaje);
  assert.ok(validarContacto({ nombre: 'Ana', email: 'a@b.co', mensaje: 'x'.repeat(2001) }).errores.mensaje);

  assert.deepEqual(validarResena({ comentario: 'Muy buen servicio', calificacion: '5' }).datos,
    { nombre: 'Anónimo', comentario: 'Muy buen servicio', calificacion: 5 });
  assert.ok(validarResena({ comentario: 'Muy buen servicio', calificacion: '9' }).errores.calificacion);
  assert.ok(validarResena({ comentario: 'ok', calificacion: '3' }).errores.comentario);

  assert.ok(validarPerfil({ nombre: 'Ana', email: 'a@b.co' }).datos);
  assert.ok(validarPerfil({ nombre: '', email: 'a@b.co' }).errores.nombre);
});

test('restablecer contraseña exige coincidencia', () => {
  assert.ok(validarRestablecer({ password: 'abc123', confirmar_password: 'abc123' }).datos);
  assert.equal(validarRestablecer({ password: 'abc123', confirmar_password: 'abc124' }).errores.confirmar_password,
    'Las contraseñas no coinciden.');
});

test('producto y factura', () => {
  assert.ok(validarProducto({ nombre: 'Fibra óptica', descripcion: 'Instalación de fibra óptica' }).datos);
  assert.ok(validarProducto({ nombre: 'F', descripcion: 'corta' }).errores.descripcion);

  const ok = validarFactura({ usuario_id: '4', numero_factura: ' F-001 ', monto: '1234,5', estado: 'pagada', fecha_factura: '2026-10-21', notas: '' });
  assert.deepEqual(ok.datos, {
    usuario_id: 4, numero_factura: 'F-001', monto: 1234.5, estado: 'pagada', fecha_factura: '2026-10-21', notas: null,
  });
  const vacio = validarFactura({ usuario_id: 1, estado: 'pendiente' });
  assert.equal(vacio.datos.monto, null);
  assert.equal(vacio.datos.fecha_factura, null);
  assert.ok(validarFactura({ usuario_id: 1, estado: 'pendiente', monto: '-5' }).errores.monto);
  assert.ok(validarFactura({ usuario_id: 1, estado: 'pendiente', monto: 'abc' }).errores.monto);
  assert.ok(validarFactura({ usuario_id: 1, estado: 'rara' }).errores.estado);
  assert.ok(validarFactura({ usuario_id: 0, estado: 'pagada' }).errores.usuario_id);
  assert.ok(validarFactura({ usuario_id: 1, estado: 'pagada', fecha_factura: '2026-02-31' }).errores.fecha_factura);
});

test('paginación', () => {
  assert.equal(paginaActual('3'), 3);
  assert.equal(paginaActual('-1'), 1);
  assert.equal(paginaActual('abc'), 1);
  assert.equal(paginaActual(undefined), 1);
  assert.equal(totalPaginas(0, 12), 1);
  assert.equal(totalPaginas(12, 12), 1);
  assert.equal(totalPaginas(13, 12), 2);
});

test('detección de tipo real por contenido', () => {
  assert.equal(detectarTipo(PNG), 'png');
  assert.equal(detectarTipo(JPG), 'jpg');
  assert.equal(detectarTipo(PDF), 'pdf');
  assert.equal(detectarTipo(EXE), null);
  assert.equal(detectarTipo(Buffer.alloc(3)), null);
  assert.equal(coincideTipo('jpeg', 'jpg'), true);
  assert.equal(coincideTipo('png', 'jpg'), false);
});

test('guardarArchivo: acepta contenido válido y rechaza disfraces', async () => {
  const carpeta = await fs.mkdtemp(path.join(os.tmpdir(), 'ct-'));
  try {
    const nombre = await guardarArchivo({ originalname: 'Factura Octubre.PDF', buffer: PDF }, carpeta, EXT_FACTURAS);
    assert.match(nombre, /^[0-9a-f]{32}\.pdf$/);
    assert.deepEqual(await fs.readFile(path.join(carpeta, nombre)), PDF);

    await assert.rejects(guardarArchivo({ originalname: 'virus.pdf', buffer: EXE }, carpeta, EXT_FACTURAS), ErrorArchivo);
    await assert.rejects(guardarArchivo({ originalname: 'foto.png', buffer: JPG }, carpeta, EXT_IMAGENES), /no coincide/);
    await assert.rejects(guardarArchivo({ originalname: 'script.exe', buffer: PNG }, carpeta, EXT_FACTURAS), /no permitido/);
    await assert.rejects(guardarArchivo({ originalname: 'archivo.pdf', buffer: PDF }, carpeta, EXT_IMAGENES), /no permitido/);
    await assert.rejects(guardarArchivo(null, carpeta, EXT_FACTURAS), /No se seleccionó/);
    assert.equal((await fs.readdir(carpeta)).length, 1);
  } finally {
    await fs.rm(carpeta, { recursive: true, force: true });
  }
});

test('rutaSegura impide salirse de la carpeta', () => {
  const carpeta = path.join(os.tmpdir(), 'storage-x');
  assert.equal(rutaSegura(carpeta, 'abc.pdf'), path.join(carpeta, 'abc.pdf'));
  assert.equal(rutaSegura(carpeta, '../../etc/passwd'), path.join(carpeta, 'passwd'));
  assert.equal(rutaSegura(carpeta, ''), null);
  assert.equal(rutaSegura(carpeta, null), null);
});
