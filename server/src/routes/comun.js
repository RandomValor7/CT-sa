import { ESTADOS_FACTURA, paginaActual, totalPaginas } from '../lib/validate.js';

export const COLUMNAS_FACTURA = 'id, numero_factura, monto, estado, fecha_factura, fecha_subida, filename, notas';

export function facturaPublica(fila, { conNotas = false } = {}) {
  const salida = {
    id: fila.id,
    numero_factura: fila.numero_factura ?? null,
    monto: fila.monto === null || fila.monto === undefined ? null : Number(fila.monto),
    estado: fila.estado,
    fecha_factura: fila.fecha_factura ?? null,
    fecha_subida: fila.fecha_subida ?? null,
    tieneArchivo: Boolean(fila.filename),
  };
  if (conNotas) salida.notas = fila.notas ?? null;
  if (fila.usuario_id !== undefined) salida.usuario_id = fila.usuario_id;
  if (fila.usuario_nombre !== undefined) salida.usuario_nombre = fila.usuario_nombre;
  if (fila.usuario_email !== undefined) salida.usuario_email = fila.usuario_email;
  return salida;
}

export function estadosParaCliente() {
  return ESTADOS_FACTURA.map((e) => ({ valor: e.valor, etiqueta: e.etiqueta }));
}

export async function paginar(db, { contar, listar, pagina, porPagina }) {
  const total = Number((await db.query(contar.sql, contar.params ?? []))[0]?.total ?? 0);
  const paginas = totalPaginas(total, porPagina);
  const actual = Math.min(paginaActual(pagina), paginas);
  const items = await db.query(listar.sql, [...(listar.params ?? []), porPagina, (actual - 1) * porPagina]);
  return { items, pagina: actual, totalPaginas: paginas, total };
}

export const entero = (valor) => {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
};
