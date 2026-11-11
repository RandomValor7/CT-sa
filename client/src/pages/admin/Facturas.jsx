import { useEffect, useState } from 'react';
import Icono from '../../components/Icono.jsx';
import { BadgeEstado, Cargando, ErrorCarga, Paginacion } from '../../components/ui.jsx';
import { CabeceraAdmin, useAccion, useListaAdmin } from '../../components/admin.jsx';
import { Link } from '../../router.jsx';
import { api, consulta, formatearMonto } from '../../api.js';

const FILTROS = { usuario_id: '', estado: '', fecha_desde: '', fecha_hasta: '' };

export default function Facturas() {
  const { datos, error, cargando, recargar, cambiarPagina, filtros, ir } = useListaAdmin('/api/admin/facturas', FILTROS);
  const ejecutar = useAccion(recargar);
  const [borrador, setBorrador] = useState(FILTROS);

  useEffect(() => { setBorrador({ ...FILTROS, ...filtros }); }, [JSON.stringify(filtros)]); // eslint-disable-line react-hooks/exhaustive-deps

  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorCarga error={error} onReintentar={recargar} />;

  const cambiar = (e) => setBorrador((b) => ({ ...b, [e.target.name]: e.target.value }));
  const filtrar = (e) => { e.preventDefault(); ir({ ...borrador, pagina: 1 }); };
  const hayFiltros = Object.values(filtros).some(Boolean);

  return (
    <main className="container mx-auto p-6">
      <div className="contenido-cuadro visible">
        <CabeceraAdmin titulo="Gestión de facturas" acciones={
          <>
            <a href={consulta('/api/admin/facturas/exportar.csv', filtros)} className="icon-btn"><Icono n="file-csv" /> Exportar CSV</a>
            <Link to="/admin/facturas/nueva" className="button-primary"><Icono n="plus" /> Nueva factura</Link>
          </>
        } />

        <form onSubmit={filtrar} className="mt-6 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label htmlFor="usuario_id" className="form-label">Cliente</label>
            <select id="usuario_id" name="usuario_id" className="form-input text-sm" value={borrador.usuario_id} onChange={cambiar}>
              <option value="">Todos</option>
              {datos.usuarios.map((u) => <option key={u.id} value={u.id}>{u.etiqueta}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="estado" className="form-label">Estado</label>
            <select id="estado" name="estado" className="form-input text-sm" value={borrador.estado} onChange={cambiar}>
              <option value="">Todos</option>
              {datos.estados.map((e) => <option key={e.valor} value={e.valor}>{e.etiqueta}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="fecha_desde" className="form-label">Desde</label>
            <input type="date" id="fecha_desde" name="fecha_desde" className="form-input text-sm" value={borrador.fecha_desde} onChange={cambiar} />
          </div>
          <div>
            <label htmlFor="fecha_hasta" className="form-label">Hasta</label>
            <input type="date" id="fecha_hasta" name="fecha_hasta" className="form-input text-sm" value={borrador.fecha_hasta} onChange={cambiar} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="button-primary"><Icono n="filter" /> Filtrar</button>
            {hayFiltros && <button type="button" className="icon-btn" onClick={() => ir({ ...FILTROS, pagina: 1 })}>Limpiar</button>}
          </div>
        </form>

        {datos.items.length > 0 ? (
          <div className="mt-6 table-responsive">
            <table className="data-table">
              <caption className="sr-only">Listado de facturas de todos los clientes</caption>
              <thead>
                <tr>
                  <th scope="col">Número</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Fecha factura</th>
                  <th scope="col">Monto</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Archivo</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {datos.items.map((f) => (
                  <tr key={f.id}>
                    <td className="font-mono text-xs">{f.numero_factura || `#${f.id}`}</td>
                    <td>{f.usuario_nombre}<span className="block text-xs text-gray-500">{f.usuario_email}</span></td>
                    <td className="text-gray-600 text-xs font-mono">{f.fecha_factura || '—'}</td>
                    <td className="font-mono text-sm">{formatearMonto(f.monto)}</td>
                    <td>
                      <label className="sr-only" htmlFor={`estado-${f.id}`}>Estado de la factura {f.numero_factura || f.id}</label>
                      <select id={`estado-${f.id}`} value={f.estado} className="text-xs border rounded px-2 py-1.5" style={{ borderColor: 'var(--border-strong)' }}
                        onChange={(e) => ejecutar(() => api.post(`/api/admin/facturas/${f.id}/estado`, { estado: e.target.value }))}>
                        {datos.estados.map((e) => <option key={e.valor} value={e.valor}>{e.etiqueta}</option>)}
                      </select>
                      {' '}<BadgeEstado estado={f.estado} conIcono />
                    </td>
                    <td>
                      {f.tieneArchivo ? (
                        <a href={`/api/admin/facturas/${f.id}/descargar`} className="hover:underline text-xs font-semibold" style={{ color: 'var(--ink-700)' }}>
                          <Icono n="download" /> Descargar
                        </a>
                      ) : <span className="text-xs text-gray-400">Sin archivo</span>}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link to={`/admin/facturas/${f.id}/editar`} className="icon-btn" aria-label="Editar factura"><Icono n="pen" /></Link>
                        <button type="button" className="icon-btn icon-btn-danger" aria-label="Eliminar factura"
                          onClick={() => ejecutar(() => api.delete(`/api/admin/facturas/${f.id}`), { confirmar: '¿Eliminar esta factura permanentemente?' })}>
                          <Icono n="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state mt-6">No hay facturas que coincidan con estos filtros.</p>
        )}
        <Paginacion pagina={datos.pagina} totalPaginas={datos.totalPaginas} total={datos.total} etiqueta="facturas" onCambiar={cambiarPagina} />
      </div>
    </main>
  );
}
