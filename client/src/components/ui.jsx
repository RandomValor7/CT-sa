import { useState } from 'react';
import Icono from './Icono.jsx';

export function Campo({ id, etiqueta, error, ayuda, children }) {
  return (
    <div className="mb-4">
      {etiqueta && <label htmlFor={id} className="form-label">{etiqueta}</label>}
      {children}
      {ayuda && <p className="text-xs text-gray-500 mt-1">{ayuda}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}

export function CampoPassword({ id = 'password', value, onChange, autoComplete = 'current-password', placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative input-icon-wrapper">
      <input id={id} name={id} type={visible ? 'text' : 'password'} className="form-input" value={value}
        onChange={onChange} autoComplete={autoComplete} placeholder={placeholder} />
      <button type="button" className="absolute inset-y-0 right-0 flex items-center justify-center text-gray-500"
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVisible((v) => !v)}>
        <Icono n={visible ? 'eye-slash' : 'eye'} />
      </button>
    </div>
  );
}

export function Insignia({ tono = 'neutral', icono, children }) {
  return (
    <span className={`badge badge-${tono}`}>
      {icono && <Icono n={icono} />}
      {children}
    </span>
  );
}

export function Kpi({ valor, etiqueta, icono = 'chart-simple' }) {
  return (
    <div className="kpi-card hover-lift">
      <span className="kpi-icon" aria-hidden="true"><Icono n={icono} /></span>
      <div>
        <p className="kpi-value">{valor}</p>
        <p className="kpi-label">{etiqueta}</p>
      </div>
    </div>
  );
}

export function Paginacion({ pagina, totalPaginas, total, etiqueta = 'resultados', onCambiar }) {
  if (!totalPaginas || totalPaginas <= 1) return null;
  const anterior = pagina <= 1;
  const siguiente = pagina >= totalPaginas;
  return (
    <nav className="pagination mt-6" aria-label="Paginación">
      <button type="button" className="icon-btn" disabled={anterior} style={anterior ? { opacity: 0.4 } : undefined}
        onClick={() => onCambiar(pagina - 1)}>
        <Icono n="chevron-left" /> Anterior
      </button>
      <span className="pagination-info font-mono text-xs" style={{ color: 'var(--slate-600)' }}>
        Página {pagina} de {totalPaginas}{total !== undefined ? ` · ${total} ${etiqueta}` : ''}
      </span>
      <button type="button" className="icon-btn" disabled={siguiente} style={siguiente ? { opacity: 0.4 } : undefined}
        onClick={() => onCambiar(pagina + 1)}>
        Siguiente <Icono n="chevron-right" />
      </button>
    </nav>
  );
}

export function Cargando({ texto = 'Cargando…' }) {
  return <p className="text-gray-500 text-sm py-10 text-center" role="status">{texto}</p>;
}

export function ErrorCarga({ error, onReintentar }) {
  return (
    <div className="text-center py-10" role="alert">
      <p className="text-sm" style={{ color: 'var(--danger-600)' }}>{error?.message || 'No se pudo cargar la información.'}</p>
      {onReintentar && <button type="button" className="icon-btn mt-3" onClick={onReintentar}>Reintentar</button>}
    </div>
  );
}

export function Estrellas({ n }) {
  return <span aria-label={`${n} de 5 estrellas`}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

export function Tarjeta({ eyebrow, titulo, children, ancho = 'max-w-md' }) {
  return (
    <div className="auth-fondo">
      <div className={`w-full ${ancho} mx-auto px-4`}>
        <div className="contenido-principal visible">
          {eyebrow && <span className="eyebrow block text-center">{eyebrow}</span>}
          {titulo && <h2 className="text-2xl font-display font-semibold text-center mt-2 mb-6" style={{ color: 'var(--ink-900)' }}>{titulo}</h2>}
          {children}
        </div>
      </div>
    </div>
  );
}

export function mapearErrores(err) {
  return err?.errores ?? {};
}

const TONO_ESTADO = { pendiente: 'warning', pagada: 'success', anulada: 'danger' };
const ICONO_ESTADO = { pendiente: 'clock', pagada: 'circle-check', anulada: 'ban' };

export function BadgeEstado({ estado, conIcono = false }) {
  const texto = estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : '';
  return <Insignia tono={TONO_ESTADO[estado] ?? 'neutral'} icono={conIcono ? ICONO_ESTADO[estado] : undefined}>{texto}</Insignia>;
}
