/**
 * sw.js â€” Service Worker der Protokoll-App
 *
 * Strategie: Cache-first fÃ¼r App-Shell-Assets, Network-first fÃ¼r Daten.
 * ErmÃ¶glicht Offline-Nutzung der App.
 */

const CACHE_NAME    = 'protokoll-app-v2.24';
const SHELL_ASSETS  = [
  './index.html',
  './css/style.css',
  './js/lib/jspdf.umd.min.js',
  './js/lib/jspdf.plugin.autotable.min.js',
  './js/lib/nunito-sans-fonts.js',
  './js/db.js',
  './js/pdf-export.js',
  './js/app.js',
  './js/icons.js',
  './manifest.json',
  './icons/favicon.jpg',
  './icons/favicon.png',
  './icons/kadra-logo.png',
  './icons/HOPRO%20Logo_wei%C3%9FerHintergrund_medres.jpg',
  './fonts/nunito-sans-v19-latin-regular.woff2',
  './fonts/nunito-sans-v19-latin-600.woff2',
];

/* â”€â”€ Install: App-Shell in Cache legen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

/* â”€â”€ Activate: Alte Caches entfernen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* â”€â”€ Fetch: Cache-first fÃ¼r App-Shell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
self.addEventListener('fetch', (e) => {
  // Nur GET-Anfragen cachen
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Erfolgreiche Antworten in Cache schreiben
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline-Fallback: index.html zurÃ¼ckgeben
      if (e.request.destination === 'document') {
        return caches.match('/index.html');
      }
    })
  );
});

