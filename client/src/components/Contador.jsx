import { useEffect, useRef, useState } from 'react';

export default function Contador({ fin, duracion = 1600, separador = false }) {
  const ref = useRef(null);
  const [valor, setValor] = useState(0);

  useEffect(() => {
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducir) { setValor(fin); return undefined; }
    let raf = 0;
    const observador = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      observador.disconnect();
      const inicio = performance.now();
      const paso = (t) => {
        const p = Math.min(1, (t - inicio) / duracion);
        setValor(Math.round(fin * (1 - (1 - p) ** 3)));
        if (p < 1) raf = requestAnimationFrame(paso);
      };
      raf = requestAnimationFrame(paso);
    }, { threshold: 0.4 });
    if (ref.current) observador.observe(ref.current);
    return () => { observador.disconnect(); cancelAnimationFrame(raf); };
  }, [fin, duracion]);

  return <span ref={ref}>{separador ? valor.toLocaleString('es-CO') : valor}</span>;
}
