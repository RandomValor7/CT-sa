export function construirCsp({ analytics = false, turnstile = false } = {}) {
  const scripts = ["'self'"];
  const conexiones = ["'self'"];
  const marcos = ["'none'"];
  const imagenes = ["'self'", 'data:'];

  if (turnstile) {
    scripts.push('https://challenges.cloudflare.com');
    conexiones.push('https://challenges.cloudflare.com');
    marcos.splice(0, 1, 'https://challenges.cloudflare.com');
  }
  if (analytics) {
    scripts.push('https://www.googletagmanager.com');
    conexiones.push('https://www.google-analytics.com', 'https://*.google-analytics.com',
      'https://*.analytics.google.com', 'https://www.googletagmanager.com');
    imagenes.push('https://www.google-analytics.com', 'https://www.googletagmanager.com');
  }

  return {
    defaultSrc: ["'self'"],
    scriptSrc: scripts,
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    imgSrc: imagenes,
    connectSrc: conexiones,
    frameSrc: marcos,
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
  };
}

export function cspComoTexto(directivas) {
  const aGuion = (clave) => clave.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
  return Object.entries(directivas).map(([clave, valores]) => `${aGuion(clave)} ${valores.join(' ')}`).join('; ');
}
