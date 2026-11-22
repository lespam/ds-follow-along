// BUILD y FILES los estampa el workflow de GitHub Actions al publicar. No editar a mano.
const BUILD = "__BUILD__";
const FILES = ["__FILES__"];
const CACHE = `dsfa-${BUILD}`;

self.addEventListener("install", (e) => {
  const urls = FILES.filter((f) => !f.startsWith("__")).concat("./");
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(urls)));
  // No hay skipWaiting aquí: la app avisa al usuario y él decide (mensaje SKIP_WAITING).
});

self.addEventListener("message", (e) => { if (e.data === "SKIP_WAITING") self.skipWaiting(); });

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("dsfa-") && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  // version.json siempre de red, para saber la versión real.
  if (url.pathname.endsWith("/version.json")) return;
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    } catch {
      if (req.mode === "navigate") return (await caches.match("./")) || Response.error();
      return Response.error();
    }
  })());
});
