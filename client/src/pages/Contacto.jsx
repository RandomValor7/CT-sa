import { useState } from 'react';
import Turnstile from '../components/Turnstile.jsx';
import { useSesion } from '../context/Sesion.jsx';
import { useAvisos } from '../context/Avisos.jsx';
import { api } from '../api.js';

export default function Contacto() {
  const { config } = useSesion();
  const { avisar } = useAvisos();
  const empresa = config?.empresa ?? {};
  const siteKey = config?.turnstileSiteKey;
  const [valores, setValores] = useState({ nombre: '', email: '', mensaje: '' });
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
      const r = await api.post('/api/contacto', { ...valores, 'cf-turnstile-response': token });
      avisar(r.message, 'success');
      setValores({ nombre: '', email: '', mensaje: '' });
    } catch (err) {
      setErrores(err.errores);
      avisar(err.message, 'danger');
    } finally {
      setEnviando(false);
      setReinicio((n) => n + 1);
    }
  };

  return (
    <main className="container mx-auto p-6">
      <div className="contenido-cuadro visible max-w-2xl mx-auto">
        <span className="eyebrow block text-center">Hablemos</span>
        <h1 className="section-heading text-center mt-2 mb-2">Contáctanos</h1>
        <p className="text-gray-600 text-center mb-8">¿Tienes un proyecto en mente? Escríbenos y te responderemos pronto.</p>

        <form onSubmit={enviar} className="space-y-5" noValidate>
          <div>
            <label htmlFor="nombre" className="form-label">Nombre</label>
            <input id="nombre" name="nombre" className="form-input" value={valores.nombre} onChange={cambiar} autoComplete="name" />
            {errores.nombre && <p className="form-error">{errores.nombre}</p>}
          </div>
          <div>
            <label htmlFor="email" className="form-label">Correo electrónico</label>
            <input id="email" name="email" type="email" className="form-input" value={valores.email} onChange={cambiar} autoComplete="email" />
            {errores.email && <p className="form-error">{errores.email}</p>}
          </div>
          <div>
            <label htmlFor="mensaje" className="form-label">Mensaje</label>
            <textarea id="mensaje" name="mensaje" rows={5} className="form-input" style={{ resize: 'vertical' }} value={valores.mensaje} onChange={cambiar} />
            {errores.mensaje && <p className="form-error">{errores.mensaje}</p>}
          </div>
          <Turnstile siteKey={siteKey} onToken={setToken} reinicio={reinicio} />
          <div className="text-center pt-2">
            <button type="submit" className="button-primary w-full text-center" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar mensaje'}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-gray-600 text-sm space-y-1 font-mono">
          <p>{empresa.direccion}</p>
          <p>Tel/Cel: {empresa.telefonos}</p>
          <p>Email: <a href={`mailto:${empresa.email}`} className="hover:underline" style={{ color: 'var(--cian-suave)' }}>{empresa.email}</a></p>
        </div>
      </div>
    </main>
  );
}
