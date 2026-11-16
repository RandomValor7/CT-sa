import Icono from '../components/Icono.jsx';
import { useSesion } from '../context/Sesion.jsx';

export default function Nosotros() {
  const { config } = useSesion();
  const empresa = config?.empresa ?? {};
  return (
    <>

<main className="container mx-auto p-6">
    <div className="contenido-cuadro visible">

        <section className="mb-10 flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
                <span className="eyebrow">Quiénes somos</span>
                <h1 className="section-heading mt-2 mb-4">Ingeniería con raíces en la región</h1>
                <p className="text-gray-700 leading-relaxed">
                    Nodalia Ingeniería es una empresa creada en el año 2020 con operación nacional y experiencia en la
                    integración de soluciones de infraestructura para telecomunicaciones en fibra óptica, radioenlaces, redes
                    eléctricas, electrónicas y paneles solares. Integramos las marcas más reconocidas del mercado, garantizando
                    el cumplimiento de la normatividad técnica de instalaciones (RETIE). Desarrollamos proyectos para
                    importantes empresas de la región y del interior del país, además de proveer conectividad
                    a internet a comunidades alejadas del casco urbano y a proyectos públicos de educación.
                </p>
            </div>
            <div className="md:w-1/2 flex justify-center">
                <img src="/imagenes/ct.png" alt="Nodalia Ingeniería" className="w-3/4 md:w-2/3 rounded-lg" />
            </div>
        </section>

        <section className="mb-10 p-6 rounded-lg" style={{ background: 'var(--paper-100)' }}>
            <span className="eyebrow">Ubicación</span>
            <p className="text-gray-700 mt-2">
                Estamos ubicados en <strong>{empresa.direccion}</strong>.
            </p>
        </section>

        <section className="mb-10">
            <span className="eyebrow">Objetivos</span>
            <h2 className="section-heading mt-2 mb-6">Nuestros objetivos como empresa</h2>
            <div className="flex flex-col md:flex-row items-start gap-8">
                <div className="md:w-1/3">
                    <img src="/imagenes/tcb.png" alt="Objetivos" className="w-full rounded-lg" loading="lazy" />
                </div>
                <div className="md:w-2/3 space-y-5">
                    <div className="flex gap-3">
                        <span className="font-mono text-sm shrink-0" style={{ color: 'var(--signal-500)' }}>01</span>
                        <div>
                            <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--txt)' }}>Mantenimiento y operación de redes</h3>
                            <p className="text-gray-600 text-sm mt-1">Ofrecemos servicios de mantenimiento y operación de redes de telecomunicaciones, garantizando productos de la más alta calidad que brindan seguridad, confianza y productividad a nuestros clientes.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <span className="font-mono text-sm shrink-0" style={{ color: 'var(--signal-500)' }}>02</span>
                        <div>
                            <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--txt)' }}>Innovación en servicios</h3>
                            <p className="text-gray-600 text-sm mt-1">Innovamos continuamente en telecomunicaciones, servicios eléctricos y electrónicos, creando ambientes laborales con fuerte sentido de pertenencia que promueven el desarrollo y la eficiencia.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <span className="font-mono text-sm shrink-0" style={{ color: 'var(--signal-500)' }}>03</span>
                        <div>
                            <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--txt)' }}>Posicionamiento en el mercado</h3>
                            <p className="text-gray-600 text-sm mt-1">Buscamos consolidarnos como líderes en el mercado de telecomunicaciones, seguridad e informática, proporcionando productos y servicios superiores que exceden las expectativas de nuestros clientes.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <span className="font-mono text-sm shrink-0" style={{ color: 'var(--signal-500)' }}>04</span>
                        <div>
                            <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--txt)' }}>Propuestas accesibles y viables</h3>
                            <p className="text-gray-600 text-sm mt-1">Desarrollamos e integramos soluciones accesibles y viables en telecomunicaciones, electricidad, electrónica e informática, adaptadas a viviendas, empresas, instituciones educativas y entidades gubernamentales.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section className="mb-10 flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
                <span className="eyebrow">Equipo</span>
                <h2 className="section-heading mt-2 mb-4">Nuestro personal</h2>
                <p className="text-gray-700 leading-relaxed">
                    Nodalia Ingeniería cuenta con personal capacitado en mantenimiento preventivo y correctivo de
                    infraestructura para telecomunicaciones, eléctrica y electrónica. Comercializamos tecnología para el
                    sector de telecomunicaciones e informática: equipos de red, suministros, accesorios y conocimientos
                    tecnológicos avanzados, respaldados con responsabilidad y ética profesional.
                </p>
            </div>
            <div className="md:w-1/2 flex justify-center">
                <img src="/imagenes/nosotros.jpg" alt="Nuestro personal" className="w-full h-64 object-cover rounded-lg" loading="lazy" />
            </div>
        </section>

        <section>
            <span className="eyebrow">Fundamentos</span>
            <h2 className="section-heading mt-2 mb-6">Misión, Visión y Valores</h2>
            <div className="grid gap-5 md:grid-cols-2 mb-5">
                <div className="spec-card hover-lift">
                    <span className="spec-index">MISIÓN</span>
                    <h3>Nuestra razón de ser</h3>
                    <p>
                        Proveer de manera eficiente la comunicación de datos, con tecnología de punta y la alta preparación
                        de nuestros colaboradores, ofreciendo el más alto beneficio a nuestra clientela a nivel regional y nacional.
                    </p>
                </div>
                <div className="spec-card hover-lift">
                    <span className="spec-index">VISIÓN</span>
                    <h3>Hacia dónde vamos</h3>
                    <p>
                        Convertirnos en una empresa líder en el desarrollo de mercados de datos e internet en la región
                        y el resto del país, con crecimiento continuo, alta innovación y servicios de calidad con
                        transparencia.
                    </p>
                </div>
            </div>

            <div className="spec-card hover-lift">
                <span className="spec-index">VALORES</span>
                <h3>Lo que no negociamos</h3>
                <ul className="text-sm space-y-1.5 list-disc list-inside" style={{ color: 'var(--slate-300)' }}>
                    <li>Rendición de cuentas y transparencia, claros y concisos con nuestros compromisos.</li>
                    <li>Comportamiento ético, respetando a nuestros clientes y a nuestro talento humano.</li>
                    <li>Principios de legalidad, con garantías de nuestros servicios a todos los interesados.</li>
                    <li>Respeto a los derechos humanos, cuidando nuestra imagen corporativa y reputación.</li>
                    <li>Atraer talento a la organización mediante un fuerte sentido de pertenencia.</li>
                </ul>
            </div>
        </section>

    </div>
</main>

    </>
  );
}
