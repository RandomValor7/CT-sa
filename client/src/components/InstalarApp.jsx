import { useEffect, useState } from 'react';
import Icono from './Icono.jsx';

export default function InstalarApp() {
  const [evento, setEvento] = useState(null);
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) { setInstalada(true); return undefined; }
    const alPrompt = (e) => { e.preventDefault(); setEvento(e); };
    const alInstalar = () => { setInstalada(true); setEvento(null); };
    window.addEventListener('beforeinstallprompt', alPrompt);
    window.addEventListener('appinstalled', alInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', alPrompt);
      window.removeEventListener('appinstalled', alInstalar);
    };
  }, []);

  if (!evento || instalada) return null;

  const instalar = async () => {
    evento.prompt();
    await evento.userChoice.catch(() => {});
    setEvento(null);
  };

  return (
    <button type="button" className="instalar-app" onClick={instalar}>
      <Icono n="download2" /> Instalar la app
    </button>
  );
}
