// Define a cache name for your app's assets.
const CACHE_NAME = 'love-calculator-v1';

// List of files to cache. This is the "app shell".
const urlsToCache = [
  './',
  './sw.js',
  './manifest.json',
  './icons/love-calculator_72x72.png',
  './icons/love-calculator_96x96.png',
  './icons/love-calculator_128x128.png',
  './icons/love-calculator_144x144.png',
  './icons/love-calculator_152x152.png',
  './icons/love-calculator_192x192.png',
  './icons/love-calculator_384x384.png',
  './icons/love-calculator_512x512.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Pacifico&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://fonts.gstatic.com/s/pacifico/v22/FwZY7-Qmy14u9lezJ-6H6Mk.woff2',
  'https://fonts.gstatic.com/s/poppins/v23/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff2',
  'https://fonts.gstatic.com/s/poppins/v23/pxiEyp8kv8JHgFVrJJfecg.woff2',
];

// The install event is fired when the service worker is first installed.
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        console.log('Opened cache');
        return Promise.all(urlsToCache.map(function (url) {
          cache
            .add(url)
            .catch(function(err){
              console.warn('Failed to cache', url, err);
            });
          }));
      })
  );
});

// The fetch event is fired for every network request.
self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request)
      .then(function (response) {
        if (response) {
          return response;
        }

        // Determine if request is same-origin
        const requestUrl = new URL(event.request.url);
        const sameOrigin = requestUrl.origin === self.location.origin;

        // If not same-origin, use no-cors mode
        const fetchRequest = sameOrigin
          ? event.request
          : new Request(event.request, { mode: 'no-cors' });

        return fetch(fetchRequest);
      })
  );
});

// The activate event is fired when the service worker is activated.
self.addEventListener('activate', function (event) {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // If this cache name is not in our whitelist, delete it.
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// PWA Version Check Logic
self.addEventListener('message', async function (event) {
  if (event.data && event.data.type === 'CHECK_VERSION') {
    try {
      // Get the cached manifest
      const currentManifestResponse = await caches.match('./manifest.json');
      const currentManifest = currentManifestResponse ? await currentManifestResponse.json() : null;

      // Fetch the latest manifest
      const newManifestRes = await fetch('./manifest.json', { cache: 'no-cache' });
      const newManifest = await newManifestRes.json();

      if (currentManifest && newManifest && currentManifest.version !== newManifest.version) {
        console.log('New PWA version detected. Notifying client.');

        // Notify the page
        event.source.postMessage({ "type": 'UPDATE_AVAILABLE', "version": newManifest.version, "oldVersion": currentManifest.version });

        // Delete all caches
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(function (name) { caches.delete(name); }));

        // Optionally, trigger the clients to reload
        const allClients = await self.clients.matchAll({ includeUncontrolled: true });
        allClients.forEach(function (client) { client.postMessage({ type: 'FORCE_RELOAD' }); });
      }
    } catch (error) {
      console.error('Failed to check for new version:', error);
    }
  }
});

