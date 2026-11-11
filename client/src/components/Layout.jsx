import { useEffect, useState } from 'react';
import Icono, { IconSprite } from './Icono.jsx';
import Chatbot from './Chatbot.jsx';
import { AvisoCookies, useAnalytics } from './Analytics.jsx';
import { Link, useRuta } from '../router.jsx';
import { useSesion } from '../context/Sesion.jsx';
import { useAvisos, ListaAvisos } from '../context/Avisos.jsx';
import { api } from '../api.js';
import { useTema } from '../hooks/useTema.js';
import { useEfectosScroll } from '../hooks/useEfectosScroll.js';

function EnlacesNav({ movil, alCerrar }) {
  const { usuario, aplicarAuth } = useSesion();
  const { avisar } = useAvisos();
  const { path, navegar } = useRuta();
  const clase = movil ? 'block py-2 px-4' : 'transition-colors';
  const actual = (ruta) => (path === ruta ? { 'aria-current': 'page' } : {});

  const cerrarSesion = async () => {
    alCerrar?.();
    try {
      const r = await api.post('/api/auth/logout');
      aplicarAuth({ csrfToken: r.csrfToken, usuario: null });
      avisar(r.message, 'success');
      navegar('/');
    } catch (err) {
      avisar(err.message, 'danger');
    }
  };

  return (
    <>
      <Link to="/" className={clase} onClick={alCerrar} {...actual('/')}>Inicio</Link>
      <Link to="/servicios" className={clase} onClick={alCerrar} {...actual('/servicios')}>Servicios</Link>
      <Link to="/nosotros" className={clase} onClick={alCerrar} {...actual('/nosotros')}>Nosotros</Link>
      <Link to="/contacto" className={clase} onClick={alCerrar} {...actual('/contacto')}>Contacto</Link>
      {usuario ? (
        <>
          {(usuario.rol === 'administrador' || usuario.rol === 'moderador') && (
            <Link to="/admin" className={`${clase} nav-link-admin`} onClick={alCerrar}>
              <Icono n="user-shield" /> Admin
            </Link>
          )}
          <Link to="/perfil" className={clase} onClick={alCerrar}>Mi perfil</Link>
          <button type="button" className={`${clase} nav-boton nav-salir`} onClick={cerrarSesion}>Cerrar sesión</button>
        </>
      ) : (
        <>
          <Link to="/registro" className={clase} onClick={alCerrar}>Registrarse</Link>
          <Link to="/login" className={clase} onClick={alCerrar}>Iniciar sesión</Link>
        </>
      )}
    </>
  );
}

export default function Layout({ children }) {
  const { config } = useSesion();
  const { path, saliendo } = useRuta();
  const [menu, setMenu] = useState(false);
  const empresa = config?.empresa;
  useAnalytics(config?.googleAnalyticsId);
  useEfectosScroll(path);
  const { tema, alternar } = useTema();

  useEffect(() => { setMenu(false); }, [path]);

  return (
    <div className={`page-transition${saliendo ? ' page-transition-exit-active' : ''}`}>
      <IconSprite />
      <div className="barra-progreso" aria-hidden="true" />
      <div className={`cortina${saliendo ? ' activa' : ''}`} aria-hidden="true"><span>Conexión Total</span></div>
      <a href="#contenido-principal" className="skip-link">Saltar al contenido principal</a>

      <header>
        <nav className="container mx-auto flex items-center justify-between p-4" aria-label="Navegación principal">
          <Link to="/" className="flex items-center flex-shrink-0 mr-6 bg-white rounded-md px-2 py-1.5">
            <img src="/imagenes/logo.jpg" alt="Conexión Total Ingeniería S.A.S." className="h-8 w-auto object-contain" />
          </Link>
          <div className="hidden md:flex flex-grow justify-center space-x-8">
            <EnlacesNav />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="tema-boton" onClick={alternar}
              aria-label={tema === 'claro' ? 'Activar modo oscuro' : 'Activar modo claro'}
              aria-pressed={tema === 'oscuro'} title={tema === 'claro' ? 'Modo oscuro' : 'Modo claro'}>
              <Icono n={tema === 'claro' ? 'moon' : 'sun'} />
            </button>
            <button type="button" className="md:hidden focus:outline-none" aria-label="Abrir menú" aria-expanded={menu}
              aria-controls="mobile-menu" style={{ color: 'var(--slate-300)' }} onClick={() => setMenu((m) => !m)}>
              <Icono n="bars" />
            </button>
          </div>
        </nav>
      </header>

      <div id="mobile-menu" className={`md:hidden${menu ? '' : ' hidden'}`} role="navigation" aria-label="Navegación móvil">
        <EnlacesNav movil alCerrar={() => setMenu(false)} />
      </div>

      <ListaAvisos />

      <div id="contenido-principal" key={path} className="pagina-entra">{children}</div>

      <footer className="text-white py-6 mt-8">
        <div className="container mx-auto text-center">
          <p>&copy; 2020–{new Date().getFullYear()} {empresa?.nombre || 'Conexión Total Ingeniería S.A.S.'} · Todos los derechos reservados.</p>
          <p className="mt-2 text-xs">
            <Link to="/privacidad" className="hover:underline" style={{ color: 'var(--slate-300)' }}>Política de tratamiento de datos personales</Link>
          </p>
        </div>
      </footer>

      {empresa && (
        <a href={`https://wa.me/${empresa.whatsapp}?text=Hola%2C%20necesito%20informaci%C3%B3n`} target="_blank" rel="noopener noreferrer"
          aria-label="Escríbenos por WhatsApp"
          className="whatsapp-float fixed bottom-5 right-5 bg-[#25d366] text-white rounded-full p-4 shadow-lg hover:scale-110 transition-transform">
          <Icono n="whatsapp" className="text-xl" />
        </a>
      )}

      <Chatbot />
      <AvisoCookies id={config?.googleAnalyticsId} />
    </div>
  );
}
