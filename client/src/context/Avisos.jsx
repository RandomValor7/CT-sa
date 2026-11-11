import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Icono from '../components/Icono.jsx';

const Contexto = createContext(null);
const ICONOS = { success: 'circle-check', danger: 'triangle-exclamation', info: 'circle-info' };

export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const contador = useRef(0);

  const quitar = useCallback((id) => setAvisos((a) => a.filter((x) => x.id !== id)), []);

  const avisar = useCallback((texto, tono = 'success') => {
    contador.current += 1;
    const id = contador.current;
    setAvisos((a) => [...a.slice(-3), { id, tono, texto }]);
    window.setTimeout(() => quitar(id), 9000);
  }, [quitar]);

  const limpiar = useCallback(() => setAvisos([]), []);
  const valor = useMemo(() => ({ avisos, avisar, quitar, limpiar }), [avisos, avisar, quitar, limpiar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useAvisos = () => useContext(Contexto);

export function ListaAvisos() {
  const { avisos, quitar } = useAvisos();
  if (avisos.length === 0) return null;
  return (
    <div className="container mx-auto px-6 mt-4">
      <div className="alert-stack" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`alert alert-${a.tono}`}>
            <span className="alert-icon" aria-hidden="true"><Icono n={ICONOS[a.tono] ?? 'circle-info'} /></span>
            <span className="alert-text">{a.texto}</span>
            <button type="button" className="alert-dismiss" aria-label="Cerrar notificación" onClick={() => quitar(a.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
