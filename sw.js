const CACHE_NAME = 'tareas-app-v13'; 
const urlsToCache = [ './', './index.html', './manifest.json', './icon-192.png', './icon-512.png' ];
self.addEventListener('install', (event) => {
    event.waitUntil( caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)) );
    self.skipWaiting();
});
self.addEventListener('activate', (event) => {
    event.waitUntil( caches.keys().then((cacheNames) => {
        return Promise.all( cacheNames.map((cache) => { if (cache !== CACHE_NAME) return caches.delete(cache); }) );
    }) );
    return self.clients.claim();
});
self.addEventListener('fetch', (event) => {
    event.respondWith( fetch(event.request).catch(() => caches.match(event.request)) );
});







