// IN-11: the minimal service worker that makes the blueprint installable (Roll20 «Aggiungi
// a Home» / PWA install prompt). It never caches: every request goes to the network, so a
// development server's updated modules are never stale. Real offline copies stay the
// explicit «Disponibile offline» choices of offline.mjs, kept in the app's own storage.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => event.respondWith(fetch(event.request)));
