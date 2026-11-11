import { useEffect, useRef, useState } from 'react';
import { useParams, useRuta } from '../router.jsx';
import { Cargando } from '../components/ui.jsx';
import { useSesion } from '../context/Sesion.jsx';
import { useAvisos } from '../context/Avisos.jsx';
import { api } from '../api.js';

export default function VerificarEmail() {
  const { token } = useParams();
  const { avisar } = useAvisos();
  const { refrescar } = useSesion();
  const { navegar } = useRuta();
  const [estado, setEstado] = useState('trabajando');
  const hecho = useRef(false);

  useEffect(() => {
    if (hecho.current) return;
    hecho.current = true;
    api.post('/api/auth/verificar-email', { token })
      .then(async (r) => { avisar(r.message, 'success'); await refrescar(); navegar('/login', { reemplazar: true }); })
      .catch((err) => { avisar(err.message, 'danger'); setEstado('error'); navegar('/login', { reemplazar: true }); });
  }, [token, avisar, navegar, refrescar]);

  return estado === 'trabajando' ? <Cargando texto="Verificando tu correo…" /> : null;
}
