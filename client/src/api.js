let tokenCsrf = '';

export const fijarCsrf = (token) => { tokenCsrf = token || ''; };

export class ErrorApi extends Error {
  constructor(mensaje, estado, errores, cuerpo) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.errores = errores || {};
    this.cuerpo = cuerpo;
  }
}

async function ejecutar(metodo, url, cuerpo, reintento) {
  const opciones = { method: metodo, credentials: 'same-origin', headers: { Accept: 'application/json' } };
  if (metodo !== 'GET') opciones.headers['X-CSRF-Token'] = tokenCsrf;
  if (cuerpo instanceof FormData) {
    opciones.body = cuerpo;
  } else if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(url, opciones);
  } catch {
    throw new ErrorApi('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 0);
  }

  let datos = null;
  const tipo = respuesta.headers.get('content-type') || '';
  if (tipo.includes('application/json')) datos = await respuesta.json().catch(() => null);

  if (respuesta.status === 403 && !reintento && metodo !== 'GET') {
    const sesion = await ejecutar('GET', '/api/session', undefined, true).catch(() => null);
    if (sesion?.csrfToken) {
      fijarCsrf(sesion.csrfToken);
      return ejecutar(metodo, url, cuerpo, true);
    }
  }

  if (!respuesta.ok) {
    throw new ErrorApi(datos?.message || 'Ocurrió un error. Inténtalo de nuevo.', respuesta.status, datos?.errors, datos);
  }
  return datos;
}

export const api = {
  get: (url) => ejecutar('GET', url),
  post: (url, cuerpo = {}) => ejecutar('POST', url, cuerpo),
  put: (url, cuerpo = {}) => ejecutar('PUT', url, cuerpo),
  delete: (url) => ejecutar('DELETE', url, {}),
};

export const consulta = (base, parametros) => {
  const q = new URLSearchParams();
  Object.entries(parametros).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) q.set(k, v); });
  const texto = q.toString();
  return texto ? `${base}?${texto}` : base;
};

export function formatearFecha(valor) {
  if (!valor) return '—';
  const [fecha, hora] = String(valor).split(' ');
  const [a, m, d] = fecha.split('-');
  if (!a || !m || !d) return String(valor);
  return hora ? `${d}/${m}/${a} ${hora.slice(0, 5)}` : `${d}/${m}/${a}`;
}

export function formatearMonto(valor) {
  if (valor === null || valor === undefined) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(valor);
}
