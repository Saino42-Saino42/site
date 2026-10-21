const C = 'ege-v3';
const A = ['./', 'index.html', 'praktika.html', 'teor.html', 'isklyucheniya.html', 'style.css', 'tasks.js', 'practice.js', 'words.js', 'extras.js', 'recall.js', 'theory.js', 'images/logo-black.png', 'images/logo-white.png', 'images/teor.jpg', 'images/praktika.jpg'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(C).then((c) => Promise.allSettled(A.map((u) => c.add(u)))).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== C).map((x) => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
    e.respondWith(caches.match(e.request).then((m) => {
        const n = fetch(e.request).then((r) => { const cp = r.clone(); caches.open(C).then((c) => c.put(e.request, cp)); return r; }).catch(() => m);
        return m || n;
    }));
});
