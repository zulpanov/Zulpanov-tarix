// TARIX ARENA — oflayn ishlash uchun xizmat ishchisi
const V = "zm-v102";
const DATA = "zm-data"; const ST = "zm-st"; // shriftlar va rasmlar — yangilanishda o'chirilmaydi // versiyali fayllar (?v=) — yangilanishda o'chirilmaydi
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => { const had = ks.some(k => /^zm-v/.test(k) && k !== V); return Promise.all(ks.filter(k => k !== V && k !== DATA && k !== ST).map(k => caches.delete(k))).then(() => self.clients.claim()).then(() => had && self.clients.matchAll({ type: "window" }).then(cl => cl.forEach(x => x.postMessage({ t: "upd" })))); })); });
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
  // Sahifa: saqlangan nusxa darhol ochiladi (tez kirish), yangisi orqada yuklanib keshga yoziladi.
  // Yangi versiya kelsa — sahifaga xabar beriladi (u o'zi yangilanadi yoki «Yangilash» tugmasini ko'rsatadi)
  if (same && (r.mode === "navigate" || /\.(html|js|webmanifest)$/.test(u.pathname) || u.pathname.endsWith("/"))) {
    const key = r.mode === "navigate" ? "./index.html" : r;
    const net = fetch(r, { cache: "no-cache" }).then(res => { if (res.ok && res.type === "basic") { const cp = res.clone(); caches.open(V).then(c => c.put(key, cp)); } return res; });
    e.respondWith(caches.open(V).then(c => c.match(key, { ignoreSearch: true })).then(old => {
      if (old) {
        if (r.mode === "navigate") e.waitUntil(net.then(async res => { try { const [a, b] = await Promise.all([old.clone().text(), res.clone().text()]); if (a !== b) { const cl = await self.clients.matchAll({ type: "window" }); cl.forEach(x => x.postMessage({ t: "upd" })); } } catch (er) {} }).catch(() => {}));
        else e.waitUntil(net.catch(() => {}));
        return old;
      }
      return net.catch(() => caches.match("./index.html"));
    }));
    return;
  }
  // Rasmlar, shriftlar, kutubxonalar: avval saqlangan nusxa
  const cn = same && /\.(woff2|webp|png|jpe?g|svg|css)$/.test(u.pathname) ? ST : V;
  e.respondWith(caches.match(r).then(x => x || fetch(r).then(res => { if (res.ok || res.type === "opaque") { const cp = res.clone(); caches.open(cn).then(c => c.put(r, cp)); } return res; })));
});
