import { useRef, useState } from 'react';
import Icono from '../components/Icono.jsx';
import { BadgeEstado, Cargando, ErrorCarga } from '../components/ui.jsx';
import { ESTILO_CODIGO } from './Verificar2fa.jsx';
import { Link, useRuta } from '../router.jsx';
import { useSesion } from '../context/Sesion.jsx';
import { useAvisos } from '../context/Avisos.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { api } from '../api.js';

function SubirArchivo({ campo, icono, titulo, ayuda, accept, boton, url, alTerminar }) {
  const { avisar } = useAvisos();
  const entrada = useRef(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    const archivo = entrada.current?.files?.[0];
    if (!archivo) { avisar('Selecciona un archivo primero.', 'danger'); return; }
    const datos = new FormData();
    datos.append(campo, archivo);
    setEnviando(true);
    try {
      const r = await api.post(url, datos);
      avisar(r.message, 'success');
      entrada.current.value = '';
      await alTerminar(r);
    } catch (err) {
      avisar(err.message, 'danger');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="text-center p-5 rounded-lg hover-lift" style={{ background: 'var(--paper-100)' }}>
      <h3 className="font-display font-semibold" style={{ color: 'var(--txt)' }}><Icono n={icono} className="mr-1" /> {titulo}</h3>
      <p className="text-gray-600 text-xs mb-3">{ayuda}</p>
      <form onSubmit={enviar}>
        <input ref={entrada} type="file" name={campo} className="form-input mb-4 text-sm" accept={accept} required />
        <button type="submit" className="button-primary" disabled={enviando}>{enviando ? 'Enviando…' : boton}</button>
      </form>
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
    <div className="mt-6 p-5 rounded-lg hover-lift flex flex-wrap items-center justify-between gap-4" style={{ background: 'var(--paper-100)' }}>
      <div>
        <h3 className="font-display font-semibold flex items-center gap-2" style={{ color: 'var(--txt)' }}>
          <Icono n="shield-halved" /> Verificación en dos pasos
        </h3>
        <p className="text-gray-600 text-xs mt-1">
          {activo
            ? 'Activada — te pedirá un código extra cada vez que inicies sesión.'
            : 'Agrega una capa extra de seguridad a tu cuenta con una app como Google Authenticator.'}
        </p>
      </div>
      {activo ? (
        confirmando ? (
          <form onSubmit={desactivar} className="flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="codigo-desactivar" className="form-label text-xs">Código actual de tu app</label>
              <input id="codigo-desactivar" className="form-input text-center" style={{ ...ESTILO_CODIGO, width: '10rem' }} inputMode="numeric"
                maxLength={6} autoComplete="one-time-code" autoFocus required value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} />
            </div>
            <button type="submit" className="icon-btn icon-btn-danger" disabled={enviando}><Icono n="toggle-off" /> Confirmar</button>
            <button type="button" className="icon-btn" onClick={() => { setConfirmando(false); setCodigo(''); }}>Cancelar</button>
          </form>
        ) : (
          <button type="button" className="icon-btn icon-btn-danger" onClick={() => setConfirmando(true)}>
            <Icono n="toggle-off" /> Desactivar
          </button>
        )
      ) : (
        <Link to="/perfil/2fa/activar" className="icon-btn icon-btn-success"
          style={{ background: 'var(--success-500)', color: 'white', borderColor: 'var(--success-500)' }}>
          <Icono n="toggle-on" /> Activar
        </Link>
      )}
    </div>
  );
}

