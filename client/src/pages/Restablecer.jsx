import { useEffect, useState } from 'react';
import { useParams, useRuta } from '../router.jsx';
import { Campo, Cargando, Tarjeta } from '../components/ui.jsx';
import { useAvisos } from '../context/Avisos.jsx';
import { api } from '../api.js';

export default function Restablecer() {
  const { token } = useParams();
  const { avisar } = useAvisos();
  const { navegar } = useRuta();
  const [valido, setValido] = useState(null);
  const [valores, setValores] = useState({ password: '', confirmar_password: '' });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    api.get(`/api/auth/restablecer/${encodeURIComponent(token)}`)
      .then(() => { if (vivo) setValido(true); })
      .catch((err) => {
        if (!vivo) return;
        avisar(err.message, 'danger');
        navegar('/recuperar', { reemplazar: true });
      });
    return () => { vivo = false; };
  }, [token, avisar, navegar]);

  const cambiar = (e) => setValores((v) => ({ ...v, [e.target.name]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    try {
      const r = await api.post('/api/auth/restablecer', { token, ...valores });
      avisar(r.message, 'success');
      navegar('/login');
    } catch (err) {
      setErrores(err.errores);
      avisar(err.message, 'danger');
    } finally {
      setEnviando(false);
    }
  };

  if (!valido) return <Cargando texto="Validando enlace…" />;

  return (
    <Tarjeta eyebrow="Área de clientes" titulo="Crea tu nueva contraseña">
      <form onSubmit={enviar} noValidate>
        <Campo id="password" etiqueta="Nueva contraseña" error={errores.password} ayuda="Mínimo 6 caracteres, con al menos una letra y un número.">
          <input id="password" name="password" type="password" className="form-input" value={valores.password} onChange={cambiar} autoComplete="new-password" />
        </Campo>
        <Campo id="confirmar_password" etiqueta="Confirmar contraseña" error={errores.confirmar_password}>
          <input id="confirmar_password" name="confirmar_password" type="password" className="form-input" value={valores.confirmar_password} onChange={cambiar} autoComplete="new-password" />
        </Campo>
        <div className="text-center">
          <button type="submit" className="button-primary w-full text-center" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar nueva contraseña'}
          </button>
        </div>
      </form>
    </Tarjeta>
  );
}
