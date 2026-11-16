/* Éloquence — service worker : l'app fonctionne hors ligne une fois ouverte.
   Changez VERSION à chaque mise à jour des fichiers pour forcer le rafraîchissement. */
const VERSION = "eloquence-v7";
const FILES = [
  "./", "index.html", "styles.css", "js/app.js", "js/data.js",
  "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
/* Réseau d'abord (pour recevoir les mises à jour), cache en secours hors ligne. */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    // cache: "no-cache" contourne le cache HTTP de GitHub Pages (10 min) pour avoir toujours la dernière version.
    fetch(e.request.url, { cache: "no-cache" }).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});
