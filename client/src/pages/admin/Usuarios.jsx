import Icono from '../../components/Icono.jsx';
import { Cargando, ErrorCarga, Paginacion } from '../../components/ui.jsx';
import { CabeceraAdmin, useAccion, useListaAdmin } from '../../components/admin.jsx';
import { Link } from '../../router.jsx';
import { useSesion } from '../../context/Sesion.jsx';
import { api, formatearFecha } from '../../api.js';

export default function Usuarios() {
  const { usuario } = useSesion();
  const { datos, error, cargando, recargar, cambiarPagina } = useListaAdmin('/api/admin/usuarios');
  const ejecutar = useAccion(recargar);
  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorCarga error={error} onReintentar={recargar} />;

  return (
    <main className="container mx-auto p-6">
      <div className="contenido-cuadro visible">
        <CabeceraAdmin titulo="Usuarios y roles" acciones={
          <>
            <Link to="/admin/auditoria" className="icon-btn"><Icono n="clock-rotate-left" /> Auditoría</Link>
            <a href="/api/admin/usuarios/exportar.csv" className="icon-btn"><Icono n="file-csv" /> Exportar CSV</a>
          </>
        } />
        {datos.items.length > 0 ? (
          <div className="mt-6 table-responsive">
            <table className="data-table">
              <caption className="sr-only">Listado de usuarios registrados y sus roles</caption>
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Registro</th>
                  <th scope="col">Rol</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {datos.items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.nombre}
                      {u.id === usuario.id && <span className="badge badge-info ml-1">Tú</span>}
                      {u.google_id && <Icono n="google" className="text-xs ml-1" style={{ color: '#EA4335' }} />}
                    </td>
                    <td className="text-gray-600">{u.email}</td>
                    <td className="text-gray-500 text-xs font-mono">{formatearFecha(u.fecha_registro)}</td>
                    <td>
                      <label className="sr-only" htmlFor={`rol-${u.id}`}>Rol de {u.nombre}</label>
                      <select id={`rol-${u.id}`} value={u.rol} className="text-xs border rounded px-2 py-1.5" style={{ borderColor: 'var(--border-strong)' }}
                        onChange={(e) => ejecutar(() => api.post(`/api/admin/usuarios/${u.id}/rol`, { rol: e.target.value }))}>
                        {datos.roles.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td>
                      {u.id !== usuario.id && (
                        <button type="button" className="icon-btn icon-btn-danger"
                          onClick={() => ejecutar(() => api.delete(`/api/admin/usuarios/${u.id}`), { confirmar: `¿Eliminar a ${u.nombre}? Esta acción no se puede deshacer.` })}>
                          <Icono n="trash" /> Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state mt-6">No hay usuarios registrados todavía.</p>
        )}
        <Paginacion pagina={datos.pagina} totalPaginas={datos.totalPaginas} total={datos.total} etiqueta="usuarios" onCambiar={cambiarPagina} />
      </div>
    </main>
  );
}
