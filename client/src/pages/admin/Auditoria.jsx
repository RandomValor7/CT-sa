import { Cargando, ErrorCarga, Insignia, Paginacion } from '../../components/ui.jsx';
import { CabeceraAdmin, useListaAdmin } from '../../components/admin.jsx';
import { formatearFecha } from '../../api.js';

export default function Auditoria() {
  const { datos, error, cargando, recargar, cambiarPagina } = useListaAdmin('/api/admin/auditoria');
  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorCarga error={error} onReintentar={recargar} />;

  return (
    <main className="container mx-auto p-6">
      <div className="contenido-cuadro visible">
        <CabeceraAdmin titulo="Auditoría de acciones" volverA="/admin/usuarios" volverTexto="Volver a usuarios" />
        <p className="text-sm text-gray-600 mt-2">Registro de cambios de rol, productos y moderación hechos desde este panel. Solo lectura.</p>
        {datos.items.length > 0 ? (
          <div className="mt-6 table-responsive">
            <table className="data-table">
              <caption className="sr-only">Historial de acciones administrativas</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Quién</th>
                  <th scope="col">Acción</th>
                  <th scope="col">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {datos.items.map((e) => (
                  <tr key={e.id}>
                    <td className="text-gray-500 text-xs font-mono whitespace-nowrap">{formatearFecha(e.fecha)}</td>
                    <td>{e.admin_nombre}</td>
                    <td><Insignia tono="info">{e.accion}</Insignia></td>
                    <td className="text-gray-600 text-sm">{e.detalle || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state mt-6">Todavía no hay acciones registradas.</p>
        )}
        <Paginacion pagina={datos.pagina} totalPaginas={datos.totalPaginas} total={datos.total} etiqueta="entradas" onCambiar={cambiarPagina} />
      </div>
    </main>
  );
}
