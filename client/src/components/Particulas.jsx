import { useEffect, useRef } from 'react';

export default function Particulas() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ancho = 0;
    let alto = 0;
    let puntos = [];
    let raf = 0;
    let visible = true;
    const raton = { x: -9999, y: -9999 };

    const medir = () => {
      const caja = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = caja.width;
      alto = caja.height;
      canvas.width = Math.floor(ancho * dpr);
      canvas.height = Math.floor(alto * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cantidad = Math.max(24, Math.min(70, Math.floor((ancho * alto) / 20000)));
      puntos = Array.from({ length: cantidad }, () => ({
        x: Math.random() * ancho,
        y: Math.random() * alto,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        m: Math.random() < 0.18,
      }));
    };

    const dibujar = () => {
      ctx.clearRect(0, 0, ancho, alto);
      for (let i = 0; i < puntos.length; i += 1) {
        const a = puntos[i];
        if (!reducir) {
          a.x += a.vx;
          a.y += a.vy;
          if (a.x < 0 || a.x > ancho) a.vx *= -1;
          if (a.y < 0 || a.y > alto) a.vy *= -1;
        }
        for (let j = i + 1; j < puntos.length; j += 1) {
          const b = puntos[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 140) {
            ctx.strokeStyle = `rgba(39, 107, 135, ${(1 - d / 140) * 0.3})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        const cerca = Math.hypot(a.x - raton.x, a.y - raton.y) < 160;
        ctx.fillStyle = a.m ? '#F2994A' : '#276B87';
        ctx.globalAlpha = cerca ? 1 : 0.7;
        ctx.beginPath();
        ctx.arc(a.x, a.y, cerca ? 3 : a.m ? 2.4 : 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (cerca) {
          ctx.strokeStyle = 'rgba(242, 153, 74, 0.7)';
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(raton.x, raton.y);
          ctx.stroke();
        }
      }
    };

    const ciclo = () => {
      if (visible) dibujar();
      raf = requestAnimationFrame(ciclo);
    };

    const mover = (e) => {
      const caja = canvas.getBoundingClientRect();
      raton.x = e.clientX - caja.left;
      raton.y = e.clientY - caja.top;
    };
    const salir = () => { raton.x = -9999; raton.y = -9999; };

    medir();
    if (reducir) dibujar();
    else raf = requestAnimationFrame(ciclo);
    window.addEventListener('resize', medir);
    window.addEventListener('pointermove', mover);
    canvas.addEventListener('pointerleave', salir);
    const observador = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    observador.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', medir);
      window.removeEventListener('pointermove', mover);
      observador.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="hero-canvas" aria-hidden="true" />;
}
