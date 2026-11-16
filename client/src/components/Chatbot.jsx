import { useEffect, useRef, useState } from 'react';

const REGLAS = [
  [['quiénes son', 'quienes son'], 'Somos Nodalia Ingeniería, una empresa que ofrece soluciones en telecomunicaciones, redes, energía y más desde 2020.'],
  [['qué hacen', 'servicios'], 'Ofrecemos servicios de instalación de fibra óptica, cableado estructurado, redes inalámbricas, instalaciones eléctricas y seguridad electrónica.'],
  [['contacto'], 'Puedes contactarnos por celular: 300 000 0000 – 300 000 0001 o correo: contacto@nodalia.example'],
  [['valores'], 'Nuestros valores son transparencia, ética, legalidad, respeto por los derechos humanos y compromiso social.'],
  [['visión'], 'Nuestra visión es ser líderes en el mercado de telecomunicaciones en la región y todo el país.'],
  [['misión'], 'Nuestra misión es proveer conectividad de datos con tecnología de punta y un equipo altamente capacitado.'],
  [['clientes'], 'Hemos trabajado con empresas como Voltara, Cobalto Telecom, Meridiano Logística y muchas más.'],
  [['mejorará', 'mejoras', 'actualizará'], 'Sí, esta página y la IA seguirán mejorando constantemente para ofrecerte una mejor experiencia.'],
  [['gracias', 'ok'], '¡De nada! Si tienes más preguntas, no dudes en preguntar.'],
  [['hola', 'buenas', 'saludos'], '¡Hola! ¿En qué puedo ayudarte hoy?'],
  [['adiós', 'chao', 'hasta luego'], '¡Hasta luego! Espero verte pronto.'],
  [['ayuda', 'soporte'], 'Claro, ¿en qué necesitas ayuda?'],
  [['precio', 'costo'], 'Los precios varían según el servicio. Contáctanos para más detalles.'],
  [['ubicación', 'dónde están'], 'Estamos ubicados en Villa Aurora, Colombia (dirección ficticia de demostración).'],
  [['horario', 'horas'], 'Nuestro horario de atención es de lunes a viernes de 8:00 AM a 5:00 PM.'],
  [['trabajo', 'empleo'], 'Estamos en constante búsqueda de talento. Envía tu hoja de vida a nuestro correo.'],
  [['testimonios', 'opiniones'], 'Nuestros clientes han tenido experiencias positivas. Puedes ver sus testimonios en nuestra página web.'],
  [['promociones', 'ofertas'], 'Estamos trabajando en nuevas promociones. Mantente atento a nuestras redes sociales.'],
  [['proyectos', 'trabajos'], 'Hemos realizado proyectos en telecomunicaciones y energía para diversas empresas. Consulta nuestro portafolio.'],
];

const SIN_RESPUESTA = 'Lo siento, no tengo una respuesta precisa para eso aún. Puedes preguntar sobre nuestros servicios, contacto, misión, visión, etc.';

export function responderBot(entrada) {
  const texto = entrada.toLowerCase();
  const regla = REGLAS.find(([claves]) => claves.some((c) => texto.includes(c)));
  return regla ? regla[1] : SIN_RESPUESTA;
}

export default function Chatbot() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const fin = useRef(null);
  const temporizadores = useRef([]);

  useEffect(() => { fin.current?.scrollIntoView?.({ block: 'end' }); }, [mensajes, abierto]);
  useEffect(() => () => temporizadores.current.forEach(clearTimeout), []);

  const enviar = (e) => {
    e.preventDefault();
    const mensaje = texto.trim();
    if (!mensaje) return;
    setMensajes((m) => [...m, { de: 'user', texto: mensaje }]);
    setTexto('');
    temporizadores.current.push(window.setTimeout(() => {
      setMensajes((m) => [...m, { de: 'bot', texto: responderBot(mensaje) }]);
    }, 500));
  };

  return (
    <div className="chatbot-widget">
      <button type="button" className="chatbot-toggle" onClick={() => setAbierto((a) => !a)}
        aria-label="Abrir asistente virtual" aria-expanded={abierto}>💬</button>
      <div className={`chatbot-box${abierto ? '' : ' hidden'}`}>
        <div className="chatbot-header">
          <span>Asistente virtual</span>
          <button type="button" onClick={() => setAbierto(false)} style={{ color: 'white' }} aria-label="Cerrar asistente">✖</button>
        </div>
        <div className="chatbot-messages" id="chatbot-messages" aria-live="polite">
          {mensajes.map((m, i) => <div key={i} className={`message ${m.de}`}>{m.texto}</div>)}
          <div ref={fin} />
        </div>
        <form id="chatbot-form" onSubmit={enviar}>
          <input type="text" id="user-input" value={texto} onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe tu pregunta..." autoComplete="off" />
          <button type="submit">Enviar</button>
        </form>
      </div>
    </div>
  );
}
