import Icono from '../components/Icono.jsx';
import { BadgeEstado, Cargando, ErrorCarga, Paginacion } from '../components/ui.jsx';
import { Link, useQuery, useRuta } from '../router.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { api, consulta, formatearMonto } from '../api.js';

export default function MisFacturas() {
  const q = useQuery();
  const { navegar } = useRuta();
  const estado = q.get('estado') || '';
  const pagina = q.get('pagina') || '1';
  const { datos, error, cargando, recargar } = useCarga(
    () => api.get(consulta('/api/mis-facturas', { estado, pagina })),
    [estado, pagina],
  );

  const ir = (cambios) => navegar(consulta('/mis-facturas', { estado, pagina: 1, ...cambios }));

  return (
    <main className="container mx-auto p-6 mt-4">
      <div className="contenido-cuadro visible">
        <span className="eyebrow">Área de clientes</span>
        <h1 className="section-heading mt-2 mb-2">Mis facturas</h1>
        <Link to="/perfil" className="text-sm hover:underline" style={{ color: 'var(--slate-600)' }}>&larr; Volver a mi perfil</Link>

        <div className="mt-6 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="estado" className="form-label">Estado</label>
            <select id="estado" className="form-input text-sm" value={estado} onChange={(e) => ir({ estado: e.target.value })}>
              <option value="">Todas</option>
              {(datos?.estados ?? []).map((e) => <option key={e.valor} value={e.valor}>{e.etiqueta}</option>)}
            </select>
          </div>
          {estado && <button type="button" className="icon-btn" onClick={() => ir({ estado: '' })}>Limpiar filtro</button>}
        </div>

        {cargando && !datos && <Cargando />}
        {error && <ErrorCarga error={error} onReintentar={recargar} />}

        {datos && (datos.items.length > 0 ? (
          <div className="mt-6 table-responsive">
            <table className="data-table">
              <caption className="sr-only">Historial de tus facturas</caption>
              <thead>
                <tr>
                  <th scope="col">Número</th>
                  <th scope="col">Fecha factura</th>
                  <th scope="col">Monto</th>
                  <th scope="col">Estado</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {datos.items.map((f) => (
                  <tr key={f.id}>
                    <td className="font-mono text-xs">{f.numero_factura || `#${f.id}`}</td>
                    <td className="text-gray-600 text-xs font-mono">{f.fecha_factura || '—'}</td>
                    <td className="font-mono text-sm">{formatearMonto(f.monto)}</td>
                    <td><BadgeEstado estado={f.estado} conIcono /></td>
                    <td>
                      <div className="flex gap-3">
                        <Link to={`/mis-facturas/${f.id}`} className="hover:underline text-sm font-semibold" style={{ color: 'var(--ink-700)' }}>Ver detalle</Link>
                        {f.tieneArchivo && (
                          <a href={`/api/perfil/facturas/${f.id}/descargar`} className="hover:underline text-sm font-semibold" style={{ color: 'var(--ink-700)' }}>
                            <Icono n="download" /> Descargar
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state mt-6">No tienes facturas registradas todavía.</p>
        ))}

        {datos && (
          <Paginacion pagina={datos.pagina} totalPaginas={datos.totalPaginas} total={datos.total} etiqueta="facturas"
            onCambiar={(p) => ir({ pagina: p })} />
        )}
      </div>
    </main>
  );
}
