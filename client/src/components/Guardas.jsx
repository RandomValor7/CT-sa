import { useEffect } from 'react';
import { Redirigir } from '../router.jsx';
import { useSesion } from '../context/Sesion.jsx';
import { useAvisos } from '../context/Avisos.jsx';
import { Cargando } from './ui.jsx';
import NoEncontrada from '../pages/NoEncontrada.jsx';

export function RequiereSesion({ children }) {
  const { cargando, usuario } = useSesion();
  const { avisar } = useAvisos();
  useEffect(() => {
    if (!cargando && !usuario) avisar('Por favor, inicia sesión para continuar.', 'danger');
  }, [cargando, usuario, avisar]);
  if (cargando) return <Cargando />;
  if (!usuario) return <Redirigir a="/login" />;
  return children;
}

export function RequiereRol({ roles, children }) {
  const { cargando, usuario } = useSesion();
  if (cargando) return <Cargando />;
  if (!usuario) return <RequiereSesion>{null}</RequiereSesion>;
  if (!roles.includes(usuario.rol)) return <NoEncontrada />;
  return children;
}
