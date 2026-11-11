import { useCallback, useEffect, useState } from 'react';

const CLAVE = 'ct_tema';

function leer() {
  try { return localStorage.getItem(CLAVE) === 'oscuro' ? 'oscuro' : 'claro'; } catch { return 'claro'; }
}

export function aplicarTemaGuardado() {
  document.documentElement.dataset.tema = leer();
}

export function useTema() {
  const [tema, setTema] = useState(leer);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    try { localStorage.setItem(CLAVE, tema); } catch { /* sin almacenamiento */ }
  }, [tema]);

  const alternar = useCallback(() => setTema((t) => (t === 'claro' ? 'oscuro' : 'claro')), []);
  return { tema, alternar };
}
