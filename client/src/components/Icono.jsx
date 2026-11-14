// Sprite SVG propio (24x24, trazo). Sustituye a Font Awesome: sin CDN, sin peticiones extra.
const P = {
  'circle-check': '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  'triangle-exclamation': '<path d="M12 3.5 2.5 20h19L12 3.5z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  'circle-info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
  eye: '<path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/>',
  'eye-slash': '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10.5 7 10.5 7a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 1.5 12S5.5 19 12 19a10 10 0 0 0 4.2-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  whatsapp: '<path d="M3 21l1.6-5A8.5 8.5 0 1 1 8 19.4L3 21z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2.2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2.2L9 8.5z"/>',
  google: '<path d="M21 12.2c0-.6 0-1.1-.1-1.7H12v3.3h5a4.3 4.3 0 0 1-1.9 2.8v2.3h3A9 9 0 0 0 21 12.2z"/><path d="M12 21c2.4 0 4.5-.8 6-2.2l-3-2.3c-.8.6-1.8.9-3 .9a5.4 5.4 0 0 1-5.1-3.7H3.8v2.4A9 9 0 0 0 12 21z"/><path d="M6.9 13.7a5.4 5.4 0 0 1 0-3.4V7.9H3.8a9 9 0 0 0 0 8.2l3.1-2.4z"/><path d="M12 6.6c1.3 0 2.5.5 3.5 1.4l2.6-2.6A9 9 0 0 0 3.8 7.9l3.1 2.4C7.6 8 9.6 6.6 12 6.6z"/>',
  'location-dot': '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  envelope: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
  'shield-halved': '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.500 7.5-5 7.5-9.500V6L12 3z"/><path d="M12 3v18"/>',
  pen: '<path d="m4 20 1-4L16.500 4.500a2 2 0 0 1 3 3L8 19l-4 1z"/><path d="m14.500 6.500 3 3"/>',
  camera: '<path d="M4 8h3l1.500-2.500h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.500"/>',
  'file-arrow-up': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"/><path d="M14 3v5h5M12 17v-6M9.500 13.500 12 11l2.500 2.500"/>',
  'toggle-on': '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="17" cy="12" r="2.500"/>',
  'toggle-off': '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="7" cy="12" r="2.500"/>',
  'file-invoice': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1"/><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>',
  'chevron-left': '<path d="m15 5-7 7 7 7"/>',
  'chevron-right': '<path d="m9 5 7 7-7 7"/>',
  download: '<path d="M12 4v11M7.500 10.500 12 15l4.500-4.500M5 20h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
  reply: '<path d="M10 8 4 13l6 5v-3.500c5 0 8 1 10 4-.5-5-3.500-9-10-9V8z"/>',
  'file-csv': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"/><path d="M14 3v5h5M9 14h6M9 17h6"/>',
  filter: '<path d="M3 5h18l-7 8.500V20l-4-2v-4.500L3 5z"/>',
  house: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20"/>',
  download2: '<path d="M12 4v11"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M5 19.5h14"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  lock: '<rect x="4" y="10.5" width="16" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  gauge: '<path d="M4 18a9 9 0 1 1 16 0"/><path d="m12 13 4-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
  bars: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  'clock-rotate-left': '<path d="M3.500 12a8.500 8.500 0 1 0 2.600-6.100L3.500 8.500"/><path d="M3.500 4v4.500H8M12 8v4.500l3 2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.600 5.600 12.800 12.800"/>',
  bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.500 2h-15L6 17zM10 21h4"/>',
  'hourglass-half': '<path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/>',
  users: '<circle cx="9" cy="8" r="3.500"/><path d="M2.500 20a6.500 6.500 0 0 1 13 0M16 4.500a3.500 3.500 0 0 1 0 7M18 14a6.500 6.500 0 0 1 3.500 6"/>',
  star: '<path d="m12 3 2.700 5.600 6.100.8-4.500 4.200 1.100 6-5.400-3-5.400 3 1.100-6L3.200 9.400l6.100-.8L12 3z"/>',
  'boxes-stacked': '<rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><rect x="8" y="3" width="8" height="8" rx="1"/>',
  'user-shield': '<circle cx="9" cy="8" r="3.500"/><path d="M2.500 20a6.500 6.500 0 0 1 9-6M17 13l-4 1.500v3c0 2 1.700 3.500 4 4.500 2.300-1 4-2.500 4-4.500v-3L17 13z"/>',
  comments: '<path d="M4 5h16v11H9l-5 4V5z"/><path d="M8 9.500h8M8 12.500h5"/>',
  send: '<path d="M21 3 3 10.500l7 3 3 7L21 3zM10 13.500 21 3"/>',
};

export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {Object.entries(P).map(([id, d]) => (
          <symbol key={id} id={`i-${id}`} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            dangerouslySetInnerHTML={{ __html: d }} />
        ))}
      </defs>
    </svg>
  );
}

export default function Icono({ n, className = '', style }) {
  return (
    <svg className={`icono ${className}`} width="1em" height="1em" aria-hidden="true" focusable="false"
      style={{ verticalAlign: '-0.125em', flexShrink: 0, ...style }}>
      <use href={`#i-${n}`} />
    </svg>
  );
}
