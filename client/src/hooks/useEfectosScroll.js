import { useEffect } from 'react';

const OBJETIVOS = '.contenido-cuadro, .contenido-principal, .spec-card, .coverage-node, .kpi-card, .carousel-container, #resena .relative.z-10, .testimonio, .section-heading, .profile-container, table.data-table';

export function useEfectosScroll(path) {
  useEffect(() => {
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const raiz = document.getElementById('contenido-principal');
    const encabezado = document.querySelector('header');
    let observador = null;
    let mutaciones = null;
    let pendiente = false;

    const marcar = () => {
      if (!raiz) return;
      const hermanos = new Map();
      raiz.querySelectorAll(OBJETIVOS).forEach((el) => {
        if (el.dataset.fx) return;
        el.dataset.fx = '1';
        if (reducir) { el.classList.add('visible'); return; }
        const padre = el.parentElement;
        const n = hermanos.get(padre) || 0;
        hermanos.set(padre, n + 1);
        el.style.setProperty('--retardo', `${Math.min(n, 6) * 90}ms`);
        el.classList.remove('visible');
        el.classList.add('revela');
        if (n % 2 === 1 && el.classList.contains('spec-card')) el.classList.add('revela-der');
        observador.observe(el);
      });
    };

    if (!reducir) {
      observador = new IntersectionObserver((entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observador.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    }

    marcar();
    if (raiz) {
      mutaciones = new MutationObserver(() => {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(() => { pendiente = false; marcar(); });
      });
      mutaciones.observe(raiz, { childList: true, subtree: true });
    }

    let cuadro = 0;
    const alScroll = () => {
      if (cuadro) return;
      cuadro = requestAnimationFrame(() => {
        cuadro = 0;
        const y = window.scrollY;
        const total = document.documentElement.scrollHeight - window.innerHeight;
        document.documentElement.style.setProperty('--progreso', total > 0 ? String(Math.min(1, y / total)) : '0');
        document.documentElement.style.setProperty('--parallax', reducir ? '0' : String(Math.min(y, 900)));
        encabezado?.classList.toggle('scrolled', y > 8);
      });
    };
    alScroll();
    window.addEventListener('scroll', alScroll, { passive: true });
    window.addEventListener('resize', alScroll);

    const inclinar = (e) => {
      if (reducir || !window.matchMedia('(hover: hover)').matches) return;
      const tarjeta = e.target.closest?.('.spec-card');
      if (!tarjeta) return;
      const r = tarjeta.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      tarjeta.style.transform = `perspective(800px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translateY(-4px)`;
    };
    const soltar = (e) => {
      const tarjeta = e.target.closest?.('.spec-card');
      if (tarjeta) tarjeta.style.transform = '';
    };
    const luz = (e) => {
      if (reducir) return;
      const sup = e.target.closest?.('.contenido-cuadro, .kpi-card, .coverage-node, .contenido-principal');
      if (sup) {
        const r = sup.getBoundingClientRect();
        sup.style.setProperty('--mx', `${e.clientX - r.left}px`);
        sup.style.setProperty('--my', `${e.clientY - r.top}px`);
      }
      const bot = e.target.closest?.('.btn-primary, .btn-outline, .button-primary');
      if (bot) {
        const r = bot.getBoundingClientRect();
        bot.style.setProperty('--tx', `${((e.clientX - r.left) / r.width - 0.5) * 10}px`);
        bot.style.setProperty('--ty', `${((e.clientY - r.top) / r.height - 0.5) * 8}px`);
      }
    };
    const apagar = (e) => {
      const bot = e.target.closest?.('.btn-primary, .btn-outline, .button-primary');
      if (bot) { bot.style.removeProperty('--tx'); bot.style.removeProperty('--ty'); }
    };
    document.addEventListener('pointermove', inclinar);
    document.addEventListener('pointermove', luz);
    document.addEventListener('pointerout', soltar);
    document.addEventListener('pointerout', apagar);

    return () => {
      observador?.disconnect();
      mutaciones?.disconnect();
      cancelAnimationFrame(cuadro);
      window.removeEventListener('scroll', alScroll);
      window.removeEventListener('resize', alScroll);
      document.removeEventListener('pointermove', inclinar);
      document.removeEventListener('pointerout', soltar);
      document.removeEventListener('pointermove', luz);
      document.removeEventListener('pointerout', apagar);
    };
  }, [path]);
}
