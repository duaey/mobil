/* GATE 7 — service worker for offline play (PWA) */
const CACHE = "gate7-v9";
const ASSETS = [
  "./", "./index.html", "./css/style.css",
  "./js/audio.js", "./js/i18n.js", "./js/state.js", "./js/ui.js", "./js/game.js",
  "./js/data/documents.js", "./js/data/scenarios.js",
  "./manifest.json",
  "./locales/en.json", "./locales/tr.json", "./locales/de.json",
  "./locales/fr.json", "./locales/es.json", "./locales/pt.json",
  "./locales/ru.json", "./locales/zh.json", "./locales/ja.json",
  "./locales/ko.json", "./locales/ar.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
/* network-first: always try the live file, fall back to cache when offline.
   This prevents the old PWA-cache trap where a stale build keeps serving. */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
