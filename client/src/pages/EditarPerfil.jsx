import { useEffect, useState } from 'react';
import { Link, useRuta } from '../router.jsx';
import { Campo, Cargando } from '../components/ui.jsx';
import { useSesion } from '../context/Sesion.jsx';
import { useAvisos } from '../context/Avisos.jsx';
import { api } from '../api.js';

export default function EditarPerfil() {
  const { usuario, refrescar } = useSesion();
  const { avisar } = useAvisos();
  const { navegar } = useRuta();
  const [valores, setValores] = useState(null);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (usuario && !valores) setValores({ nombre: usuario.nombre, email: usuario.email });
  }, [usuario, valores]);

  if (!valores) return <Cargando />;

  const cambiar = (e) => setValores((v) => ({ ...v, [e.target.name]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    try {
      const r = await api.put('/api/perfil', valores);
      avisar(r.message, 'success');
      await refrescar();
      navegar('/perfil');
    } catch (err) {
      setErrores(err.errores);
      avisar(err.message, 'danger');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="container mx-auto p-6 mt-4">
      <div className="profile-container">
        <span className="eyebrow">Área de clientes</span>
        <h1 className="text-2xl font-display font-semibold mt-2 mb-6" style={{ color: 'var(--ink-900)' }}>Editar mis datos</h1>
        <form onSubmit={enviar} noValidate>
          <Campo id="nombre" etiqueta="Nombre" error={errores.nombre}>
            <input id="nombre" name="nombre" className="form-input" value={valores.nombre} onChange={cambiar} autoComplete="name" />
          </Campo>
          <Campo id="email" etiqueta="Correo electrónico" error={errores.email}
            ayuda={valores.email !== usuario.email ? 'Si cambias el correo, te enviaremos un enlace para verificarlo de nuevo.' : undefined}>
            <input id="email" name="email" type="email" className="form-input" value={valores.email} onChange={cambiar} autoComplete="email" />
          </Campo>
          <div className="flex gap-3">
            <button type="submit" className="button-primary" disabled={enviando}>Guardar cambios</button>
            <Link to="/perfil" className="px-4 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm flex items-center">Cancelar</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
