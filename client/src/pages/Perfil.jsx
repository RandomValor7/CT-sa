import { useRef, useState } from 'react';
import Icono from '../components/Icono.jsx';
import { BadgeEstado, Cargando, ErrorCarga } from '../components/ui.jsx';
import { ESTILO_CODIGO } from './Verificar2fa.jsx';
import { Link, useRuta } from '../router.jsx';
import { useSesion } from '../context/Sesion.jsx';
import { useAvisos } from '../context/Avisos.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { api } from '../api.js';

const ROLES = { usuario: 'Cliente', moderador: 'Moderador', administrador: 'Administrador' };

function Avatar({ usuario, alCambiar }) {
  const { avisar } = useAvisos();
  const entrada = useRef(null);
  const [subiendo, setSubiendo] = useState(false);

  const elegir = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const datos = new FormData();
    datos.append('profile_picture', archivo);
    setSubiendo(true);
    try {
      const r = await api.post('/api/perfil/foto', datos);
      avisar(r.message, 'success');
      await alCambiar();
    } catch (err) {
      avisar(err.message, 'danger');
    } finally {
      setSubiendo(false);
      e.target.value = '';
    }
  };

  return (
    <div className="pf-avatar">
      <img id="profilePicture" alt="Foto de perfil" src={usuario.foto_perfil} />
      <button type="button" className="pf-avatar-boton" onClick={() => entrada.current?.click()} disabled={subiendo}
        aria-label="Cambiar foto de perfil" title="Cambiar foto de perfil">
        <Icono n="camera" />
      </button>
      <input ref={entrada} type="file" hidden accept="image/png,image/jpeg,image/gif" onChange={elegir} />
      {subiendo && <span className="pf-avatar-carga" aria-hidden="true" />}
    </div>
  );
}

