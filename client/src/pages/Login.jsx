import { useEffect, useState } from 'react';
import { Link, useQuery, useRuta } from '../router.jsx';
import { Campo, CampoPassword, Tarjeta } from '../components/ui.jsx';
import Icono from '../components/Icono.jsx';
import { useSesion } from '../context/Sesion.jsx';
import { useAvisos } from '../context/Avisos.jsx';
import { api } from '../api.js';

export function SeparadorGoogle({ texto }) {
  return (
    <>
      <div className="flex items-center gap-3 my-5">
        <hr className="flex-grow border-gray-200" />
        <span className="text-xs text-gray-500 font-mono">O</span>
        <hr className="flex-grow border-gray-200" />
      </div>
      <a href="/login/google"
        className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-md py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
        <Icono n="google" style={{ color: '#EA4335' }} /> {texto}
      </a>
    </>
  );
}

export default function Login() {
  const { config, aplicarAuth, usuario } = useSesion();
  const { avisar } = useAvisos();
  const { navegar } = useRuta();
  const consulta = useQuery();
  const [valores, setValores] = useState({ email: '', password: '' });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const mensaje = consulta.get('error');
    if (mensaje) {
      avisar(mensaje, 'danger');
      navegar('/login', { reemplazar: true });
    }
  }, [consulta, avisar, navegar]);

  useEffect(() => { if (usuario) navegar('/perfil', { reemplazar: true }); }, [usuario, navegar]);

  const cambiar = (e) => setValores((v) => ({ ...v, [e.target.name]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    try {
      const r = await api.post('/api/auth/login', valores);
      aplicarAuth(r);
      if (r.requiere2fa) {
        navegar('/login/verificar-2fa');
      } else {
        avisar(`¡Bienvenido, ${r.usuario.nombre}!`, 'success');
        navegar('/perfil');
      }
    } catch (err) {
      setErrores(err.errores);
      avisar(err.message, 'danger');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Tarjeta eyebrow="Área de clientes" titulo="Iniciar Sesión">
      <form onSubmit={enviar} noValidate>
        <Campo id="email" etiqueta="Correo Electrónico" error={errores.email}>
          <input id="email" name="email" type="email" className="form-input" value={valores.email} onChange={cambiar} autoComplete="email" />
        </Campo>
        <div className="mb-6">
          <label htmlFor="password" className="form-label">Contraseña</label>
          <CampoPassword value={valores.password} onChange={cambiar} />
          {errores.password && <p className="form-error">{errores.password}</p>}
          <div className="text-right mt-1">
            <Link to="/recuperar" className="text-xs hover:underline" style={{ color: 'var(--txt-suave)' }}>¿Olvidaste tu contraseña?</Link>
          </div>
        </div>
        <div className="text-center">
          <button type="submit" className="button-primary w-full text-center" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </div>
      </form>
      {config?.googleDisponible && <SeparadorGoogle texto="Continuar con Google" />}
      <div className="mt-4 text-center">
        <p className="text-sm">¿No tienes cuenta? <Link to="/registro" className="font-medium hover:underline" style={{ color: 'var(--cian-suave)' }}>Regístrate aquí</Link></p>
      </div>
    </Tarjeta>
  );
}
