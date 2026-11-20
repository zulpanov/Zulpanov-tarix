// TARIX ARENA — oflayn ishlash uchun xizmat ishchisi
const V = "zm-v61";
const DATA = "zm-data"; // versiyali fayllar (?v=) — yangilanishda o'chirilmaydi
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== DATA).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET") return;
  const same = u.origin === location.origin, font = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname), lib = /cdnjs\.cloudflare\.com$/.test(u.hostname); const fbjs = u.hostname === "www.gstatic.com" && u.pathname.startsWith("/firebasejs/");
  if (!same && !font && !lib && !fbjs) return; // Firebase, Telegram va boshqalar — to'g'ridan-to'g'ri internet
  // Versiyali fayllar (?v=...) o'zgarmaydi: avval keshdan — test savollari qayta yuklanmaydi
  if (fbjs || (same && /[?&]v=/.test(u.search) && /\.js$/.test(u.pathname))) {
    e.respondWith(caches.open(DATA).then(c => c.match(r).then(x => x || fetch(r).then(res => { if (res.ok) { c.put(r, res.clone()); c.keys().then(ks => ks.forEach(k => { const a = new URL(k.url); if (a.pathname === u.pathname && a.search !== u.search) c.delete(k); })); } return res; }))));
    return;
  }
  // Sahifa va ma'lumotlar: avval internet (yangilanish darhol keladi), bo'lmasa saqlangan nusxa
  if (same && (r.mode === "navigate" || /\.(html|js|webmanifest)$/.test(u.pathname) || u.pathname.endsWith("/"))) {
    // Internet sekin bo'lsa (4 soniyadan ko'p) — saqlangan nusxa darhol ochiladi, yangisi orqada keshga yoziladi
    const net = fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; });
    const old = () => caches.match(r, { ignoreSearch: true }).then(x => x || (r.mode === "navigate" ? caches.match("./index.html") : undefined));
    e.respondWith(new Promise(ok => {
      let done = false; const fin = x => { if (!done && x) { done = true; ok(x); } };
      const t = setTimeout(() => old().then(fin), 4000);
      net.then(x => { clearTimeout(t); fin(x); }).catch(() => { clearTimeout(t); old().then(x => x ? fin(x) : ok(Response.error())); });
    }));
    e.waitUntil(net.catch(() => {}));
    return;
  }
  // Rasmlar, shriftlar, kutubxonalar: avval saqlangan nusxa
  e.respondWith(caches.match(r).then(x => x || fetch(r).then(res => { if (res.ok || res.type === "opaque") { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })));
});
