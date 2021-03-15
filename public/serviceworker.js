var cachedFiles = [
  '/',
  '/index.js',
  '/styles.css',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// initialization
self.addEventListener('install', function(event) {
  // store cached files
  event.waitUntil(
    caches.open("budget-app-cache").then( 
    function(cache) {
      console.log('Opened cache');
      return cache.addAll(cachedFiles);
  }))
})

// handle fetch requests offline
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then( 
      function(res) {
        if (res) return res;
        return fetch(event.request);
  }))
})