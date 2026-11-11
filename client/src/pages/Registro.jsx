import { useState } from 'react';
import { Link, useRuta } from '../router.jsx';
import { Campo, CampoPassword, Tarjeta } from '../components/ui.jsx';
import { SeparadorGoogle } from './Login.jsx';
import { useSesion } from '../context/Sesion.jsx';
import { useAvisos } from '../context/Avisos.jsx';
import { api } from '../api.js';

export default function Registro() {
  const { config } = useSesion();
  const { avisar } = useAvisos();
  const { navegar } = useRuta();
  const [valores, setValores] = useState({ nombre: '', email: '', password: '', acepto_politica: false });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => {
    const { name, type, checked, value } = e.target;
    setValores((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    try {
      const r = await api.post('/api/auth/registro', valores);
      avisar(r.message, 'success');
      navegar('/login');
    } catch (err) {
      setErrores(err.errores);
      avisar(err.message, 'danger');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Tarjeta eyebrow="Área de clientes" titulo="Registrarse">
      <form onSubmit={enviar} noValidate>
        <Campo id="nombre" etiqueta="Nombre" error={errores.nombre}>
          <input id="nombre" name="nombre" className="form-input" value={valores.nombre} onChange={cambiar} autoComplete="name" />
        </Campo>
        <Campo id="email" etiqueta="Correo Electrónico" error={errores.email}>
          <input id="email" name="email" type="email" className="form-input" value={valores.email} onChange={cambiar} autoComplete="email" />
        </Campo>
        <div className="mb-6">
          <label htmlFor="password" className="form-label">Contraseña</label>
          <CampoPassword value={valores.password} onChange={cambiar} autoComplete="new-password" />
          <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres, con al menos una letra y un número.</p>
          {errores.password && <p className="form-error">{errores.password}</p>}
        </div>
        <div className="mb-6">
          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" name="acepto_politica" className="mt-1" checked={valores.acepto_politica} onChange={cambiar} />
            <span>Acepto la{' '}
              <Link to="/privacidad" target="_blank" className="hover:underline font-medium" style={{ color: 'var(--cian-suave)' }}>política de tratamiento de datos personales</Link>.
            </span>
          </label>
          {errores.acepto_politica && <p className="form-error">{errores.acepto_politica}</p>}
        </div>
        <div className="text-center">
          <button type="submit" className="button-primary w-full text-center" disabled={enviando}>
            {enviando ? 'Registrando…' : 'Registrarse'}
          </button>
        </div>
      </form>
      {config?.googleDisponible && <SeparadorGoogle texto="Registrarse con Google" />}
      <div className="mt-4 text-center">
        <p className="text-sm">¿Ya tienes cuenta? <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--cian-suave)' }}>Inicia sesión</Link></p>
      </div>
    </Tarjeta>
  );
}
