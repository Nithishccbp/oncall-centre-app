// Minimal service worker: lets the app open instantly and show its shell when the network drops. Never touches /api (calls, AI, telephony).
const V = 'og-shell-v1';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(['/', '/manifest.webmanifest'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api')) return;
  if (e.request.mode === 'navigate') { e.respondWith(fetch(e.request).catch(() => caches.match('/'))); return; }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(V).then((c) => c.put(e.request, copy)); } return r; })));
});
