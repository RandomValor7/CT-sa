import { useSesion } from '../context/Sesion.jsx';

const FECHA_POLITICA = '08/11/2026';

export default function Privacidad() {
  const { config } = useSesion();
  const empresa = config?.empresa ?? {};
  return (
    <>

<main className="container mx-auto p-6">
    <div className="contenido-cuadro visible max-w-3xl mx-auto">
        <span className="eyebrow">Datos personales</span>
        <h1 className="section-heading mt-2 mb-2">Política de tratamiento de datos personales</h1>
        <p className="text-gray-500 text-sm font-mono mb-6">Última actualización: {FECHA_POLITICA}</p>

        <div className="prose text-gray-700 text-sm leading-relaxed space-y-5">
            <p>
                En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013 de la
                República de Colombia (régimen de protección de datos personales,
                "Habeas Data"), {empresa.nombre}, identificada con NIT
                {empresa.nit}, informa a los usuarios de este sitio web la
                siguiente política de tratamiento de datos personales.
            </p>

            <div>
                <h2 className="font-display font-semibold text-base mb-1" style={{ color: 'var(--ink-900)' }}>1. Responsable del tratamiento</h2>
                <p>
                    {empresa.nombre}, con domicilio en {empresa.direccion},
                    correo de contacto <a href={`mailto:${empresa.email}`} className="hover:underline" style={{ color: 'var(--ink-700)' }}>{empresa.email}</a>
                    y teléfono {empresa.telefonos}.
                </p>
            </div>

            <div>
                <h2 className="font-display font-semibold text-base mb-1" style={{ color: 'var(--ink-900)' }}>2. Datos que recolectamos</h2>
                <p>A través de este sitio web podemos recolectar los siguientes datos personales:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Nombre y correo electrónico, al registrar una cuenta de usuario.</li>
                    <li>Nombre, correo electrónico y el contenido del mensaje, al usar el formulario de contacto.</li>
                    <li>Nombre (opcional) y comentario, al enviar una reseña.</li>
                    <li>Fotografía de perfil y archivos de factura, si decides subirlos desde tu cuenta.</li>
                </ul>
            </div>

            <div>
                <h2 className="font-display font-semibold text-base mb-1" style={{ color: 'var(--ink-900)' }}>3. Finalidad del tratamiento</h2>
                <p>Los datos recolectados se usan exclusivamente para:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Gestionar tu cuenta de usuario y darte acceso a las funciones del sitio.</li>
                    <li>Responder los mensajes enviados por el formulario de contacto.</li>
                    <li>Publicar reseñas de servicio, previa revisión y aprobación.</li>
                    <li>Almacenar y permitirte descargar tus propias facturas.</li>
                    <li>Cumplir obligaciones legales o contractuales relacionadas con la prestación de nuestros servicios de ingeniería.</li>
                </ul>
                <p className="mt-2">No vendemos, alquilamos ni compartimos tus datos personales con terceros para fines comerciales o publicitarios.</p>
            </div>

            <div>
                <h2 className="font-display font-semibold text-base mb-1" style={{ color: 'var(--ink-900)' }}>4. Derechos del titular de los datos</h2>
                <p>Como titular de tus datos personales, tienes derecho a:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Conocer</strong> qué datos tuyos tenemos almacenados.</li>
                    <li><strong>Actualizar y rectificar</strong> tu información (puedes hacerlo directamente desde "Editar mis datos" en tu perfil, o escribiéndonos).</li>
                    <li><strong>Solicitar la eliminación</strong> de tus datos cuando no exista un deber legal o contractual de conservarlos.</li>
                    <li><strong>Revocar la autorización</strong> otorgada para el tratamiento de tus datos.</li>
                    <li><strong>Presentar quejas</strong> ante la Superintendencia de Industria y Comercio por infracciones a la ley de protección de datos.</li>
                </ul>
                <p className="mt-2">
                    Para ejercer cualquiera de estos derechos, escríbenos a
                    <a href={`mailto:${empresa.email}`} className="hover:underline" style={{ color: 'var(--ink-700)' }}>{empresa.email}</a>
                    indicando tu solicitud. Responderemos dentro de los términos establecidos por la ley (máximo 15 días hábiles para consultas, 2 días hábiles para reclamos de trámite urgente).
                </p>
            </div>

            <div>
                <h2 className="font-display font-semibold text-base mb-1" style={{ color: 'var(--ink-900)' }}>5. Seguridad de la información</h2>
                <p>
                    Las contraseñas de usuario se almacenan cifradas (nunca en texto
                    plano). El acceso a tu cuenta requiere autenticación, y los archivos
                    que subas (foto de perfil, facturas) solo son accesibles por ti o por
                    personal autorizado de {empresa.nombre}.
                </p>
            </div>

            <div>
                <h2 className="font-display font-semibold text-base mb-1" style={{ color: 'var(--ink-900)' }}>6. Cookies y analítica</h2>
                <p>
                    {config?.googleAnalyticsId ? (
                    <>
                    Este sitio usa Google Analytics para entender cuánta gente lo visita
                    y qué páginas les resultan útiles. Esto usa cookies y guarda tu
                    dirección IP de forma anonimizada — no identificamos a personas
                    individuales, solo vemos estadísticas generales de visitas. Puedes
                    bloquear estas cookies desde la configuración de tu navegador sin
                    que eso afecte el uso normal del sitio.
                    </>
                    ) : (
                    <>
                    Actualmente este sitio no usa cookies de analítica ni de terceros
                    con fines de seguimiento.
                    </>
                    )}
                </p>
            </div>

            <div>
                <h2 className="font-display font-semibold text-base mb-1" style={{ color: 'var(--ink-900)' }}>7. Vigencia</h2>
                <p>
                    Tus datos se conservarán mientras mantengas una cuenta activa en
                    el sitio, o mientras exista una obligación legal o contractual que
                    justifique su conservación. Puedes solicitar su eliminación en
                    cualquier momento a través del correo indicado arriba.
                </p>
            </div>

            <div>
                <h2 className="font-display font-semibold text-base mb-1" style={{ color: 'var(--ink-900)' }}>8. Cambios en esta política</h2>
                <p>
                    Podemos actualizar esta política en cualquier momento. Los cambios
                    relevantes se reflejarán en la fecha de "Última actualización" al
                    inicio de este documento.
                </p>
            </div>
        </div>
    </div>
</main>

    </>
  );
}
