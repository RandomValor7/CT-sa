import { Kpi, Cargando, ErrorCarga } from '../../components/ui.jsx';
import { Link } from '../../router.jsx';
import { useSesion } from '../../context/Sesion.jsx';
import { useCarga } from '../../hooks/useCarga.js';
import { api } from '../../api.js';

export default function Dashboard() {
  const { usuario } = useSesion();
  const { datos, error, cargando, recargar } = useCarga(() => api.get('/api/admin/dashboard'), []);
  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorCarga error={error} onReintentar={recargar} />;

  const { mensajesSinLeer, resenasPendientes, statsAdmin } = datos;
  return (
    <main className="container mx-auto p-6">
      <div className="contenido-cuadro visible">
        <span className="eyebrow">Panel interno · {usuario.rol === 'administrador' ? 'Administrador' : 'Moderador'}</span>
        <h1 className="section-heading mt-2 mb-6">Administración</h1>

        {statsAdmin && (
          <div className="kpi-grid mb-8" style={{ '--kpi-cols': 5 }}>
            <Kpi valor={statsAdmin.totalUsuarios} etiqueta="Usuarios" icono="users" />
            <Kpi valor={statsAdmin.totalFacturas} etiqueta="Facturas" icono="file-invoice" />
            <Kpi valor={statsAdmin.totalMensajes} etiqueta="Mensajes" icono="envelope" />
            <Kpi valor={statsAdmin.totalResenasPublicadas} etiqueta="Reseñas publicadas" icono="star" />
            <Kpi valor={statsAdmin.totalProductos} etiqueta="Productos" icono="boxes-stacked" />
          </div>
        )}

        <div className={`grid sm:grid-cols-2 ${statsAdmin ? 'lg:grid-cols-3' : ''} gap-5`}>
          <Link to="/admin/mensajes" className="spec-card hover-lift transition-opacity">
            <span className="spec-index">BANDEJA</span>
            <h3>Mensajes de contacto</h3>
            <p>{mensajesSinLeer > 0
              ? <span className="font-mono" style={{ color: 'var(--copper-400)' }}>{mensajesSinLeer} sin leer</span>
              : 'Todo al día, sin mensajes pendientes.'}</p>
          </Link>
          <Link to="/admin/resenas" className="spec-card hover-lift transition-opacity">
            <span className="spec-index">MODERACIÓN</span>
            <h3>Reseñas</h3>
            <p>{resenasPendientes > 0
              ? <span className="font-mono" style={{ color: 'var(--copper-400)' }}>{resenasPendientes} pendiente{resenasPendientes !== 1 ? 's' : ''} de revisar</span>
              : 'Sin reseñas pendientes de aprobar.'}</p>
          </Link>
          {statsAdmin && (
            <>
              <Link to="/admin/usuarios" className="spec-card hover-lift transition-opacity">
                <span className="spec-index">EQUIPO</span>
                <h3>Usuarios y roles</h3>
                <p>Gestiona quién es moderador o administrador.</p>
              </Link>
              <Link to="/admin/productos" className="spec-card hover-lift transition-opacity">
                <span className="spec-index">CATÁLOGO</span>
                <h3>Productos</h3>
                <p>Agrega, edita u oculta productos del catálogo público.</p>
              </Link>
              <Link to="/admin/facturas" className="spec-card hover-lift transition-opacity">
                <span className="spec-index">FACTURACIÓN</span>
                <h3>Gestión de facturas</h3>
                <p>Crea, filtra y cambia el estado de las facturas de todos los clientes.</p>
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
