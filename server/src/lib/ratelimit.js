export function crearLimitador({ db = null, backend = 'memory', ahora = () => Date.now() } = {}) {
  const registros = new Map();
  const usaMysql = backend === 'mysql' && db !== null;

  function llave(accion, clave) {
    return `${accion}|${clave}`;
  }

  function vigentes(accion, clave, ventanaSegundos) {
    const k = llave(accion, clave);
    const limite = ahora() - ventanaSegundos * 1000;
    const lista = (registros.get(k) ?? []).filter((t) => t > limite);
    if (lista.length > 0) registros.set(k, lista);
    else registros.delete(k);
    return lista;
  }

  async function excedido(accion, clave, maximo, ventanaSegundos) {
    if (vigentes(accion, clave, ventanaSegundos).length >= maximo) return true;
    if (!usaMysql) return false;
    const filas = await db.query(
      'SELECT COUNT(*) AS total FROM intentos_seguridad '
        + 'WHERE accion = ? AND clave = ? AND creado_en > (NOW() - INTERVAL ? SECOND)',
      [accion, clave, ventanaSegundos],
    );
    return Number(filas[0]?.total ?? 0) >= maximo;
  }

  async function registrar(accion, clave) {
    const k = llave(accion, clave);
    const lista = registros.get(k) ?? [];
    lista.push(ahora());
    registros.set(k, lista);
    if (usaMysql) {
      await db.query('INSERT INTO intentos_seguridad (accion, clave) VALUES (?, ?)', [accion, clave]);
    }
  }

  async function limpiar(accion, clave) {
    registros.delete(llave(accion, clave));
    if (usaMysql) {
      await db.query('DELETE FROM intentos_seguridad WHERE accion = ? AND clave = ?', [accion, clave]);
    }
  }

  function purgar(maxEdadSegundos = 3600) {
    const limite = ahora() - maxEdadSegundos * 1000;
    for (const [k, lista] of registros) {
      const filtrada = lista.filter((t) => t > limite);
      if (filtrada.length > 0) registros.set(k, filtrada);
      else registros.delete(k);
    }
  }

  return { excedido, registrar, limpiar, purgar };
}

export const LIMITES = {
  login: { maximo: 5, ventana: 5 * 60 },
  recuperacion: { maximo: 3, ventana: 15 * 60 },
  contacto: { maximo: 3, ventana: 10 * 60 },
  resena: { maximo: 3, ventana: 10 * 60 },
  registro: { maximo: 5, ventana: 15 * 60 },
  reenvio: { maximo: 3, ventana: 15 * 60 },
};
