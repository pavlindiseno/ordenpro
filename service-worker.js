const CACHE_NAME = 'ordenpro-cache-v21';

// Archivos propios de la app: SIEMPRE deben poder cachearse (están en el mismo sitio)
const LOCAL_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Recursos externos (Tailwind, iconos, generación de PDF): se cachean
// "a la primera oportunidad" pero SIN bloquear la instalación si fallan
// por mala conexión, para que la app igualmente quede instalada y usable.
const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Instala el service worker y guarda los archivos base en caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(LOCAL_ASSETS);
      // Best-effort: si algún recurso externo falla (mala conexión), no rompe la instalación
      await Promise.allSettled(CDN_ASSETS.map((url) => cache.add(url).catch(() => {})));
    })
  );
  self.skipWaiting();
});

// Limpia cachés antiguas cuando se activa una nueva versión
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isCdnRequest(url) {
  return CDN_ASSETS.some((cdnUrl) => url === cdnUrl) ||
    url.includes('cdn.tailwindcss.com') ||
    url.includes('cdnjs.cloudflare.com');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Recursos externos (Tailwind, iconos, PDF): caché primero, al instante.
  // Si hay conexión, se actualiza la copia guardada por detrás para la próxima vez,
  // pero SIN hacer esperar a la página — así nunca se queda "colgada" por mala cobertura.
  if (isCdnRequest(event.request.url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const networkUpdate = fetch(event.request)
          .then((response) => {
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => null);
        return cached || (await networkUpdate) || fetch(event.request);
      })
    );
    return;
  }

  // Archivos propios de la app: red primero (para tener siempre la última versión),
  // con la copia guardada como reserva si falla la conexión.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
