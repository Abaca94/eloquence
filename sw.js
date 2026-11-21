/* Éloquence — service worker : l'app fonctionne hors ligne une fois ouverte.
   Changez VERSION à chaque mise à jour des fichiers pour forcer le rafraîchissement. */
const VERSION = "eloquence-v24";
/* Caches durables, gardés entre les versions : modèle de phonèmes (js/phoneme.js), moteurs onnxruntime
   et Harper, enregistrements, voix du coach (js/coach.js) et données du coach (dictionnaire, WordNet).
   Changez COACH_DATA si coach/lex.json ou coach/sense/ changent. */
const COACH_DATA = "eloquence-coach-v1";
const KEEP = ["eloquence-model-v1", "eloquence-runtime-v1", "eloquence-audio-v2", "eloquence-voice-v1", COACH_DATA];
const RUNTIME_PREFIXES = ["https://cdn.jsdelivr.net/npm/onnxruntime-web@", "https://cdn.jsdelivr.net/npm/harper.js@"];
const FILES = [
  "./", "index.html", "styles.css", "js/app.js", "js/data.js", "js/phonemes.js", "js/phoneme.js", "js/audio-index.js", "js/modes.js", "js/coach-data.js", "js/coach.js", "js/critique.js",
  "manifest.webmanifest",
  "fonts/gentium-book-plus-latin-400-normal.woff2", "fonts/gentium-book-plus-latin-ext-400-normal.woff2", "fonts/gentium-book-plus-latin-400-italic.woff2",
  "fonts/gentium-book-plus-latin-ext-400-italic.woff2", "fonts/gentium-book-plus-latin-700-normal.woff2", "fonts/gentium-book-plus-latin-ext-700-normal.woff2",
  "fonts/instrument-sans-latin-wght-normal.woff2", "fonts/instrument-sans-latin-ext-wght-normal.woff2", "fonts/instrument-sans-latin-wght-italic.woff2", "fonts/instrument-sans-latin-ext-wght-italic.woff2", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && !KEEP.includes(k)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
/* Réseau d'abord (pour recevoir les mises à jour), cache en secours hors ligne. */
self.addEventListener("fetch", (e) => {
  /* Moteur onnxruntime (version figée) : cache d'abord, pour l'analyse hors ligne. */
  if (e.request.method === "GET" && RUNTIME_PREFIXES.some((p) => e.request.url.startsWith(p))) {
    e.respondWith(caches.open("eloquence-runtime-v1").then((c) => c.match(e.request).then((hit) => hit ||
      fetch(e.request).then((res) => { if (res.ok) c.put(e.request, res.clone()); return res; }))));
    return;
  }
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  /* Données du coach : cache d'abord. Le modèle de voix (.onnx) est rangé par js/coach.js lui-même. */
  const path = new URL(e.request.url).pathname;
  if (path.includes("/coach/")) {
    if (path.endsWith(".onnx")) return;
    e.respondWith(caches.open(COACH_DATA).then((c) => c.match(e.request).then((hit) => hit ||
      fetch(e.request).then((res) => { if (res.ok) c.put(e.request, res.clone()); return res; }))));
    return;
  }
  /* Enregistrements audio (noms de fichiers uniques par texte) : cache d'abord, gardés entre les versions. */
  if (new URL(e.request.url).pathname.includes("/audio/")) {
    e.respondWith(caches.open("eloquence-audio-v2").then((c) => c.match(e.request).then((hit) => hit ||
      fetch(e.request).then((res) => { if (res.ok) c.put(e.request, res.clone()); return res; }))));
    return;
  }
  e.respondWith(
    // cache: "no-cache" contourne le cache HTTP de GitHub Pages (10 min) pour avoir toujours la dernière version.
    fetch(e.request.url, { cache: "no-cache" }).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});
