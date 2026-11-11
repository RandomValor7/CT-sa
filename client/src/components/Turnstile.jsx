import { useEffect, useRef } from 'react';

const URL_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let promesaScript = null;

function cargarScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!promesaScript) {
    promesaScript = new Promise((resolver, rechazar) => {
      const s = document.createElement('script');
      s.src = URL_SCRIPT;
      s.async = true;
      s.defer = true;
      s.onload = () => resolver(window.turnstile);
      s.onerror = () => { promesaScript = null; rechazar(new Error('No se pudo cargar el CAPTCHA')); };
      document.head.appendChild(s);
    });
  }
  return promesaScript;
}

export default function Turnstile({ siteKey, onToken, reinicio = 0 }) {
  const contenedor = useRef(null);
  const widget = useRef(null);
  const alToken = useRef(onToken);
  alToken.current = onToken;

  useEffect(() => {
    if (!siteKey) return undefined;
    let vivo = true;
    cargarScript().then((turnstile) => {
      if (!vivo || !contenedor.current || widget.current !== null) return;
      widget.current = turnstile.render(contenedor.current, {
        sitekey: siteKey,
        callback: (t) => alToken.current(t),
        'expired-callback': () => alToken.current(''),
        'error-callback': () => alToken.current(''),
      });
    }).catch(() => alToken.current(''));
    return () => {
      vivo = false;
      if (widget.current !== null && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey]);

  useEffect(() => {
    if (reinicio > 0 && widget.current !== null && window.turnstile) {
      window.turnstile.reset(widget.current);
      alToken.current('');
    }
  }, [reinicio]);

  if (!siteKey) return null;
  return <div ref={contenedor} className="cf-turnstile" />;
}