export default function Perfil() {
  const { refrescar } = useSesion();
  const { avisar } = useAvisos();
  const { navegar } = useRuta();
  const { datos, error, cargando, recargar } = useCarga(() => api.get('/api/perfil'), []);
  const [reenviando, setReenviando] = useState(false);

  if (cargando && !datos) return <Cargando />;
  if (error) {
    if (error.estado === 401) { navegar('/login', { reemplazar: true }); return null; }
    return <ErrorCarga error={error} onReintentar={recargar} />;
  }

  const { usuario, facturas, totalFacturas } = datos;

  const reenviar = async () => {
    setReenviando(true);
    try {
      const r = await api.post('/api/auth/reenviar-verificacion');
      avisar(r.message, 'success');
    } catch (err) {
      avisar(err.message, 'danger');
    } finally {
      setReenviando(false);
    }
  };

  const alCambiar = async () => { await Promise.all([recargar(), refrescar()]); };

  return (
    <main className="container mx-auto p-6 mt-4">
      <div className="profile-container">
        <div className="flex flex-col items-center text-center gap-3">
          <img id="profilePicture" alt="Foto de perfil" src={usuario.foto_perfil} />
          <span className="eyebrow">Área de clientes</span>
          <h1 className="text-2xl font-display font-semibold" style={{ color: 'var(--txt)' }}>Hola, {usuario.nombre}</h1>
        </div>

        <div className="text-center text-gray-700 mt-6 font-mono text-sm">
          <p>{usuario.email}</p>
          <Link to="/perfil/editar" className="inline-block mt-2 text-xs hover:underline" style={{ color: 'var(--cian-suave)' }}>
            <Icono n="pen" /> Editar mis datos
          </Link>
        </div>

        {!usuario.email_verificado && (
          <div className="alert alert-warning mt-6 flex-wrap items-center justify-between gap-3">
            <span className="alert-icon" aria-hidden="true"><Icono n="triangle-exclamation" /></span>
            <span className="alert-text">Todavía no verificaste tu correo electrónico.</span>
            <button type="button" className="icon-btn" disabled={reenviando} onClick={reenviar}
              style={{ background: 'var(--copper-500)', color: 'white', borderColor: 'var(--copper-500)' }}>
              Reenviar correo de verificación
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mt-10">
          <SubirArchivo campo="profile_picture" icono="camera" titulo="Foto de perfil" ayuda="PNG, JPG o JPEG (máx. 5 MB)"
            accept="image/png,image/jpeg,image/gif" boton="Actualizar foto" url="/api/perfil/foto" alTerminar={alCambiar} />
          <SubirArchivo campo="factura" icono="file-arrow-up" titulo="Subir factura" ayuda="PDF, PNG, JPG o JPEG (máx. 5 MB)"
            accept="application/pdf,image/png,image/jpeg" boton="Subir factura" url="/api/perfil/facturas" alTerminar={recargar} />
        </div>

        <DosPasos activo={usuario.totp_habilitado} alCambiar={alCambiar} />

        {facturas.length > 0 && (
          <div className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="eyebrow">Historial</span>
                <h3 className="font-display font-semibold text-lg mt-1" style={{ color: 'var(--txt)' }}>
                  Tus facturas <span className="text-sm font-normal text-gray-500">({totalFacturas} en total)</span>
                </h3>
              </div>
              {totalFacturas > facturas.length && (
                <Link to="/mis-facturas" className="text-sm hover:underline font-semibold" style={{ color: 'var(--cian-suave)' }}>Ver todas &rarr;</Link>
              )}
            </div>
            <ul className="divide-y divide-gray-200 max-w-lg mt-4">
              {facturas.map((f) => (
                <li className="flex items-center justify-between py-3 gap-3" key={f.id}>
                  <span className="flex items-center gap-2 text-gray-700 font-mono text-sm">
                    <Icono n="file-invoice" style={{ color: 'var(--cian-suave)' }} />
                    {f.numero_factura || `Factura #${f.id}`}
                  </span>
                  <span className="flex items-center gap-3">
                    <BadgeEstado estado={f.estado} />
                    <Link to={`/mis-facturas/${f.id}`} className="hover:underline text-sm font-semibold" style={{ color: 'var(--cian-suave)' }}>Ver</Link>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
