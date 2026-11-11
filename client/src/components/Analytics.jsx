import { useEffect, useState } from 'react';
import { Link } from '../router.jsx';

const CLAVE = 'cookies-aceptadas';

function leerAceptadas() {
  try { return window.localStorage.getItem(CLAVE) === '1'; } catch { return false; }
}

export function useAnalytics(id) {
  useEffect(() => {
    if (!id || document.getElementById('ga-script')) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, { anonymize_ip: true });
    const s = document.createElement('script');
    s.id = 'ga-script';
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(s);
  }, [id]);
}

export function AvisoCookies({ id }) {
  const [visible, setVisible] = useState(() => Boolean(id) && !leerAceptadas());

  useEffect(() => {
    document.body.classList.toggle('con-aviso-cookies', visible);
    return () => document.body.classList.remove('con-aviso-cookies');
  }, [visible]);

  if (!id || !visible) return null;
  const aceptar = () => {
    try { window.localStorage.setItem(CLAVE, '1'); } catch { /* sin almacenamiento */ }
    setVisible(false);
  };
  return (
    <div id="aviso-cookies" className="fixed bottom-0 left-0 right-0 z-50 p-4 text-sm text-white flex flex-wrap items-center justify-center gap-3"
      style={{ background: 'var(--ink-900)' }}>
      <span>Usamos cookies de analítica para entender cómo se usa el sitio.{' '}
        <Link to="/privacidad" className="underline" style={{ color: 'var(--signal-500)' }}>Más información</Link></span>
      <button type="button" onClick={aceptar} className="button-primary text-xs px-4 py-1.5">Entendido</button>
    </div>
  );
}
