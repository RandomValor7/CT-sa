const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export const ESTADOS_FACTURA = [
  { valor: 'pendiente', etiqueta: 'Pendiente' },
  { valor: 'pagada', etiqueta: 'Pagada' },
  { valor: 'anulada', etiqueta: 'Anulada' },
];
export const ESTADOS_FACTURA_VALIDOS = new Set(ESTADOS_FACTURA.map((e) => e.valor));
export const ROLES_VALIDOS = ['usuario', 'moderador', 'administrador'];

export function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

export function esEmailValido(email) {
  return typeof email === 'string' && email.length <= 120 && !email.includes('..') && EMAIL_RE.test(email);
}

function longitud(errores, campo, valor, min, max, etiqueta) {
  if (valor.length === 0) {
    errores[campo] = `${etiqueta} es obligatorio.`;
  } else if (valor.length < min) {
    errores[campo] = `${etiqueta} debe tener al menos ${min} caracteres.`;
  } else if (valor.length > max) {
    errores[campo] = `${etiqueta} no puede superar ${max} caracteres.`;
  }
}

function validarPassword(errores, campo, password) {
  if (typeof password !== 'string' || password.length === 0) {
    errores[campo] = 'La contraseña es obligatoria.';
  } else if (password.length < 6) {
    errores[campo] = 'La contraseña debe tener al menos 6 caracteres.';
  } else if (password.length > 200) {
    errores[campo] = 'La contraseña es demasiado larga.';
  } else if (!/\d/.test(password)) {
    errores[campo] = 'La contraseña debe contener al menos un número.';
  } else if (!/\p{L}/u.test(password)) {
    errores[campo] = 'La contraseña debe contener al menos una letra.';
  }
}

function resultado(errores, datos) {
  return Object.keys(errores).length > 0 ? { errores } : { datos };
}

export function validarRegistro(cuerpo = {}) {
  const errores = {};
  const nombre = texto(cuerpo.nombre);
  const email = texto(cuerpo.email);
  longitud(errores, 'nombre', nombre, 3, 50, 'El nombre');
  if (!esEmailValido(email)) errores.email = 'Ingresa un correo electrónico válido.';
  validarPassword(errores, 'password', cuerpo.password);
  if (cuerpo.acepto_politica !== true && cuerpo.acepto_politica !== 'true' && cuerpo.acepto_politica !== 'on') {
    errores.acepto_politica = 'Debes aceptar la política de tratamiento de datos para registrarte.';
  }
  return resultado(errores, { nombre, email, password: cuerpo.password });
}

export function validarLogin(cuerpo = {}) {
  const errores = {};
  const email = texto(cuerpo.email);
  if (!esEmailValido(email)) errores.email = 'Ingresa un correo electrónico válido.';
  if (typeof cuerpo.password !== 'string' || cuerpo.password.length < 6) {
    errores.password = 'La contraseña debe tener al menos 6 caracteres.';
  }
  return resultado(errores, { email, password: cuerpo.password });
}

export function validarContacto(cuerpo = {}) {
  const errores = {};
  const nombre = texto(cuerpo.nombre);
  const email = texto(cuerpo.email);
  const mensaje = texto(cuerpo.mensaje);
  longitud(errores, 'nombre', nombre, 3, 50, 'El nombre');
  if (!esEmailValido(email)) errores.email = 'Ingresa un correo electrónico válido.';
  longitud(errores, 'mensaje', mensaje, 10, 2000, 'El mensaje');
  return resultado(errores, { nombre, email, mensaje });
}

export function validarResena(cuerpo = {}) {
  const errores = {};
  const nombre = texto(cuerpo.nombre);
  const comentario = texto(cuerpo.comentario);
  const calificacion = Number(cuerpo.calificacion);
  if (nombre.length > 100) errores.nombre = 'El nombre no puede superar 100 caracteres.';
  longitud(errores, 'comentario', comentario, 5, 1000, 'El comentario');
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
    errores.calificacion = 'Selecciona una calificación de 1 a 5.';
  }
  return resultado(errores, { nombre: nombre || 'Anónimo', comentario, calificacion });
}

export function validarPerfil(cuerpo = {}) {
  const errores = {};
  const nombre = texto(cuerpo.nombre);
  const email = texto(cuerpo.email);
  longitud(errores, 'nombre', nombre, 3, 50, 'El nombre');
  if (!esEmailValido(email)) errores.email = 'Ingresa un correo electrónico válido.';
  return resultado(errores, { nombre, email });
}

export function validarRestablecer(cuerpo = {}) {
  const errores = {};
  validarPassword(errores, 'password', cuerpo.password);
  if (typeof cuerpo.confirmar_password !== 'string' || cuerpo.confirmar_password.length === 0) {
    errores.confirmar_password = 'Confirma tu contraseña.';
  } else if (cuerpo.confirmar_password !== cuerpo.password) {
    errores.confirmar_password = 'Las contraseñas no coinciden.';
  }
  return resultado(errores, { password: cuerpo.password });
}

export function validarProducto(cuerpo = {}) {
  const errores = {};
  const nombre = texto(cuerpo.nombre);
  const descripcion = texto(cuerpo.descripcion);
  longitud(errores, 'nombre', nombre, 2, 100, 'El nombre del producto');
  longitud(errores, 'descripcion', descripcion, 10, 1000, 'La descripción');
  return resultado(errores, { nombre, descripcion });
}

function fechaValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === texto;
}

export function validarFactura(cuerpo = {}) {
  const errores = {};
  const usuarioId = Number(cuerpo.usuario_id);
  const numero = texto(cuerpo.numero_factura);
  const estado = texto(cuerpo.estado);
  const fecha = texto(cuerpo.fecha_factura);
  const notas = texto(cuerpo.notas);
  const montoTexto = texto(String(cuerpo.monto ?? ''));

  if (!Number.isInteger(usuarioId) || usuarioId < 1) errores.usuario_id = 'Selecciona un cliente.';
  if (numero.length > 50) errores.numero_factura = 'El número no puede superar 50 caracteres.';
  if (!ESTADOS_FACTURA_VALIDOS.has(estado)) errores.estado = 'Selecciona un estado válido.';
  if (fecha && !fechaValida(fecha)) errores.fecha_factura = 'Ingresa una fecha válida (AAAA-MM-DD).';
  if (notas.length > 1000) errores.notas = 'Las notas no pueden superar 1000 caracteres.';

  let monto = null;
  if (montoTexto !== '') {
    monto = Number(montoTexto.replace(',', '.'));
    if (!Number.isFinite(monto)) {
      errores.monto = 'Ingresa un monto válido.';
    } else if (monto < 0) {
      errores.monto = 'El monto no puede ser negativo.';
    } else if (monto > 9999999999.99) {
      errores.monto = 'El monto es demasiado grande.';
    } else {
      monto = Math.round(monto * 100) / 100;
    }
  }

  return resultado(errores, {
    usuario_id: usuarioId,
    numero_factura: numero || null,
    monto,
    estado,
    fecha_factura: fecha || null,
    notas: notas || null,
  });
}

export function paginaActual(valor) {
  const pagina = Number.parseInt(valor, 10);
  return Number.isInteger(pagina) && pagina > 0 ? pagina : 1;
}

export function totalPaginas(totalFilas, porPagina) {
  return totalFilas <= 0 ? 1 : Math.ceil(totalFilas / porPagina);
}
