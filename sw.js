// CheckMijnHuis Advies – service worker: zorgt dat de app ook zonder internet werkt.
// Verhoog VERSIE bij elke nieuwe publicatie, zodat alle bestanden opnieuw worden opgehaald.
const VERSIE = 'cmh-v1.2.3';
const BESTANDEN = [
  './', './index.html', './app.css', './icons.js', './manifest.webmanifest',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
  './fonts/inter-latin-400-normal.woff2', './fonts/inter-latin-500-normal.woff2', './fonts/inter-latin-600-normal.woff2',
  './fonts/inter-latin-700-normal.woff2', './fonts/inter-latin-800-normal.woff2', './fonts/inter-latin-900-normal.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIE).then(c => c.addAll(BESTANDEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSIE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // De app zelf: eerst online proberen (dan krijg je updates), anders de bewaarde versie
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const kopie = res.clone(); caches.open(VERSIE).then(c => c.put('./index.html', kopie)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // Overige bestanden: uit de opslag, en op de achtergrond verversen
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res.ok) { const k = res.clone(); caches.open(VERSIE).then(c => c.put(req, k)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
