// public/service-worker.js

// Versão do cache — altere quando quiser forçar atualização
const CACHE_NAME = "charmcut-cache-v1";
const urlsToCache = ["/", "/index.html", "/favicon.ico", "/manifest.json"];

self.addEventListener("install", (event) => {
  console.log("[SW] Instalando service worker...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Cache inicializado");
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Ativando novo service worker...");
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[SW] Limpando cache antigo:", cacheName);
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Retorna do cache se existir, caso contrário busca na rede
      return (
        response ||
        fetch(event.request).catch(() => {
          console.warn("[SW] Falha na busca:", event.request.url);
        })
      );
    })
  );
});
