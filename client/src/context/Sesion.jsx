import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, fijarCsrf } from '../api.js';

const Contexto = createContext(null);

export function SesionProvider({ children }) {
  const [estado, setEstado] = useState({ cargando: true, usuario: null, config: null, error: null });

  const refrescar = useCallback(async () => {
    try {
      const datos = await api.get('/api/session');
      fijarCsrf(datos.csrfToken);
      setEstado({ cargando: false, usuario: datos.usuario, config: datos.config, error: null });
      return datos;
    } catch (err) {
      setEstado((e) => ({ ...e, cargando: false, error: err.message }));
      return null;
    }
  }, []);

  useEffect(() => { refrescar(); }, [refrescar]);

  const aplicarAuth = useCallback((respuesta) => {
    if (respuesta?.csrfToken) fijarCsrf(respuesta.csrfToken);
    setEstado((e) => ({ ...e, usuario: respuesta?.usuario ?? null }));
  }, []);

  const valor = useMemo(() => ({ ...estado, refrescar, aplicarAuth }), [estado, refrescar, aplicarAuth]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useSesion = () => useContext(Contexto);
