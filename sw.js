// ZULPANOV METHODS TARIX — oflayn ishlash uchun xizmat ishchisi
const V = "zm-v5";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET") return;
  const same = u.origin === location.origin, font = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname), lib = /cdnjs\.cloudflare\.com$/.test(u.hostname);
  if (!same && !font && !lib) return; // Firebase, Telegram va boshqalar — to'g'ridan-to'g'ri internet
  // Versiyali fayllar (?v=...) o'zgarmaydi: avval keshdan — test savollari qayta yuklanmaydi
  if (same && /[?&]v=/.test(u.search) && /\.js$/.test(u.pathname)) {
    e.respondWith(caches.match(r).then(x => x || fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })));
    return;
  }
  // Sahifa va ma'lumotlar: avval internet (yangilanish darhol keladi), bo'lmasa saqlangan nusxa
  if (same && (r.mode === "navigate" || /\.(html|js|webmanifest)$/.test(u.pathname) || u.pathname.endsWith("/"))) {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then(x => x || caches.match("./index.html"))));
    return;
  }
  // Rasmlar, shriftlar, kutubxonalar: avval saqlangan nusxa
  e.respondWith(caches.match(r).then(x => x || fetch(r).then(res => { if (res.ok || res.type === "opaque") { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })));
});
