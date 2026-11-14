const NOMBRES_MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function ultimosMeses(cantidad, ahora = new Date()) {
  const meses = [];
  for (let i = cantidad - 1; i >= 0; i -= 1) {
    const f = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const clave = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
    meses.push({ clave, etiqueta: `${NOMBRES_MES[f.getMonth()]} ${String(f.getFullYear()).slice(2)}` });
  }
  return meses;
}

export function inicioVentana(cantidad, ahora = new Date()) {
  const f = new Date(ahora.getFullYear(), ahora.getMonth() - (cantidad - 1), 1);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
}

export function rellenarMeses(filas, cantidad = 6, ahora = new Date()) {
  const porMes = new Map(filas.map((f) => [String(f.mes), Number(f.total)]));
  return ultimosMeses(cantidad, ahora).map((m) => ({ mes: m.clave, etiqueta: m.etiqueta, total: porMes.get(m.clave) ?? 0 }));
}

export function rellenarCalificaciones(filas) {
  const mapa = new Map(filas.map((f) => [Number(f.calificacion), Number(f.total)]));
  return [5, 4, 3, 2, 1].map((n) => ({ calificacion: n, total: mapa.get(n) ?? 0 }));
}

export function rellenarEstados(filas, estados = ['pendiente', 'pagada', 'anulada']) {
  const mapa = new Map(filas.map((f) => [String(f.estado), f]));
  return estados.map((e) => ({
    estado: e,
    total: Number(mapa.get(e)?.total ?? 0),
    suma: Number(mapa.get(e)?.suma ?? 0),
  }));
}
