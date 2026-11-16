const VERSION = 'nodalia-v1';
const BASICOS = ['/offline.html', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest'];
const NO_CACHEAR = ['/api/', '/media/', '/login/google', '/sitemap.xml', '/robots.txt'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSION).then((c) => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NO_CACHEAR.some((p) => url.pathname.startsWith(p))) return;

  if (request.mode === 'navigate') {
    evento.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    evento.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((resp) => {
        if (resp.ok) { const copia = resp.clone(); caches.open(VERSION).then((c) => c.put(request, copia)); }
        return resp;
      })),
    );
    return;
  }

  if (url.pathname.startsWith('/imagenes/') || /\.(png|jpg|jpeg|svg|webp|woff2?)$/.test(url.pathname)) {
    evento.respondWith(
      caches.match(request).then((hit) => {
        const red = fetch(request).then((resp) => {
          if (resp.ok) { const copia = resp.clone(); caches.open(VERSION).then((c) => c.put(request, copia)); }
          return resp;
        }).catch(() => hit);
        return hit || red;
      }),
    );
  }
});
