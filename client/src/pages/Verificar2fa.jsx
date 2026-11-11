import { useState } from 'react';
import { Link, useRuta } from '../router.jsx';
import { Tarjeta } from '../components/ui.jsx';
import Icono from '../components/Icono.jsx';
import { useSesion } from '../context/Sesion.jsx';
import { useAvisos } from '../context/Avisos.jsx';
import { api } from '../api.js';

export const ESTILO_CODIGO = { letterSpacing: '0.3em', fontFamily: 'var(--font-mono)', fontSize: '1.2rem' };

export default function Verificar2fa() {
  const { aplicarAuth } = useSesion();
  const { avisar } = useAvisos();
  const { navegar } = useRuta();
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const r = await api.post('/api/auth/2fa/verificar', { codigo });
      aplicarAuth(r);
      avisar(`¡Bienvenido, ${r.usuario.nombre}!`, 'success');
      navegar('/perfil');
    } catch (err) {
      avisar(err.message, 'danger');
      setCodigo('');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Tarjeta eyebrow="Área de clientes">
      <h2 className="text-2xl font-display font-semibold text-center mt-2 mb-2" style={{ color: 'var(--txt)' }}>
        <Icono n="shield-halved" /> Verificación en dos pasos
      </h2>
      <p className="text-sm text-gray-600 text-center mb-6">Escribe el código de 6 dígitos de tu app de autenticación.</p>
      <form onSubmit={enviar}>
        <div className="mb-6">
          <label htmlFor="codigo" className="form-label">Código de verificación</label>
          <input id="codigo" name="codigo" className="form-input text-center" style={ESTILO_CODIGO} inputMode="numeric"
            pattern="[0-9]*" maxLength={6} autoComplete="one-time-code" autoFocus required value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div className="text-center">
          <button type="submit" className="button-primary w-full text-center" disabled={enviando}>Verificar</button>
        </div>
      </form>
      <div className="mt-4 text-center">
        <Link to="/login" className="text-sm hover:underline" style={{ color: 'var(--txt-suave)' }}>&larr; Cancelar e iniciar sesión de nuevo</Link>
      </div>
    </Tarjeta>
  );
}
