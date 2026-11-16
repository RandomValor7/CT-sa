import { Fragment, useEffect, useMemo, useState } from 'react';
import Icono from '../components/Icono.jsx';
import Contador from '../components/Contador.jsx';
import Particulas from '../components/Particulas.jsx';
import Turnstile from '../components/Turnstile.jsx';
import { Cargando, ErrorCarga, Estrellas } from '../components/ui.jsx';
import { Link } from '../router.jsx';
import { useSesion } from '../context/Sesion.jsx';
import { useAvisos } from '../context/Avisos.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { api } from '../api.js';
import '../styles/barra-nav.css';

const CLIENTES = [
  { archivo: 'cliente-voltara.jpg', nombre: 'Voltara' },
  { archivo: 'cliente-cobalto.jpg', nombre: 'Cobalto Telecom' },
  { archivo: 'cliente-meridiano.jpg', nombre: 'Meridiano Logística' },
  { archivo: 'cliente-zeta.jpg', nombre: 'Zeta Control' },
  { archivo: 'cliente-lumbre.jpg', nombre: 'Lumbre Energía' },
  { archivo: 'cliente-atlas.jpg', nombre: 'Atlas Sistemas' },
  { archivo: 'cliente-andes.jpg', nombre: 'Distribuciones Andes' },
];

function Palabras({ texto, inicio }) {
  return texto.split(' ').map((p, i) => (
    <Fragment key={`${p}-${i}`}>
      <span className="palabra" aria-hidden="true" style={{ '--i': inicio + i }}>{p}</span>{' '}
    </Fragment>
  ));
}

function PanelDatos() {
  return (
    <aside className="panel-datos" aria-hidden="true">
      <div className="pd-cab"><span><i className="pd-punto" />Enlace de fibra</span><span>Ilustrativo</span></div>
      <svg viewBox="0 0 320 170">
        <g className="rejilla">
          <line x1="0" y1="30" x2="320" y2="30" /><line x1="0" y1="70" x2="320" y2="70" />
          <line x1="0" y1="110" x2="320" y2="110" /><line x1="0" y1="150" x2="320" y2="150" />
        </g>
        <polyline className="traza" points="0,120 30,110 60,125 90,80 120,95 150,50 180,70 210,40 240,60 270,30 320,45" />
        <polyline className="traza2" points="0,140 40,135 80,142 120,120 160,130 200,105 240,115 280,90 320,100" />
      </svg>
      <div className="pd-pie">Visualización ilustrativa de señal</div>
    </aside>
  );
}

function Hero({ whatsapp }) {
  return (
    <section className="hero">
      <div className="hero-grid-overlay" />
      <Particulas />
      <svg className="hero-signal-svg" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <line className="link" x1="80" y1="320" x2="420" y2="140" />
        <line className="link" x1="420" y1="140" x2="720" y2="60" />
        <line className="link" x1="420" y1="140" x2="680" y2="300" />
        <circle className="node" cx="80" cy="320" r="5" />
        <circle className="node" cx="420" cy="140" r="7" />
        <circle className="node" cx="720" cy="60" r="5" />
        <circle className="node" cx="680" cy="300" r="5" />
        <circle className="pulse pulse-dot" r="3" style={{ offsetPath: "path('M 80,320 C 220,260 300,180 420,140')" }} />
        <circle className="pulse pulse-dot" r="3" style={{ offsetPath: "path('M 420,140 C 520,110 600,80 720,60')", animationDelay: '1.3s' }} />
        <circle className="pulse pulse-dot" r="3" style={{ offsetPath: "path('M 420,140 C 480,220 560,260 680,300')", animationDelay: '2.6s' }} />
      </svg>
      <div className="hero-content">
        <span className="eyebrow">Villa Aurora, Colombia · Desde 2020</span>
        <h1 className="mt-3" aria-label="Infraestructura de telecomunicaciones que conecta cada punto del mapa.">
          <Palabras texto="Infraestructura de" inicio={0} />{' '}
          <span className="accent"><Palabras texto="telecomunicaciones" inicio={2} /></span>{' '}
          <Palabras texto="que conecta cada punto del mapa." inicio={3} />
        </h1>
        <p className="lead">Fibra óptica, redes inalámbricas, instalaciones eléctricas y seguridad electrónica, con cobertura desde Villa Aurora hasta las zonas más apartadas de la región.</p>
        <div className="hero-acciones flex flex-wrap gap-4 mt-8">
          <a href={`https://wa.me/${whatsapp}?text=Hola%2C%20quisiera%20cotizar%20un%20proyecto`} target="_blank" rel="noopener noreferrer" className="btn-primary">
            <Icono n="whatsapp" /> Cotizar un proyecto
          </a>
          <Link to="/servicios" className="btn-outline">Ver servicios</Link>
        </div>
        <div className="hero-stats">
          <div><strong><Contador fin={2020} /></strong><span>Operando desde</span></div>
          <div><strong><Contador fin={CLIENTES.length} duracion={900} /></strong><span>Clientes empresariales</span></div>
          <div><strong>Región andina</strong><span>Cobertura regional</span></div>
        </div>
      </div>
      <PanelDatos />
    </section>
  );
}

