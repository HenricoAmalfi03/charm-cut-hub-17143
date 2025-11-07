self.addEventListener("install", (event) => {
  console.log("Service Worker: instalado");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker: ativo");
});

self.addEventListener("fetch", (event) => {
  // Mantém comportamento padrão (sem cache por enquanto)
});
