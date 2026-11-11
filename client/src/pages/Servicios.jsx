import { useSesion } from '../context/Sesion.jsx';

const MUNICIPIOS = [
  { nombre: 'El Tambo', imagen: 'el-tambo.jpg', dist: '~38 km' },
  { nombre: 'Chachagüí', imagen: 'chachagui.jpg', dist: '~22 km' },
  { nombre: 'Nariño', imagen: 'narino.jpg', dist: '~45 km' },
  { nombre: 'Pasto', imagen: 'pasto.jpg', dist: 'Sede central' },
  { nombre: 'Cabrera', imagen: 'cabrera.jpg', dist: '~30 km' },
  { nombre: 'San Fernando', imagen: 'san-fernando.jpg', dist: '~50 km' },
  { nombre: 'San Pedro de la Laguna', imagen: 'sanpedrodelalaguna.jpg', dist: '~35 km' },
  { nombre: 'La Florida', imagen: 'la-florida.jpg', dist: '~28 km' },
];

export default function Servicios() {
  const { config } = useSesion();
  const empresa = config?.empresa ?? {};
  return (
    <>

<main className="container mx-auto p-6">
    <div className="contenido-cuadro visible">
        <span className="eyebrow">Lo que hacemos</span>
        <h1 className="section-heading mt-2">Servicios de ingeniería</h1>
        <p className="text-gray-600 mt-2 max-w-2xl">Seis líneas de trabajo integradas, desde el diseño de red hasta la certificación final de cada punto instalado.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            <div className="spec-card hover-lift">
                <img src="/imagenes/servicio1.png" alt="Fibra Óptica" />
                <span className="spec-index">SERV / 01</span>
                <h3>Fibra Óptica</h3>
                <p>Instalación, mantenimiento y gestión de redes de fibra óptica monomodo y multimodo: tendido interno y externo, empalmería, interventoría y certificación de puntos de red.</p>
            </div>
            <div className="spec-card hover-lift">
                <img src="/imagenes/servicio2.png" loading="lazy" alt="Cableado Estructurado" />
                <span className="spec-index">SERV / 02</span>
                <h3>Cableado Estructurado</h3>
                <p>Instalación y certificación de puntos de red, actualización de sistemas obsoletos, integración de equipos activos y diseño de redes a la medida de cada cliente.</p>
            </div>
            <div className="spec-card hover-lift">
                <img src="/imagenes/servicio3.png" loading="lazy" alt="Redes Inalámbricas" />
                <span className="spec-index">SERV / 03</span>
                <h3>Redes Inalámbricas "Wireless LAN"</h3>
                <p>Diseño, instalación y optimización de redes inalámbricas, análisis de desempeño, montaje de torres de comunicaciones y estudios de sitio (site survey).</p>
            </div>
            <div className="spec-card hover-lift">
                <img src="/imagenes/servicio4.png" loading="lazy" alt="Instalaciones Eléctricas" />
                <span className="spec-index">SERV / 04</span>
                <h3>Instalaciones Eléctricas</h3>
                <p>Acometidas, sistemas de respaldo energético, reguladores de voltaje, puestas a tierra, iluminación, tableros eléctricos, supresores TVSS y UPS.</p>
            </div>
            <div className="spec-card hover-lift">
                <img src="/imagenes/servicio5.png" loading="lazy" alt="Seguridad Electrónica" />
                <span className="spec-index">SERV / 05</span>
                <h3>Seguridad Electrónica</h3>
                <p>Diseño e implementación de CCTV, detección y extinción de incendios, control de acceso e intrusión, cámaras térmicas/infrarrojas y automatización de accesos.</p>
            </div>
            <div className="spec-card hover-lift">
                <img src="/imagenes/servicio6.png" loading="lazy" alt="Suministro de equipos de red" />
                <span className="spec-index">SERV / 06</span>
                <h3>Suministro de equipos de red</h3>
                <p>Insumos para cableado estructurado, puntos de red cableados e inalámbricos, equipos CCTV: cables, conectores, racks y accesorios de montaje.</p>
            </div>
        </div>
    </div>

    {/* Cobertura */}
    <div className="mt-10">
        <div className="text-center mb-6">
            <span className="eyebrow">Cobertura</span>
            <h2 className="section-heading mt-2">Municipios donde operamos</h2>
            <p className="text-gray-600 mt-2">Cada punto se conecta a nuestra base de operaciones en Pasto.</p>
        </div>

        <div className="coverage-map">
            <p className="coverage-hub mb-6">● Base de operaciones — Pasto, Nariño</p>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                {MUNICIPIOS.map((m) => (
                <div className="coverage-node" key={m.nombre}>
                    <img src={`/imagenes/${m.imagen}`} alt={m.nombre} loading="lazy" />
                    <p className="dist">{m.dist}</p>
                    <h4>{m.nombre}</h4>
                </div>
                ))}
            </div>
        </div>
    </div>

    <div className="contenido-cuadro visible mt-8 text-center">
        <p className="text-gray-700">
            ¿Tu proyecto está en otra zona? Escríbenos, con gusto evaluamos cobertura.
            <a href={`https://wa.me/${empresa.whatsapp}?text=Hola%2C%20quisiera%20consultar%20cobertura`} target="_blank" rel="noopener" className="font-semibold hover:underline" style={{ color: 'var(--signal-500)' }}>Hablar por WhatsApp</a>
            o escribe a <a href={`mailto:${empresa.email}`} className="font-semibold hover:underline" style={{ color: 'var(--signal-500)' }}>{empresa.email}</a>
        </p>
    </div>
</main>

    </>
  );
}
