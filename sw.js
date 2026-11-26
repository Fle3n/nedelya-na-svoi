// Офлайн-режим: после первого открытия игра работает без интернета (детский дом, электричка, плохая связь).
const CACHE = 'nedelya-v4';
const FILES = [
  './',
  'index.html',
  'css/style.css',
  'fonts/Oswald.woff2',
  'fonts/GolosText.woff2',
  'fonts/JetBrainsMono.woff2',
  'js/data/prices.js',
  'js/data/products.js',
  'js/data/recipes.js',
  'js/data/events.js',
  'js/data/mentor.js',
  'js/stickers.js',
  'js/engine.js',
  'js/results.js',
  'js/autoplay.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Сначала сеть (чтобы обновления цен доходили), при отсутствии сети — кэш.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