function Catalogo({ productos, whatsapp }) {
  const [seleccionado, setSeleccionado] = useState(null);

  const grupos = useMemo(() => {
    const ordenados = [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre));
    const mapa = new Map();
    ordenados.forEach((p) => {
      const letra = p.nombre.charAt(0).toUpperCase();
      if (!mapa.has(letra)) mapa.set(letra, []);
      mapa.get(letra).push(p);
    });
    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [productos]);

  useEffect(() => {
    if (!seleccionado) return undefined;
    const alTecla = (e) => { if (e.key === 'Escape') setSeleccionado(null); };
    window.addEventListener('keydown', alTecla);
    return () => window.removeEventListener('keydown', alTecla);
  }, [seleccionado]);

  const cotizar = (nombre) => `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola, quisiera cotizar: ${nombre}`)}`;
  const irA = (e, letra) => {
    e.preventDefault();
    document.getElementById(`seccion-${letra}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <div id="nav-letras" className="mb-4 mt-4">
        {grupos.map(([letra]) => (
          <a key={letra} href={`#seccion-${letra}`} className="nav-letra" onClick={(e) => irA(e, letra)}>{letra}</a>
        ))}
      </div>
      <div id="productos-lista" className="flex flex-col gap-6 mt-4">
        {grupos.length === 0 && <p className="text-gray-500 text-sm mt-4">Todavía no hay productos publicados en el catálogo.</p>}
        {grupos.map(([letra, lista]) => (
          <section key={letra} id={`seccion-${letra}`}>
            <div className="flex items-center gap-3 mb-4 mt-10">
              <span className="font-mono text-sm" style={{ color: 'var(--signal-500)' }}>{letra}</span>
              <hr className="flex-grow border-gray-200" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {lista.map((p) => (
                <div className="producto fade-in visible" key={p.nombre + p.imagen}>
                  <div className="spec-card h-full">
                    <img alt={p.nombre} src={p.imagen} loading="lazy" />
                    <div>
                      <h4>{p.nombre}</h4>
                      <p>{p.descripcion.length > 60 ? `${p.descripcion.slice(0, 60)}...` : p.descripcion}</p>
                    </div>
                    <div className="mt-auto pt-2 flex flex-col gap-2">
                      <button type="button" className="text-xs text-left hover:underline" style={{ color: 'var(--signal-300)' }}
                        onClick={() => setSeleccionado(p)}>Ver ficha completa</button>
                      <a href={cotizar(p.nombre)} target="_blank" rel="noopener noreferrer"
                        className="text-white px-3 py-2 rounded text-center text-sm hover:opacity-90" style={{ background: '#22C55E' }}>
                        <Icono n="whatsapp" /> Cotizar
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {seleccionado && (
        <div id="modal" className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50"
          style={{ display: 'flex' }} role="dialog" aria-modal="true" aria-label={`Ficha de ${seleccionado.nombre}`}
          onClick={(e) => { if (e.target === e.currentTarget) setSeleccionado(null); }}>
          <div id="modal-contenido" className="max-w-md w-full mx-4">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
              <span className="font-mono text-xs" style={{ color: 'var(--signal-500)' }}>FICHA TÉCNICA</span>
              <h2 className="text-2xl font-display font-semibold mb-4" style={{ color: 'var(--txt)' }}>{seleccionado.nombre}</h2>
              <img src={seleccionado.imagen} alt={seleccionado.nombre} className="w-full h-40 object-cover rounded mb-4" />
              <p className="text-gray-700">{seleccionado.descripcion}</p>
              <a href={cotizar(seleccionado.nombre)} target="_blank" rel="noopener noreferrer"
                className="block mt-4 text-center text-white py-2 rounded hover:opacity-90" style={{ background: '#22C55E' }}>
                <Icono n="whatsapp" /> Cotizar por WhatsApp
              </a>
              <button type="button" className="mt-4 text-gray-600 hover:underline block mx-auto" autoFocus
                onClick={() => setSeleccionado(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FormularioResena({ siteKey }) {
  const { avisar } = useAvisos();
  const [valores, setValores] = useState({ nombre: '', comentario: '', calificacion: '5' });
  const [errores, setErrores] = useState({});
  const [token, setToken] = useState('');
  const [reinicio, setReinicio] = useState(0);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => setValores((v) => ({ ...v, [e.target.name]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    if (siteKey && !token) { avisar('Completa la verificación para continuar.', 'danger'); return; }
    setEnviando(true);
    setErrores({});
    try {
      const r = await api.post('/api/resenas', { ...valores, 'cf-turnstile-response': token });
      avisar(r.message, 'success');
      setValores({ nombre: '', comentario: '', calificacion: '5' });
    } catch (err) {
      setErrores(err.errores);
      avisar(err.message, 'danger');
    } finally {
      setEnviando(false);
      setReinicio((n) => n + 1);
    }
  };

  return (
    <form onSubmit={enviar} className="op-form" noValidate>
      <h3 className="op-form-titulo">Cuéntanos tu experiencia</h3>
      <div>
        <span className="op-etiqueta" id="etq-calificacion">Tu calificación</span>
        <SelectorEstrellas valor={Number(valores.calificacion)} alCambiar={(n) => setValores((v) => ({ ...v, calificacion: String(n) }))} />
        {errores.calificacion && <p className="form-error">{errores.calificacion}</p>}
      </div>
      <div>
        <label htmlFor="nombre" className="form-label">Nombre (opcional)</label>
        <input id="nombre" name="nombre" maxLength={100} placeholder="¿Cómo te llamas?" className="form-input" value={valores.nombre} onChange={cambiar} />
        {errores.nombre && <p className="form-error">{errores.nombre}</p>}
      </div>
      <div>
        <label htmlFor="comentario" className="form-label">Comentario</label>
        <textarea id="comentario" name="comentario" rows={3} placeholder="¿Qué tal fue el servicio?" className="form-input"
          style={{ resize: 'vertical' }} value={valores.comentario} onChange={cambiar} />
        {errores.comentario && <p className="form-error">{errores.comentario}</p>}
      </div>
      <Turnstile siteKey={siteKey} onToken={setToken} reinicio={reinicio} />
      <button type="submit" className="button-primary op-enviar" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar reseña'}</button>
    </form>
  );
}

function SelectorEstrellas({ valor, alCambiar }) {
  const [previa, setPrevia] = useState(0);
  const mostrado = previa || valor;
  const TEXTOS = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];
  return (
    <div className="op-estrellas" role="radiogroup" aria-labelledby="etq-calificacion" onMouseLeave={() => setPrevia(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={valor === n} aria-label={`${n} de 5 estrellas`}
          className={n <= mostrado ? 'llena' : ''} onMouseEnter={() => setPrevia(n)} onFocus={() => setPrevia(n)} onBlur={() => setPrevia(0)}
          onClick={() => alCambiar(n)}>★</button>
      ))}
      <span className="op-estrellas-texto">{TEXTOS[mostrado]}</span>
    </div>
  );
}

function Opiniones({ resenas, siteKey }) {
  const [indice, setIndice] = useState(0);
  const [pausa, setPausa] = useState(false);
  const total = resenas.length;
  const promedio = total ? resenas.reduce((a, r) => a + Number(r.calificacion), 0) / total : 0;
  const distribucion = [5, 4, 3, 2, 1].map((n) => ({ n, c: resenas.filter((r) => Number(r.calificacion) === n).length }));

  useEffect(() => {
    if (total < 2 || pausa) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = window.setInterval(() => setIndice((i) => (i + 1) % total), 7000);
    return () => window.clearInterval(t);
  }, [total, pausa]);

  const actual = resenas[indice % Math.max(total, 1)];
  const inicial = (actual?.nombre || 'A').trim().charAt(0).toUpperCase();

  return (
    <section id="resena" className="opiniones mt-8">
      <div className="op-columna">
        <span className="eyebrow">Opiniones</span>
        <h2 className="section-heading mt-2">Lo que dicen nuestros clientes</h2>

        {total > 0 ? (
          <>
            <div className="op-resumen">
              <div className="op-promedio">
                <strong>{promedio.toFixed(1)}</strong>
                <Estrellas n={Math.round(promedio)} />
                <span>{total} reseña{total !== 1 ? 's' : ''}</span>
              </div>
              <div className="op-barras" aria-hidden="true">
                {distribucion.map((d) => (
                  <div key={d.n}><span>{d.n}★</span><i><b style={{ width: `${(d.c / total) * 100}%` }} /></i></div>
                ))}
              </div>
            </div>

            <figure className="op-cita" onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)} key={indice}>
              <span className="op-comillas" aria-hidden="true">&ldquo;</span>
              <blockquote>{actual.comentario}</blockquote>
              <figcaption>
                <span className="op-inicial">{inicial}</span>
                <span><strong>{actual.nombre || 'Anónimo'}</strong><Estrellas n={Number(actual.calificacion)} /></span>
              </figcaption>
            </figure>
            {total > 1 && (
              <div className="op-puntos" role="tablist" aria-label="Elegir reseña">
                {resenas.map((r, i) => (
                  <button key={`${r.fecha}-${i}`} type="button" role="tab" aria-selected={i === indice % total}
                    aria-label={`Reseña ${i + 1}`} className={i === indice % total ? 'activo' : ''} onClick={() => setIndice(i)} />
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="op-vacio">Sé el primero en contarnos cómo fue tu experiencia con Nodalia.</p>
        )}
      </div>
      <div className="op-columna op-columna-form">
        <FormularioResena siteKey={siteKey} />
      </div>
    </section>
  );
}

export default function Inicio() {
  const { config } = useSesion();
  const empresa = config?.empresa ?? {};
  const { datos, error, cargando, recargar } = useCarga(() => api.get('/api/home'), []);

  return (
    <main>
      <Hero whatsapp={empresa.whatsapp} />
      <div className="container mx-auto p-6">
        <div className="contenido-cuadro visible" id="bienvenidos">
          <span className="eyebrow">Catálogo</span>
          <h2 className="section-heading mt-2">Insumos y equipos</h2>
          <p className="text-gray-600 mt-2">Suministramos los equipos que integramos en cada proyecto. Escríbenos para cotizar cualquiera de estos productos.</p>
          {cargando && <Cargando />}
          {error && <ErrorCarga error={error} onReintentar={recargar} />}
          {datos && <Catalogo productos={datos.productos} whatsapp={empresa.whatsapp} />}
        </div>

        <div className="contenido-cuadro visible mt-8 flex flex-col items-center text-center" id="clientes">
          <span className="eyebrow">Confianza</span>
          <h2 className="section-heading mt-2">Nuestros clientes</h2>
          <p className="text-gray-600 mt-3 max-w-lg">
            Empresas y organizaciones que ya confían en nuestra infraestructura:{' '}
            <strong>Voltara, Cobalto Telecom, Meridiano Logística, Zeta Control, Lumbre Energía, Atlas Sistemas, Distribuciones Andes.</strong>
          </p>
          <div className="carousel-container mt-8 w-full">
            <div className="carousel-wrapper">
              {[...CLIENTES, ...CLIENTES].map((c, i) => (
                <div className="carousel-logo-card" key={`${c.archivo}-${i}`}>
                  <img src={`/imagenes/${c.archivo}`} alt={c.nombre} loading="lazy" />
                  <span>{c.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Opiniones resenas={datos?.resenas ?? []} siteKey={config?.turnstileSiteKey} />

        <div className="contenido-cuadro visible mt-8" id="contacto-inicio">
          <span className="eyebrow">Ubicación</span>
          <h2 className="section-heading mt-2 mb-4">Contacto</h2>
          <div className="grid sm:grid-cols-2 gap-4 font-mono text-sm text-gray-600">
            <p><Icono n="location-dot" className="mr-2" style={{ color: 'var(--signal-500)' }} />{empresa.direccion}</p>
            <p><Icono n="phone" className="mr-2" style={{ color: 'var(--signal-500)' }} />{empresa.telefonos}</p>
            <p><Icono n="envelope" className="mr-2" style={{ color: 'var(--signal-500)' }} /><a href={`mailto:${empresa.email}`} className="hover:underline">{empresa.email}</a></p>
            <p><Icono n="building" className="mr-2" style={{ color: 'var(--signal-500)' }} />NIT {empresa.nit}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
