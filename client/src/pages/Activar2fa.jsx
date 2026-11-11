import { useEffect, useRef, useState } from 'react';
import Icono from '../components/Icono.jsx';
import { Cargando } from '../components/ui.jsx';
import { ESTILO_CODIGO } from './Verificar2fa.jsx';
import { Link, useRuta } from '../router.jsx';
import { useSesion } from '../context/Sesion.jsx';
import { useAvisos } from '../context/Avisos.jsx';
import { api } from '../api.js';

export default function Activar2fa() {
  const { refrescar } = useSesion();
  const { avisar } = useAvisos();
  const { navegar } = useRuta();
  const [datos, setDatos] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    api.post('/api/perfil/2fa/iniciar')
      .then(setDatos)
      .catch((err) => { avisar(err.message, 'info'); navegar('/perfil', { reemplazar: true }); });
  }, [avisar, navegar]);

  if (!datos) return <Cargando />;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(datos.secreto);
      avisar('Clave copiada.', 'success');
    } catch {
      avisar('No se pudo copiar. Selecciona la clave y cópiala manualmente.', 'danger');
    }
  };

  const confirmar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const r = await api.post('/api/perfil/2fa/activar', { codigo });
      avisar(r.message, 'success');
      await refrescar();
      navegar('/perfil');
    } catch (err) {
      avisar(err.message, 'danger');
      setCodigo('');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="container mx-auto p-6">
      <div className="w-full max-w-md mx-auto">
        <div className="contenido-cuadro visible">
          <span className="eyebrow">Mi perfil</span>
          <h1 className="section-heading mt-2 mb-2">Activar verificación en dos pasos</h1>
          <Link to="/perfil" className="text-sm hover:underline" style={{ color: 'var(--txt-suave)' }}>&larr; Volver a mi perfil</Link>

          <ol className="text-sm text-gray-700 mt-6 space-y-3 list-decimal list-inside">
            <li>Abre Google Authenticator, Authy o cualquier app de códigos TOTP.</li>
            <li>Agrega una cuenta nueva y escribe (o pega) esta clave manualmente:</li>
          </ol>

          <div className="otp-secret-box mt-3" id="secreto-totp">{datos.secreto}</div>
          <div className="text-center mt-2">
            <button type="button" className="icon-btn" onClick={copiar}><Icono n="copy" /> Copiar clave</button>
            <a href={datos.otpauthUri} className="icon-btn"><Icono n="link" /> Abrir en la app (móvil)</a>
          </div>

          <form onSubmit={confirmar} className="mt-6">
            <label htmlFor="codigo" className="form-label">Escribe el código de 6 dígitos que te muestra la app para confirmar:</label>
            <input id="codigo" name="codigo" className="form-input text-center" style={ESTILO_CODIGO} inputMode="numeric"
              maxLength={6} autoComplete="one-time-code" required value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} />
            <button type="submit" className="button-primary w-full text-center mt-4" disabled={enviando}>Confirmar y activar</button>
          </form>
        </div>
      </div>
    </main>
  );
}
