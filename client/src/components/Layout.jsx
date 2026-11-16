import { useEffect, useState } from 'react';
import Icono, { IconSprite } from './Icono.jsx';
import Chatbot from './Chatbot.jsx';
import InstalarApp from './InstalarApp.jsx';
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
      avisar(r.message, 'success');
      navegar('/');
      window.setTimeout(() => aplicarAuth({ csrfToken: r.csrfToken, usuario: null }), path === '/' ? 0 : 560);
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
  const { config, usuario } = useSesion();
  const { path, saliendo } = useRuta();
  const [menu, setMenu] = useState(false);
  const empresa = config?.empresa;
  useAnalytics(config?.googleAnalyticsId);
  useEfectosScroll(path);
  const { tema, alternar } = useTema();

  useEffect(() => { setMenu(false); }, [path]);
  useEffect(() => {
    document.body.classList.toggle('menu-abierto', menu);
    if (!menu) return undefined;
    const tecla = (e) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [menu]);

  return (
    <div className={`page-transition${saliendo ? ' page-transition-exit-active' : ''}`}>
      <IconSprite />
      <div className="barra-progreso" aria-hidden="true" />
      <div className={`cortina${saliendo ? ' activa' : ''}`} aria-hidden="true"><span>Nodalia</span></div>
      <a href="#contenido-principal" className="skip-link">Saltar al contenido principal</a>

      <header>
        <nav className="container mx-auto flex items-center justify-between p-4" aria-label="Navegación principal">
          <Link to="/" className="flex items-center flex-shrink-0 mr-6">
            <img src="/imagenes/logo.png" alt="Nodalia Ingeniería S.A.S." className="h-8 w-auto object-contain" />
          </Link>
          <div className="hidden md:flex flex-grow justify-center space-x-8">
            <EnlacesNav />
          </div>
          <div className="flex items-center gap-3">
            {usuario && (
              <Link to="/perfil" className="avatar-nav" aria-label="Ir a mi perfil" title={usuario.nombre}>
                <img src={usuario.foto_perfil} alt="" />
              </Link>
            )}
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

      <div className={`menu-fondo${menu ? ' abierto' : ''}`} onClick={() => setMenu(false)} aria-hidden="true" />
      <aside id="mobile-menu" className={`menu-lateral${menu ? ' abierto' : ''}`} role="navigation" aria-label="Navegación móvil" aria-hidden={!menu}>
        <div className="menu-lateral-cab">
          <span>Menú</span>
          <button type="button" aria-label="Cerrar menú" onClick={() => setMenu(false)}><Icono n="x" /></button>
        </div>
        {usuario && (
          <Link to="/perfil" className="menu-lateral-usuario" onClick={() => setMenu(false)}>
            <img src={usuario.foto_perfil} alt="" />
            <span><strong>{usuario.nombre}</strong><em>{usuario.email}</em></span>
          </Link>
        )}
        <EnlacesNav movil alCerrar={() => setMenu(false)} />
        <InstalarApp />
      </aside>

      <ListaAvisos />

      <div id="contenido-principal" key={path} className="pagina-entra">{children}</div>

      <footer className="text-white py-6 mt-8">
        <div className="container mx-auto text-center">
          <p>&copy; 2020–{new Date().getFullYear()} {empresa?.nombre || 'Nodalia Ingeniería S.A.S.'} · Todos los derechos reservados.</p>
          <p className="mt-2 text-xs">
            <Link to="/privacidad" className="hover:underline" style={{ color: 'var(--slate-300)' }}>Política de tratamiento de datos personales</Link>
          </p>
          <div className="mt-3"><InstalarApp /></div>
        </div>
      </footer>

      {empresa && (
        <a href={`https://wa.me/${empresa.whatsapp}?text=Hola%2C%20necesito%20informaci%C3%B3n`} target="_blank" rel="noopener noreferrer"
          aria-label="Escríbenos por WhatsApp"
          className="whatsapp-float fixed bottom-5 right-5 bg-[#25d366] text-white rounded-full p-4 shadow-lg hover:scale-110 transition-transform">
          <Icono n="whatsapp" className="text-xl" />
        </a>
      )}

      <nav className="barra-inferior" aria-label="Acceso rápido">
        {[
          { a: '/', t: 'Inicio', i: 'house' },
          { a: '/servicios', t: 'Servicios', i: 'boxes-stacked' },
          { a: '/contacto', t: 'Contacto', i: 'envelope' },
          usuario ? { a: '/perfil', t: 'Mi cuenta', i: 'user' } : { a: '/login', t: 'Entrar', i: 'user' },
        ].map((x) => (
          <Link key={x.a} to={x.a} className={path === x.a || (x.a !== '/' && path.startsWith(x.a)) ? 'activa' : ''}
            {...(path === x.a ? { 'aria-current': 'page' } : {})}>
            <Icono n={x.i} /><span>{x.t}</span>
          </Link>
        ))}
      </nav>

      <Chatbot />
      <AvisoCookies id={config?.googleAnalyticsId} />
    </div>
  );
}
