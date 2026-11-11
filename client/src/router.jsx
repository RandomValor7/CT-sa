import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

const ContextoRuta = createContext(null);
const ContextoParams = createContext({});

const leer = () => ({ path: window.location.pathname, search: window.location.search, hash: window.location.hash });

export function RouterProvider({ children }) {
  const [ubicacion, setUbicacion] = useState(leer);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    const alCambiar = () => setUbicacion(leer());
    window.addEventListener('popstate', alCambiar);
    return () => window.removeEventListener('popstate', alCambiar);
  }, []);

  const navegar = useCallback((destino, { reemplazar = false } = {}) => {
    const url = new URL(destino, window.location.origin);
    const mismaPagina = url.pathname === window.location.pathname && url.search === window.location.search;
    const cambiar = () => {
      if (reemplazar) window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      else window.history.pushState(null, '', url.pathname + url.search + url.hash);
      setUbicacion(leer());
      setSaliendo(false);
      if (url.hash) {
        requestAnimationFrame(() => document.getElementById(url.hash.slice(1))?.scrollIntoView());
      } else if (!mismaPagina) {
        window.scrollTo(0, 0);
      }
    };
    if (mismaPagina || reemplazar) { cambiar(); return; }
    setSaliendo(true);
    window.setTimeout(cambiar, 150);
  }, []);

  const valor = useMemo(() => ({ ...ubicacion, navegar, saliendo }), [ubicacion, navegar, saliendo]);
  return <ContextoRuta.Provider value={valor}>{children}</ContextoRuta.Provider>;
}

export const useRuta = () => useContext(ContextoRuta);
export const useParams = () => useContext(ContextoParams);

export function useQuery() {
  const { search } = useRuta();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function Link({ to, onClick, children, ...resto }) {
  const { navegar } = useRuta();
  const manejar = (e) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (resto.target === '_blank') return;
    e.preventDefault();
    navegar(to);
  };
  return <a href={to} onClick={manejar} {...resto}>{children}</a>;
}

function coincidir(patron, path) {
  const a = patron.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  if (patron.endsWith('/*')) {
    const base = a.slice(0, -1);
    if (b.length < base.length) return null;
    const params = {};
    for (let i = 0; i < base.length; i += 1) {
      if (base[i].startsWith(':')) params[base[i].slice(1)] = decodeURIComponent(b[i]);
      else if (base[i] !== b[i]) return null;
    }
    return params;
  }
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

export function Rutas({ rutas, noEncontrada }) {
  const { path } = useRuta();
  for (const r of rutas) {
    const params = coincidir(r.ruta, path);
    if (params) {
      return <ContextoParams.Provider value={params}>{r.elemento}</ContextoParams.Provider>;
    }
  }
  return noEncontrada;
}

export function Redirigir({ a }) {
  const { navegar } = useRuta();
  useEffect(() => { navegar(a, { reemplazar: true }); }, [a, navegar]);
  return null;
}
