export function crearRouterFalso() {
  const rutas = [];
  const usos = [];
  const registrar = (metodo) => (ruta, ...handlers) => rutas.push({ metodo, ruta, handlers });
  return {
    rutas,
    get: registrar('GET'),
    post: registrar('POST'),
    put: registrar('PUT'),
    delete: registrar('DELETE'),
    use(prefijos, ...handlers) {
      usos.push({ prefijos: [].concat(prefijos), handlers });
    },
    usos,
  };
}

function coincide(patron, ruta) {
  const a = patron.split('/');
  const b = ruta.split('/');
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

export function crearRes() {
  const fin = (res) => { res.alTerminar?.(); return res; };
  return {
    estado: 200, cuerpo: undefined, redireccion: null, cabeceras: {}, descarga: null, alTerminar: null,
    status(n) { this.estado = n; return this; },
    json(c) { this.cuerpo = c; return fin(this); },
    send(c) { this.cuerpo = c; return fin(this); },
    type() { return this; },
    set(k, v) { if (typeof k === 'object') Object.assign(this.cabeceras, k); else this.cabeceras[k] = v; return this; },
    redirect(a, b) { this.redireccion = b ?? a; this.estado = b ? a : 302; return fin(this); },
    download(ruta, nombre) { this.descarga = { ruta, nombre }; return fin(this); },
  };
}

export function llamar(router, metodo, ruta, { body = {}, query = {}, session = {}, usuario = null, ip = '1.2.3.4', cabeceras = {} } = {}) {
  const [camino] = ruta.split('?');
  let encontrada = null;
  let params = {};
  for (const r of router.rutas) {
    if (r.metodo !== metodo) continue;
    const p = coincide(r.ruta, camino);
    if (p) { encontrada = r; params = p; break; }
  }
  if (!encontrada) throw new Error(`Sin ruta para ${metodo} ${ruta}`);

  const req = {
    method: metodo, body, query, params, session, usuario, ip, path: camino,
    get: (n) => cabeceras[n.toLowerCase()],
  };
  const res = crearRes();
  const previos = router.usos
    .filter((u) => u.prefijos.some((p) => camino.startsWith(p)))
    .flatMap((u) => u.handlers);
  const cadena = [...previos, ...encontrada.handlers];

  return new Promise((resolver, rechazar) => {
    let error = null;
    const temporizador = setTimeout(() => rechazar(new Error(`La ruta ${metodo} ${ruta} no respondió`)), 3000);
    const terminar = () => { clearTimeout(temporizador); resolver({ req, res, error }); };
    res.alTerminar = terminar;
    let i = 0;
    const next = (err) => {
      if (err) { error = err; terminar(); return; }
      const h = cadena[i]; i += 1;
      if (!h) { terminar(); return; }
      try { h(req, res, next); } catch (e) { error = e; terminar(); }
    };
    next();
  });
}

export function crearDbFalsa(reglas) {
  const llamadas = [];
  return {
    llamadas,
    async query(sql, params = []) {
      llamadas.push({ sql, params });
      for (const [patron, respuesta] of reglas) {
        if (patron.test(sql)) return typeof respuesta === 'function' ? respuesta(sql, params) : respuesta;
      }
      throw new Error(`SQL sin regla en la prueba: ${sql}`);
    },
    vecesQue(patron) { return llamadas.filter((l) => patron.test(l.sql)); },
  };
}
