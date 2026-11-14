import { useCarga } from '../hooks/useCarga.js';
import { api } from '../api.js';

const COLOR_ESTADO = { pendiente: '#F2994A', pagada: '#22C55E', anulada: '#EF4444' };
const NOMBRE_ESTADO = { pendiente: 'Pendientes', pagada: 'Pagadas', anulada: 'Anuladas' };
const moneda = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

function Tarjeta({ titulo, subtitulo, children }) {
  return (
    <section className="gr-tarjeta">
      <div className="gr-cab"><h3>{titulo}</h3>{subtitulo && <span>{subtitulo}</span>}</div>
      {children}
    </section>
  );
}

function BarrasMeses({ datos }) {
  const max = Math.max(1, ...datos.map((d) => d.total));
  const total = datos.reduce((a, d) => a + d.total, 0);
  return (
    <Tarjeta titulo="Mensajes por mes" subtitulo={`${total} en los últimos 6 meses`}>
      <div className="gr-barras" role="img" aria-label={datos.map((d) => `${d.etiqueta}: ${d.total}`).join(', ')}>
        {datos.map((d, i) => (
          <div key={d.mes} className="gr-barra-col">
            <span className="gr-valor">{d.total}</span>
            <div className="gr-barra-pista">
              <i style={{ height: `${(d.total / max) * 100}%`, animationDelay: `${i * 90}ms` }} />
            </div>
            <span className="gr-etq">{d.etiqueta}</span>
          </div>
        ))}
      </div>
    </Tarjeta>
  );
}

function Dona({ datos }) {
  const total = datos.reduce((a, d) => a + d.total, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let acumulado = 0;
  return (
    <Tarjeta titulo="Facturas por estado" subtitulo={`${total} en total`}>
      <div className="gr-dona-contenedor">
        <svg viewBox="0 0 140 140" className="gr-dona" role="img" aria-label={datos.map((d) => `${NOMBRE_ESTADO[d.estado]}: ${d.total}`).join(', ')}>
          <circle cx="70" cy="70" r={R} className="gr-dona-fondo" />
          {total > 0 && datos.map((d) => {
            const largo = (d.total / total) * C;
            const desfase = -acumulado;
            acumulado += largo;
            if (d.total === 0) return null;
            return (
              <circle key={d.estado} cx="70" cy="70" r={R} className="gr-dona-arco" stroke={COLOR_ESTADO[d.estado]}
                strokeDasharray={`${largo} ${C - largo}`} strokeDashoffset={desfase} transform="rotate(-90 70 70)" />
            );
          })}
          <text x="70" y="68" textAnchor="middle" className="gr-dona-num">{total}</text>
          <text x="70" y="86" textAnchor="middle" className="gr-dona-txt">facturas</text>
        </svg>
        <ul className="gr-leyenda">
          {datos.map((d) => (
            <li key={d.estado}>
              <i style={{ background: COLOR_ESTADO[d.estado] }} />
              <span><strong>{NOMBRE_ESTADO[d.estado]}</strong> · {d.total}</span>
              <em>{moneda(d.suma)}</em>
            </li>
          ))}
        </ul>
      </div>
    </Tarjeta>
  );
}

function BarrasResenas({ datos }) {
  const total = datos.reduce((a, d) => a + d.total, 0);
  const promedio = total ? datos.reduce((a, d) => a + d.calificacion * d.total, 0) / total : 0;
  const max = Math.max(1, ...datos.map((d) => d.total));
  return (
    <Tarjeta titulo="Reseñas por calificación" subtitulo={total ? `Promedio ${promedio.toFixed(1)} · ${total} publicadas` : 'Sin reseñas publicadas'}>
      <div className="gr-hbarras">
        {datos.map((d, i) => (
          <div key={d.calificacion} className="gr-hfila">
            <span>{d.calificacion}★</span>
            <div className="gr-hpista"><i style={{ width: `${(d.total / max) * 100}%`, animationDelay: `${i * 90}ms` }} /></div>
            <strong>{d.total}</strong>
          </div>
        ))}
      </div>
    </Tarjeta>
  );
}

export default function Graficas() {
  const { datos, error, cargando } = useCarga(() => api.get('/api/admin/estadisticas'), []);
  if (cargando && !datos) return <div className="gr-rejilla" aria-busy="true"><div className="gr-tarjeta gr-esqueleto" /><div className="gr-tarjeta gr-esqueleto" /><div className="gr-tarjeta gr-esqueleto" /></div>;
  if (error || !datos) return null;
  return (
    <div className="gr-rejilla">
      <BarrasMeses datos={datos.mensajesPorMes} />
      <Dona datos={datos.facturasPorEstado} />
      <BarrasResenas datos={datos.resenasPorCalificacion} />
    </div>
  );
}
