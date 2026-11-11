import Icono from '../../components/Icono.jsx';
import { Cargando, ErrorCarga, Insignia, Paginacion } from '../../components/ui.jsx';
import { CabeceraAdmin, useAccion, useListaAdmin } from '../../components/admin.jsx';
import { api, formatearFecha } from '../../api.js';

export default function Mensajes() {
  const { datos, error, cargando, recargar, cambiarPagina } = useListaAdmin('/api/admin/mensajes');
  const ejecutar = useAccion(recargar);
  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorCarga error={error} onReintentar={recargar} />;

  return (
    <main className="container mx-auto p-6">
      <div className="contenido-cuadro visible">
        <CabeceraAdmin titulo="Mensajes de contacto" acciones={
          <a href="/api/admin/mensajes/exportar.csv" className="icon-btn"><Icono n="file-csv" /> Exportar CSV</a>
        } />
        {datos.items.length > 0 ? (
          <ul className="mt-6 space-y-4">
            {datos.items.map((m) => (
              <li key={m.id} className={`p-4 rounded-lg border hover-lift${m.leido ? '' : ' border-l-4'}`}
                style={m.leido ? { borderColor: 'var(--border-subtle)' } : { borderLeftColor: 'var(--copper-500)', background: 'var(--paper-100)' }}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-semibold flex items-center gap-2" style={{ color: 'var(--ink-900)' }}>
                      {m.nombre}
                      {!m.leido && <Insignia tono="warning" icono="bell">Nuevo</Insignia>}
                    </p>
                    <p className="text-sm text-gray-500">{m.email} · {formatearFecha(m.fecha)}</p>
                  </div>
                  <div className="flex gap-2">
                    {!m.leido && (
                      <button type="button" className="icon-btn" onClick={() => ejecutar(() => api.post(`/api/admin/mensajes/${m.id}/marcar-leido`))}>
                        <Icono n="check" /> Marcar leído
                      </button>
                    )}
                    <button type="button" className="icon-btn icon-btn-danger"
                      onClick={() => ejecutar(() => api.delete(`/api/admin/mensajes/${m.id}`), { confirmar: '¿Eliminar este mensaje?' })}>
                      <Icono n="trash" /> Eliminar
                    </button>
                  </div>
                </div>
                <p className="text-gray-700 mt-3 text-sm whitespace-pre-line">{m.mensaje}</p>
                <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 mt-2 text-xs hover:underline" style={{ color: 'var(--ink-700)' }}>
                  <Icono n="reply" /> Responder por correo
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state mt-6">No hay mensajes de contacto todavía.</p>
        )}
        <Paginacion pagina={datos.pagina} totalPaginas={datos.totalPaginas} total={datos.total} etiqueta="mensajes" onCambiar={cambiarPagina} />
      </div>
    </main>
  );
}
