import { Suspense, lazy, useEffect } from 'react';
import Layout from './components/Layout.jsx';
import { RequiereRol, RequiereSesion } from './components/Guardas.jsx';
import { Cargando } from './components/ui.jsx';
import { Rutas, useRuta } from './router.jsx';
import { useSesion } from './context/Sesion.jsx';
import Inicio from './pages/Inicio.jsx';
import Servicios from './pages/Servicios.jsx';
import Nosotros from './pages/Nosotros.jsx';
import Contacto from './pages/Contacto.jsx';
import Privacidad from './pages/Privacidad.jsx';
import Registro from './pages/Registro.jsx';
import Login from './pages/Login.jsx';
import Verificar2fa from './pages/Verificar2fa.jsx';
import Recuperar from './pages/Recuperar.jsx';
import Restablecer from './pages/Restablecer.jsx';
import VerificarEmail from './pages/VerificarEmail.jsx';
import Perfil from './pages/Perfil.jsx';
import EditarPerfil from './pages/EditarPerfil.jsx';
import Activar2fa from './pages/Activar2fa.jsx';
import MisFacturas from './pages/MisFacturas.jsx';
import DetalleFactura from './pages/DetalleFactura.jsx';
import NoEncontrada from './pages/NoEncontrada.jsx';

const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const Mensajes = lazy(() => import('./pages/admin/Mensajes.jsx'));
const Resenas = lazy(() => import('./pages/admin/Resenas.jsx'));
const Usuarios = lazy(() => import('./pages/admin/Usuarios.jsx'));
const Productos = lazy(() => import('./pages/admin/Productos.jsx'));
const ProductoForm = lazy(() => import('./pages/admin/ProductoForm.jsx'));
const Facturas = lazy(() => import('./pages/admin/Facturas.jsx'));
const FacturaForm = lazy(() => import('./pages/admin/FacturaForm.jsx'));
const Auditoria = lazy(() => import('./pages/admin/Auditoria.jsx'));

const SUFIJO = 'Nodalia Ingeniería S.A.S.';
export const TITULOS = [
  ['/', `${SUFIJO} — Inicio`],
  ['/servicios', `Servicios - ${SUFIJO}`],
  ['/nosotros', 'Nosotros - Nodalia Ingeniería'],
  ['/contacto', `Contacto - ${SUFIJO}`],
  ['/privacidad', 'Política de tratamiento de datos personales - Nodalia Ingeniería'],
  ['/registro', `Registrarse - ${SUFIJO}`],
  ['/login', `Iniciar sesión - ${SUFIJO}`],
  ['/login/verificar-2fa', `Verificación en dos pasos - ${SUFIJO}`],
  ['/recuperar', `Recuperar contraseña - ${SUFIJO}`],
  ['/perfil', `Mi perfil - ${SUFIJO}`],
  ['/perfil/editar', `Editar perfil - ${SUFIJO}`],
  ['/perfil/2fa/activar', `Activar verificación en dos pasos - ${SUFIJO}`],
  ['/mis-facturas', `Mis facturas - ${SUFIJO}`],
];

const admin = (roles, elemento) => <RequiereRol roles={roles}>{elemento}</RequiereRol>;
const AMBOS = ['administrador', 'moderador'];
const SOLO_ADMIN = ['administrador'];
const privada = (elemento) => <RequiereSesion>{elemento}</RequiereSesion>;

const RUTAS = [
  { ruta: '/', elemento: <Inicio /> },
  { ruta: '/servicios', elemento: <Servicios /> },
  { ruta: '/nosotros', elemento: <Nosotros /> },
  { ruta: '/contacto', elemento: <Contacto /> },
  { ruta: '/privacidad', elemento: <Privacidad /> },
  { ruta: '/registro', elemento: <Registro /> },
  { ruta: '/login', elemento: <Login /> },
  { ruta: '/login/verificar-2fa', elemento: <Verificar2fa /> },
  { ruta: '/recuperar', elemento: <Recuperar /> },
  { ruta: '/restablecer/:token', elemento: <Restablecer /> },
  { ruta: '/verificar/:token', elemento: <VerificarEmail /> },
  { ruta: '/perfil', elemento: privada(<Perfil />) },
  { ruta: '/perfil/editar', elemento: privada(<EditarPerfil />) },
  { ruta: '/perfil/2fa/activar', elemento: privada(<Activar2fa />) },
  { ruta: '/mis-facturas', elemento: privada(<MisFacturas />) },
  { ruta: '/mis-facturas/:id', elemento: privada(<DetalleFactura />) },
  { ruta: '/admin', elemento: admin(AMBOS, <Dashboard />) },
  { ruta: '/admin/mensajes', elemento: admin(AMBOS, <Mensajes />) },
  { ruta: '/admin/resenas', elemento: admin(AMBOS, <Resenas />) },
  { ruta: '/admin/usuarios', elemento: admin(SOLO_ADMIN, <Usuarios />) },
  { ruta: '/admin/productos', elemento: admin(SOLO_ADMIN, <Productos />) },
  { ruta: '/admin/productos/nuevo', elemento: admin(SOLO_ADMIN, <ProductoForm />) },
  { ruta: '/admin/productos/:id/editar', elemento: admin(SOLO_ADMIN, <ProductoForm />) },
  { ruta: '/admin/facturas', elemento: admin(SOLO_ADMIN, <Facturas />) },
  { ruta: '/admin/facturas/nueva', elemento: admin(SOLO_ADMIN, <FacturaForm />) },
  { ruta: '/admin/facturas/:id/editar', elemento: admin(SOLO_ADMIN, <FacturaForm />) },
  { ruta: '/admin/auditoria', elemento: admin(SOLO_ADMIN, <Auditoria />) },
];

function TituloDePagina() {
  const { path } = useRuta();
  useEffect(() => {
    const limpio = path.length > 1 ? path.replace(/\/+$/, '') : path;
    const fila = TITULOS.find(([ruta]) => ruta === limpio);
    if (fila) document.title = fila[1];
    else if (limpio.startsWith('/admin')) document.title = `Panel de administración - ${SUFIJO}`;
  }, [path]);
  return null;
}

export default function App() {
  const { cargando, error } = useSesion();
  if (cargando) return <Cargando texto="Cargando…" />;
  if (error) return <p className="text-center py-20" role="alert">No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos.</p>;
  return (
    <Layout>
      <TituloDePagina />
      <Suspense fallback={<Cargando />}>
        <Rutas rutas={RUTAS} noEncontrada={<NoEncontrada />} />
      </Suspense>
    </Layout>
  );
}
