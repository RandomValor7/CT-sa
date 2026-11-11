import { useCallback, useEffect, useRef, useState } from 'react';

export function useCarga(funcion, dependencias = []) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: true });
  const contador = useRef(0);

  const cargar = useCallback(async () => {
    contador.current += 1;
    const actual = contador.current;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      const datos = await funcion();
      if (actual === contador.current) setEstado({ datos, error: null, cargando: false });
    } catch (err) {
      if (actual === contador.current) setEstado({ datos: null, error: err, cargando: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  useEffect(() => { cargar(); }, [cargar]);
  return { ...estado, recargar: cargar };
}