function SubirFactura({ alTerminar }) {
  const { avisar } = useAvisos();
  const entrada = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [encima, setEncima] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const tomar = (lista) => {
    const f = lista?.[0];
    if (f) setArchivo(f);
  };

  const enviar = async () => {
    if (!archivo) { avisar('Selecciona un archivo primero.', 'danger'); return; }
    const datos = new FormData();
    datos.append('factura', archivo);
    setEnviando(true);
    try {
      const r = await api.post('/api/perfil/facturas', datos);
      avisar(r.message, 'success');
      setArchivo(null);
      if (entrada.current) entrada.current.value = '';
      await alTerminar();
    } catch (err) {
      avisar(err.message, 'danger');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pf-subida">
      <div
        className={`pf-zona${encima ? ' encima' : ''}${archivo ? ' con-archivo' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => { e.preventDefault(); setEncima(false); tomar(e.dataTransfer.files); }}
        onClick={() => entrada.current?.click()}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); entrada.current?.click(); } }}
      >
        <Icono n={archivo ? 'file-invoice' : 'file-arrow-up'} />
        <strong>{archivo ? archivo.name : 'Arrastra tu factura aquí o haz clic para elegirla'}</strong>
        <span>PDF, PNG, JPG o JPEG · máximo 5 MB</span>
        <input ref={entrada} type="file" hidden accept="application/pdf,image/png,image/jpeg" onChange={(e) => tomar(e.target.files)} />
      </div>
      <div className="pf-subida-acciones">
        {archivo && <button type="button" className="icon-btn" onClick={() => { setArchivo(null); if (entrada.current) entrada.current.value = ''; }}>Quitar</button>}
        <button type="button" className="button-primary" disabled={enviando || !archivo} onClick={enviar}>
          {enviando ? 'Enviando…' : 'Subir factura'}
        </button>
      </div>
    </div>
  );
}

function DosPasos({ activo, alCambiar }) {
  const { avisar } = useAvisos();
  const [confirmando, setConfirmando] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const desactivar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const r = await api.post('/api/perfil/2fa/desactivar', { codigo });
      avisar(r.message, 'success');
      setConfirmando(false);
      setCodigo('');
      await alCambiar();
    } catch (err) {
      avisar(err.message, 'danger');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pf-fila">
      <span className={`pf-fila-icono ${activo ? 'ok' : 'aviso'}`}><Icono n="shield-halved" /></span>
      <div className="pf-fila-texto">
        <h3>Verificación en dos pasos</h3>
        <p>{activo
          ? 'Activada: te pedirá un código extra cada vez que inicies sesión.'
          : 'Agrega una capa extra de seguridad con una app como Google Authenticator.'}</p>
        {activo && confirmando && (
          <form onSubmit={desactivar} className="pf-confirmar">
            <label htmlFor="codigo-desactivar">Código actual de tu app</label>
            <div>
              <input id="codigo-desactivar" className="form-input" style={{ ...ESTILO_CODIGO, width: '10rem' }} inputMode="numeric"
                maxLength={6} autoComplete="one-time-code" autoFocus required value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} />
              <button type="submit" className="icon-btn icon-btn-danger" disabled={enviando}><Icono n="toggle-off" /> Confirmar</button>
              <button type="button" className="icon-btn" onClick={() => { setConfirmando(false); setCodigo(''); }}>Cancelar</button>
            </div>
          </form>
        )}
      </div>
      {!confirmando && (activo ? (
        <button type="button" className="icon-btn icon-btn-danger" onClick={() => setConfirmando(true)}><Icono n="toggle-off" /> Desactivar</button>
      ) : (
        <Link to="/perfil/2fa/activar" className="pf-boton-ok"><Icono n="toggle-on" /> Activar</Link>
      ))}
    </div>
  );
}

function VerificacionCorreo({ verificado, email }) {
  const { avisar } = useAvisos();
  const [enviando, setEnviando] = useState(false);
  const reenviar = async () => {
    setEnviando(true);
    try {
      const r = await api.post('/api/auth/reenviar-verificacion');
      avisar(r.message, 'success');
    } catch (err) {
      avisar(err.message, 'danger');
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div className="pf-fila">
      <span className={`pf-fila-icono ${verificado ? 'ok' : 'aviso'}`}><Icono n={verificado ? 'circle-check' : 'envelope'} /></span>
      <div className="pf-fila-texto">
        <h3>Correo electrónico</h3>
        <p>{verificado ? `${email} está verificado.` : `Todavía no verificaste ${email}. Revisa tu bandeja o reenvía el correo.`}</p>
      </div>
      {!verificado && <button type="button" className="pf-boton-aviso" disabled={enviando} onClick={reenviar}>{enviando ? 'Enviando…' : 'Reenviar correo'}</button>}
    </div>
  );
}

function ListaFacturas({ facturas }) {
  if (facturas.length === 0) {
    return (
      <div className="pf-vacio">
        <Icono n="file-invoice" />
        <p>Todavía no has subido facturas.</p>
      </div>
    );
  }
  return (
    <ul className="pf-lista">
      {facturas.map((f) => (
        <li key={f.id}>
          <Link to={`/mis-facturas/${f.id}`} className="pf-lista-item">
            <span className="pf-lista-icono"><Icono n="file-invoice" /></span>
            <span className="pf-lista-nombre">{f.numero_factura || `Factura #${f.id}`}</span>
            <BadgeEstado estado={f.estado} />
            <Icono n="chevron-right" className="pf-lista-flecha" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PanelGestion({ rol }) {
  const { datos } = useCarga(() => api.get('/api/admin/dashboard'), []);
  const mensajes = datos?.mensajesSinLeer ?? 0;
  const resenas = datos?.resenasPendientes ?? 0;
  const tarjetas = [
    { a: '/admin/mensajes', icono: 'envelope', t: 'Mensajes de contacto', d: mensajes > 0 ? `${mensajes} sin leer` : 'Todo al día', alerta: mensajes > 0 },
    { a: '/admin/resenas', icono: 'star', t: 'Reseñas', d: resenas > 0 ? `${resenas} por revisar` : 'Sin pendientes', alerta: resenas > 0 },
  ];
  if (rol === 'administrador') {
    tarjetas.push(
      { a: '/admin/usuarios', icono: 'users', t: 'Usuarios y roles', d: 'Gestiona el equipo' },
      { a: '/admin/productos', icono: 'boxes-stacked', t: 'Productos', d: 'Catálogo público' },
      { a: '/admin/facturas', icono: 'file-invoice', t: 'Facturas', d: 'De todos los clientes' },
      { a: '/admin/auditoria', icono: 'clock-rotate-left', t: 'Auditoría', d: 'Registro de acciones' },
    );
  }
  return (
    <div className="pf-gestion">
      {tarjetas.map((c) => (
        <Link key={c.a} to={c.a} className="pf-gestion-tarjeta">
          <span className="pf-lista-icono"><Icono n={c.icono} /></span>
          <strong>{c.t}</strong>
          <span className={c.alerta ? 'alerta' : ''}>{c.d}</span>
          <Icono n="chevron-right" className="pf-lista-flecha" />
        </Link>
      ))}
    </div>
  );
}

function Resumen({ usuario, facturas, totalFacturas, irA }) {
  const personalizada = Boolean(usuario.foto_perfil) && !usuario.foto_perfil.includes('default');
  const pasos = [
    { ok: usuario.email_verificado, t: 'Verifica tu correo', tab: 'seguridad' },
    { ok: usuario.totp_habilitado, t: 'Activa la verificación en dos pasos', tab: 'seguridad' },
    { ok: personalizada, t: 'Agrega una foto de perfil', tab: null },
  ];
  const hechos = pasos.filter((p) => p.ok).length;
  const pct = Math.round((hechos / pasos.length) * 100);

  return (
    <div className="pf-resumen">
      <div className="pf-stats">
        <button type="button" className="pf-stat" onClick={() => irA('facturas')}>
          <Icono n="file-invoice" /><strong>{totalFacturas}</strong><span>Facturas</span>
        </button>
        <button type="button" className="pf-stat" onClick={() => irA('seguridad')}>
          <Icono n="shield-halved" /><strong>{usuario.totp_habilitado ? 'Activa' : 'Inactiva'}</strong><span>Doble verificación</span>
        </button>
        <button type="button" className="pf-stat" onClick={() => irA('seguridad')}>
          <Icono n={usuario.email_verificado ? 'circle-check' : 'envelope'} /><strong>{usuario.email_verificado ? 'Verificado' : 'Pendiente'}</strong><span>Correo</span>
        </button>
      </div>

      <div className="pf-tarjeta">
        <div className="pf-tarjeta-cab">
          <h2>Completa tu perfil</h2>
          <span className="pf-pct">{pct}%</span>
        </div>
        <div className="pf-barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct}%` }} /></div>
        <ul className="pf-pasos">
          {pasos.map((p) => (
            <li key={p.t} className={p.ok ? 'hecho' : ''}>
              <span className="pf-check"><Icono n={p.ok ? 'check' : 'clock'} /></span>
              <span>{p.t}</span>
              {!p.ok && p.tab && <button type="button" onClick={() => irA(p.tab)}>Hacerlo</button>}
            </li>
          ))}
        </ul>
      </div>

      <div className="pf-tarjeta">
        <div className="pf-tarjeta-cab">
          <h2>Últimas facturas</h2>
          {totalFacturas > 0 && <button type="button" className="pf-enlace" onClick={() => irA('facturas')}>Ver todas</button>}
        </div>
        <ListaFacturas facturas={facturas.slice(0, 3)} />
      </div>
    </div>
  );
}

export default function Perfil() {
  const { refrescar, usuario: sesion } = useSesion();
  const { navegar } = useRuta();
  const { datos, error, cargando, recargar } = useCarga(() => api.get('/api/perfil'), []);
  const [tab, setTab] = useState('resumen');

  if (cargando && !datos) return <Cargando />;
  if (error) {
    if (error.estado === 401) { navegar('/login', { reemplazar: true }); return null; }
    return <ErrorCarga error={error} onReintentar={recargar} />;
  }

  const { usuario, facturas, totalFacturas } = datos;
  const rol = sesion?.rol ?? 'usuario';
  const alCambiar = async () => { await Promise.all([recargar(), refrescar()]); };
  const gestion = rol === 'administrador' || rol === 'moderador';

  const pestanas = [
    { id: 'resumen', t: 'Resumen', i: 'gauge' },
    { id: 'facturas', t: 'Facturas', i: 'file-invoice' },
    { id: 'seguridad', t: 'Seguridad', i: 'lock' },
    ...(gestion ? [{ id: 'gestion', t: 'Gestión', i: 'user-shield' }] : []),
  ];

  return (
    <main className="container mx-auto p-6 mt-2">
      <section className="pf-cabecera">
        <div className="pf-portada" aria-hidden="true" />
        <div className="pf-cabecera-cuerpo">
          <Avatar usuario={usuario} alCambiar={alCambiar} />
          <div className="pf-identidad">
            <span className="eyebrow">Mi cuenta</span>
            <h1>Hola, {usuario.nombre}</h1>
            <p className="pf-correo">{usuario.email}</p>
            <div className="pf-chips">
              <span className={`pf-chip rol-${rol}`}><Icono n={gestion ? 'user-shield' : 'user'} /> {ROLES[rol] ?? 'Cliente'}</span>
              <span className={`pf-chip ${usuario.email_verificado ? 'ok' : 'aviso'}`}>
                <Icono n={usuario.email_verificado ? 'circle-check' : 'triangle-exclamation'} /> {usuario.email_verificado ? 'Correo verificado' : 'Correo sin verificar'}
              </span>
              {usuario.totp_habilitado && <span className="pf-chip ok"><Icono n="shield-halved" /> 2FA activa</span>}
            </div>
          </div>
          <Link to="/perfil/editar" className="pf-editar"><Icono n="pen" /> Editar mis datos</Link>
        </div>
      </section>

      <div className="pf-cuerpo">
        <nav className="pf-menu" aria-label="Secciones de mi cuenta" role="tablist">
          {pestanas.map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={tab === p.id}
              className={tab === p.id ? 'activa' : ''} onClick={() => setTab(p.id)}>
              <Icono n={p.i} /> <span>{p.t}</span>
              {p.id === 'facturas' && totalFacturas > 0 && <em>{totalFacturas}</em>}
            </button>
          ))}
        </nav>

        <div className="pf-panel" role="tabpanel" key={tab}>
          {tab === 'resumen' && <Resumen usuario={usuario} facturas={facturas} totalFacturas={totalFacturas} irA={setTab} />}

          {tab === 'facturas' && (
            <div className="pf-tarjeta">
              <div className="pf-tarjeta-cab"><h2>Sube una factura</h2></div>
              <SubirFactura alTerminar={recargar} />
              <div className="pf-tarjeta-cab pf-sep">
                <h2>Tus facturas <small>({totalFacturas})</small></h2>
                {totalFacturas > facturas.length && <Link to="/mis-facturas" className="pf-enlace">Ver todas</Link>}
              </div>
              <ListaFacturas facturas={facturas} />
            </div>
          )}

          {tab === 'seguridad' && (
            <div className="pf-tarjeta">
              <div className="pf-tarjeta-cab"><h2>Seguridad de la cuenta</h2></div>
              <VerificacionCorreo verificado={usuario.email_verificado} email={usuario.email} />
              <DosPasos activo={usuario.totp_habilitado} alCambiar={alCambiar} />
              <div className="pf-fila">
                <span className="pf-fila-icono"><Icono n="pen" /></span>
                <div className="pf-fila-texto">
                  <h3>Datos personales</h3>
                  <p>Cambia tu nombre o tu correo electrónico.</p>
                </div>
                <Link to="/perfil/editar" className="icon-btn">Editar</Link>
              </div>
            </div>
          )}

          {tab === 'gestion' && gestion && (
            <div className="pf-tarjeta">
              <div className="pf-tarjeta-cab">
                <h2>Panel de gestión</h2>
                <Link to="/admin" className="pf-enlace">Ir al panel completo</Link>
              </div>
              <PanelGestion rol={rol} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

