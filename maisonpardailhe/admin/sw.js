// Service Worker pour l'interface Admin Maison Pardailhé
const CACHE_NAME = 'maisonpardailhe-admin-v1';
const ASSETS_TO_CACHE = [
  '/admin/dashboard.html',
  '/admin/login.html',
  '/admin/css/admin-clean.css',
  '/admin/css/admin-clean.min.css',
  '/admin/js/admin.js',
  '/admin/manifest.json',
  '/img/logo.png',
  '/favicon-32x32.png',
  '/favicon-48x48.png'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Mise en cache des assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activation');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de cache: Network First pour l'API, Cache First pour les assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas intercepter les requêtes API (laisse passer pour les données temps réel)
  if (url.pathname.startsWith('/api/')) {
    // Network only pour l'API
    return;
  }

  // Ne pas intercepter les SSE
  if (url.pathname.includes('/stream')) {
    return;
  }

  // Cache First pour les assets statiques
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // Ne mettre en cache que les réponses valides
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Cloner la réponse car elle ne peut être utilisée qu'une fois
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
      .catch(() => {
        // Fallback en cas d'erreur réseau
        if (request.destination === 'document') {
          return caches.match('/admin/login.html');
        }
      })
  );
});

// Gestion des messages (pour forcer la mise à jour)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
