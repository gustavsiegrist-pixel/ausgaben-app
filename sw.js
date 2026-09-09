/* Service Worker: Cache-first mit Hintergrund-Aktualisierung (stale-while-revalidate).
   Die App startet sofort aus dem Cache; neue Versionen greifen beim nächsten Start. */
const CACHE = 'ausgaben-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // API-Calls nie cachen
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(cached => {
      // Im Hintergrund frisch holen und Cache aktualisieren
      const network = fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => cached);
      // Sofort aus dem Cache antworten, sonst aufs Netz warten
      return cached || network;
    })
  );
});
