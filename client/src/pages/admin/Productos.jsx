import Icono from '../../components/Icono.jsx';
import { Cargando, ErrorCarga, Insignia, Paginacion } from '../../components/ui.jsx';
import { CabeceraAdmin, estiloExito, useAccion, useListaAdmin } from '../../components/admin.jsx';
import { Link } from '../../router.jsx';
import { api } from '../../api.js';

export default function Productos() {
  const { datos, error, cargando, recargar, cambiarPagina } = useListaAdmin('/api/admin/productos');
  const ejecutar = useAccion(recargar);
  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorCarga error={error} onReintentar={recargar} />;

  return (
    <main className="container mx-auto p-6">
      <div className="contenido-cuadro visible">
        <CabeceraAdmin titulo="Catálogo de productos" acciones={
          <Link to="/admin/productos/nuevo" className="button-primary"><Icono n="plus" /> Nuevo producto</Link>
        } />
        {datos.items.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {datos.items.map((p) => (
              <div key={p.id} className={`spec-card hover-lift${p.activo ? '' : ' opacity-50'}`}>
                <img src={p.imagen} alt={p.nombre} />
                {p.activo
                  ? <Insignia tono="success" icono="eye">Visible</Insignia>
                  : <Insignia tono="neutral" icono="eye-slash">Oculto</Insignia>}
                <h3>{p.nombre}</h3>
                <p>{p.descripcion.length > 80 ? `${p.descripcion.slice(0, 80)}...` : p.descripcion}</p>
                <div className="flex flex-wrap gap-2 mt-auto pt-2">
                  <Link to={`/admin/productos/${p.id}/editar`} className="icon-btn icon-btn-inverse"><Icono n="pen" /> Editar</Link>
                  {p.activo ? (
                    <button type="button" className="icon-btn icon-btn-inverse" onClick={() => ejecutar(() => api.post(`/api/admin/productos/${p.id}/desactivar`))}>
                      <Icono n="eye-slash" /> Ocultar
                    </button>
                  ) : (
                    <button type="button" className="icon-btn icon-btn-success" style={estiloExito} onClick={() => ejecutar(() => api.post(`/api/admin/productos/${p.id}/activar`))}>
                      <Icono n="eye" /> Mostrar
                    </button>
                  )}
                  <button type="button" className="icon-btn icon-btn-danger"
                    onClick={() => ejecutar(() => api.delete(`/api/admin/productos/${p.id}`), { confirmar: `¿Eliminar ${p.nombre} permanentemente?` })}>
                    <Icono n="trash" /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state mt-6">No hay productos todavía. Crea el primero con el botón de arriba.</p>
        )}
        <Paginacion pagina={datos.pagina} totalPaginas={datos.totalPaginas} total={datos.total} etiqueta="productos" onCambiar={cambiarPagina} />
      </div>
    </main>
  );
}
