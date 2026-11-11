import Icono from '../../components/Icono.jsx';
import { Cargando, ErrorCarga, Estrellas, Insignia, Paginacion } from '../../components/ui.jsx';
import { CabeceraAdmin, estiloExito, useAccion, useListaAdmin } from '../../components/admin.jsx';
import { api, formatearFecha } from '../../api.js';

export default function Resenas() {
  const { datos, error, cargando, recargar, cambiarPagina } = useListaAdmin('/api/admin/resenas');
  const ejecutar = useAccion(recargar);
  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorCarga error={error} onReintentar={recargar} />;

  return (
    <main className="container mx-auto p-6">
      <div className="contenido-cuadro visible">
        <CabeceraAdmin titulo="Reseñas" />
        {datos.items.length > 0 ? (
          <ul className="mt-6 space-y-4">
            {datos.items.map((r) => (
              <li key={r.id} className={`p-4 rounded-lg border hover-lift${r.aprobada ? '' : ' border-l-4'}`}
                style={r.aprobada ? { borderColor: 'var(--border-subtle)' } : { borderLeftColor: 'var(--copper-500)', background: 'var(--paper-100)' }}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-semibold flex items-center gap-2" style={{ color: 'var(--txt)' }}>
                      {r.nombre || 'Anónimo'}
                      {r.aprobada
                        ? <Insignia tono="success" icono="circle-check">Publicada</Insignia>
                        : <Insignia tono="warning" icono="hourglass-half">Pendiente</Insignia>}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--copper-500)' }}><Estrellas n={r.calificacion} /></p>
                    <p className="text-xs text-gray-500 font-mono">{formatearFecha(r.fecha)}</p>
                  </div>
                  <div className="flex gap-2">
                    {r.aprobada ? (
                      <button type="button" className="icon-btn" onClick={() => ejecutar(() => api.post(`/api/admin/resenas/${r.id}/ocultar`))}>
                        <Icono n="eye-slash" /> Ocultar
                      </button>
                    ) : (
                      <button type="button" className="icon-btn icon-btn-success" style={estiloExito}
                        onClick={() => ejecutar(() => api.post(`/api/admin/resenas/${r.id}/aprobar`))}>
                        <Icono n="check" /> Aprobar
                      </button>
                    )}
                    <button type="button" className="icon-btn icon-btn-danger"
                      onClick={() => ejecutar(() => api.delete(`/api/admin/resenas/${r.id}`), { confirmar: '¿Eliminar esta reseña?' })}>
                      <Icono n="trash" /> Eliminar
                    </button>
                  </div>
                </div>
                <p className="text-gray-700 mt-3 text-sm italic">&ldquo;{r.comentario}&rdquo;</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state mt-6">No hay reseñas todavía.</p>
        )}
        <Paginacion pagina={datos.pagina} totalPaginas={datos.totalPaginas} total={datos.total} etiqueta="reseñas" onCambiar={cambiarPagina} />
      </div>
    </main>
  );
}
