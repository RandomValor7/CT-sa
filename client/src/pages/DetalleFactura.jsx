import Icono from '../components/Icono.jsx';
import { BadgeEstado, Cargando, ErrorCarga } from '../components/ui.jsx';
import NoEncontrada from './NoEncontrada.jsx';
import { Link, useParams } from '../router.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { api, formatearFecha, formatearMonto } from '../api.js';

function Fila({ etiqueta, children }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{etiqueta}</span>
      {children}
    </div>
  );
}

export default function DetalleFactura() {
  const { id } = useParams();
  const { datos, error, cargando, recargar } = useCarga(() => api.get(`/api/mis-facturas/${encodeURIComponent(id)}`), [id]);

  if (cargando && !datos) return <Cargando />;
  if (error?.estado === 404) return <NoEncontrada />;
  if (error) return <ErrorCarga error={error} onReintentar={recargar} />;

  const f = datos.factura;
  return (
    <main className="container mx-auto p-6 mt-4">
      <div className="contenido-cuadro visible max-w-lg mx-auto">
        <span className="eyebrow">Área de clientes</span>
        <h1 className="section-heading mt-2 mb-2">Factura {f.numero_factura || `#${f.id}`}</h1>
        <Link to="/mis-facturas" className="text-sm hover:underline" style={{ color: 'var(--txt-suave)' }}>&larr; Volver a mis facturas</Link>

        <div className="mt-6 space-y-4 p-5 rounded-lg" style={{ background: 'var(--paper-100)' }}>
          <Fila etiqueta="Estado"><BadgeEstado estado={f.estado} conIcono /></Fila>
          <Fila etiqueta="Monto"><span className="font-mono text-sm">{f.monto === null ? 'No especificado' : formatearMonto(f.monto)}</span></Fila>
          <Fila etiqueta="Fecha de la factura"><span className="font-mono text-sm">{f.fecha_factura || 'No especificada'}</span></Fila>
          <Fila etiqueta="Fecha de registro"><span className="font-mono text-sm">{formatearFecha(f.fecha_subida)}</span></Fila>
          {f.notas && (
            <div className="pt-3 border-t border-gray-200">
              <span className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>Notas</span>
              <p className="text-sm text-gray-600 mt-1">{f.notas}</p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          {f.tieneArchivo ? (
            <a href={`/api/perfil/facturas/${f.id}/descargar`} className="button-primary"><Icono n="download" /> Descargar factura</a>
          ) : (
            <p className="text-sm text-gray-500">Esta factura todavía no tiene un archivo adjunto.</p>
          )}
        </div>
      </div>
    </main>
  );
}
