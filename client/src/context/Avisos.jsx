import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Icono from '../components/Icono.jsx';

const Contexto = createContext(null);
const ICONOS = { success: 'circle-check', danger: 'triangle-exclamation', info: 'circle-info' };

export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const contador = useRef(0);

  const quitar = useCallback((id) => {
    setAvisos((a) => a.map((x) => (x.id === id ? { ...x, saliendo: true } : x)));
    window.setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 280);
  }, []);

  const avisar = useCallback((texto, tono = 'success') => {
    contador.current += 1;
    const id = contador.current;
    const duracion = tono === 'danger' ? 8000 : 5000;
    setAvisos((a) => [...a.filter((x) => !x.saliendo && x.tono !== tono && !(tono === 'success' && x.tono === 'danger')), { id, tono, texto, duracion }]);
    window.setTimeout(() => quitar(id), duracion);
  }, [quitar]);

  const limpiar = useCallback(() => setAvisos([]), []);
  const valor = useMemo(() => ({ avisos, avisar, quitar, limpiar }), [avisos, avisar, quitar, limpiar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useAvisos = () => useContext(Contexto);

export function ListaAvisos() {
  const { avisos, quitar } = useAvisos();
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {avisos.map((a) => (
        <div key={a.id} role={a.tono === 'danger' ? 'alert' : 'status'}
          className={`toast toast-${a.tono}${a.saliendo ? ' toast-sale' : ''}`}>
          <span className="toast-icono" aria-hidden="true"><Icono n={ICONOS[a.tono] ?? 'circle-info'} /></span>
          <span className="toast-texto">{a.texto}</span>
          <button type="button" className="toast-cerrar" aria-label="Cerrar notificación" onClick={() => quitar(a.id)}>✕</button>
          <span className="toast-tiempo" style={{ animationDuration: `${a.duracion}ms` }} aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}
