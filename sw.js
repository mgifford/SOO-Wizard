// Minimal passthrough service worker to silence missing-file errors
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // No offline caching; just passthrough
  event.respondWith(fetch(event.request));
});
