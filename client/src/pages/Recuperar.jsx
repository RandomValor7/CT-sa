import { useState } from 'react';
import { Link, useRuta } from '../router.jsx';
import { Campo, Tarjeta } from '../components/ui.jsx';
import { useAvisos } from '../context/Avisos.jsx';
import { api } from '../api.js';

export default function Recuperar() {
  const { avisar } = useAvisos();
  const { navegar } = useRuta();
  const [email, setEmail] = useState('');
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    try {
      const r = await api.post('/api/auth/recuperar', { email });
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
    <Tarjeta eyebrow="Área de clientes" titulo="Recuperar contraseña">
      <p className="text-gray-600 text-sm text-center mb-6" style={{ marginTop: '-1rem' }}>Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.</p>
      <form onSubmit={enviar} noValidate>
        <Campo id="email" etiqueta="Correo Electrónico" error={errores.email}>
          <input id="email" name="email" type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Campo>
        <div className="text-center">
          <button type="submit" className="button-primary w-full text-center" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar enlace de recuperación'}
          </button>
        </div>
      </form>
      <div className="mt-4 text-center">
        <p className="text-sm">¿Ya la recordaste? <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--cian-suave)' }}>Inicia sesión</Link></p>
      </div>
    </Tarjeta>
  );
}
