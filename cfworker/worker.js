// ZULPANOV METHODS TARIX — Telegram webhook qabulxonasi (Cloudflare Worker)
// Telegram yangilanishni shu yerga yuboradi; Worker darhol "ok" qaytaradi
// va yangilanishni Google Apps Script'ga uzatadi (u yerda maxfiy kalit tekshiriladi).
const GAS = "https://script.google.com/macros/s/AKfycbyLNtb3bcSm7YvE1ZzxtyaJbv8MwDLlXiwPvJD4apMwZfDafB1UyvR4LisDw7ZpQe1TYg/exec";

export default {
  async fetch(req, env, ctx) {
    if (req.method !== "POST") return new Response("ZULPANOV TARIX bot ✅");
    const tg = await req.text();
    const s = req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (!s) return new Response("forbidden", { status: 403 });
    ctx.waitUntil(fetch(GAS, { method: "POST", body: JSON.stringify({ tg, s }), redirect: "manual" }).catch(() => {}));
    return new Response("ok");
  },
};
