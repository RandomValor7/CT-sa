import { Link, useQuery, useRuta } from '../router.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { useAvisos } from '../context/Avisos.jsx';
import { api, consulta } from '../api.js';

export function CabeceraAdmin({ titulo, volverA = '/admin', volverTexto = 'Volver al panel', acciones, eyebrow = 'Panel interno' }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="section-heading mt-2 mb-2">{titulo}</h1>
        <Link to={volverA} className="text-sm hover:underline" style={{ color: 'var(--txt-suave)' }}>&larr; {volverTexto}</Link>
      </div>
      {acciones && <div className="flex gap-2">{acciones}</div>}
    </div>
  );
}

export function useListaAdmin(base, extra = {}) {
  const q = useQuery();
  const { navegar, path } = useRuta();
  const pagina = q.get('pagina') || '1';
  const filtros = Object.fromEntries(Object.keys(extra).map((k) => [k, q.get(k) || '']));
  const clave = JSON.stringify([pagina, filtros]);
  const carga = useCarga(() => api.get(consulta(base, { ...filtros, pagina })), [base, clave]);
  const ir = (cambios) => navegar(consulta(path, { ...filtros, pagina, ...cambios }));
  return { ...carga, pagina, filtros, ir, cambiarPagina: (p) => ir({ pagina: p }) };
}

export function useAccion(recargar) {
  const { avisar } = useAvisos();
  return async (peticion, { confirmar } = {}) => {
    if (confirmar && !window.confirm(confirmar)) return false;
    try {
      const r = await peticion();
      if (r?.message) avisar(r.message, 'success');
      await recargar();
      return true;
    } catch (err) {
      avisar(err.message, 'danger');
      return false;
    }
  };
}

export const estiloExito = { background: 'var(--success-500)', color: 'white', borderColor: 'var(--success-500)' };
