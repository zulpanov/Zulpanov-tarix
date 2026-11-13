// ZULPANOV METHODS TARIX — Telegram bot serveri (Cloudflare Worker)
//
// Hammasi shu yerda ishlaydi (Google Apps Script endi kerak emas):
//  • Telegram webhook: /start, menyu tugmalari, darslarga yozilish, ota-ona ulanishi, turnir kodi
//  • Mini App API (/api): Telegram orqali kirish, ota-ona havolasi, ustoz uchun xabar yuborish va hisobotlar
//  • Ma'lumotlar Firebase Realtime Database'da saqlanadi (tg/ bo'limi) — bot o'z hisobi bilan kiradi
//
// Sozlash (Cloudflare → Workers → zulpanov-tarix-bot → Settings → Variables and Secrets):
//    BOT_TOKEN  (Secret) = @BotFather bergan token
// Webhook manzili va maxfiy kaliti o'zgarmaydi (avvalgi Worker manzili ishlatiladi).

const FB = {
  apiKey: "AIzaSyAsHPjQsGP6a3yCFfGGZqHX60bkSDqsgs4",
  db: "https://zulpanov-tarix-default-rtdb.europe-west1.firebasedatabase.app",
};
const DOMAIN = "zulpanovtarix.uz";
const BOT_EMAIL = "bot@" + DOMAIN;
const BOT_NAME = "alimqul_tarix_testbot";
const ADMIN_TG = ["zulpanov_methods"];            // ustozning Telegram username'i (kichik harflarda)
const CONTACT = "@ZULPANOV_METHODS";
const CONTACT_URL = "https://t.me/ZULPANOV_METHODS";
const MAP_URL = "https://maps.app.goo.gl/dxLox5nZ6H4HQn6y5";
const BATCH = 35;                                 // bitta so'rovda nechta xabar (Cloudflare bepul rejasi: 50 ta tashqi so'rov)
const KURS_TEXT = "🎓 <b>Tarixni yodlamang — tushunib o‘rganing!</b>\n\n" +
  "Sanalar chalkashib ketyaptimi? Testda bilgan savolingizdan ham adashyapsizmi? Bizning darslarda bunday bo‘lmaydi.\n\n" +
  "✅ Mavzulashgan audio darslar: istalgan joyda, istalgan vaqtda tinglaysiz\n" +
  "✅ Yangi darslik asosida yozilgan mualliflik Milliy sertifikat kitoblari\n" +
  "✅ Har mavzudan keyin test va reyting: natijangizni o‘zingiz ko‘rib borasiz\n\n" +
  "Darslarni <b>Alimqul Zulpanov</b> qiziqarli va tushunarli tarzda olib boradi.\n\n" +
  "📍 <b>Manzil:</b> Bulung‘ur tumani, 39-kollej ro‘parasida — <b>BRO ACADEMY</b> o‘quv markazi\n" +
  "🗓 <b>Dars kunlari:</b> dushanba, chorshanba va juma, soat <b>14:00</b> dan\n\n" +
  "🎯 Milliy sertifikat yoki attestatsiyaga kuchliroq tayyorlanmoqchi bo‘lsangiz, marhamat, sizni kutamiz! 👇";

// ---------------- Yordamchilar ----------------
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
async function hmac(keyBytes, msg) {
  const k = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, typeof msg === "string" ? enc.encode(msg) : msg);
}
const hmacHex = async (key, msg) => hex(await hmac(enc.encode(key), msg));
const esc = s => String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const isAdminTg = u => !!(u && u.username && ADMIN_TG.includes(String(u.username).toLowerCase()));
const fullName = u => [u.first_name, u.last_name].filter(Boolean).join(" ");
const appLink = p => `https://t.me/${BOT_NAME}?startapp` + (p ? "=" + encodeURIComponent(p) : "");
const token = env => { const t = String(env.BOT_TOKEN || "").trim(); const m = t.match(/\d{5,}:[A-Za-z0-9_-]{30,}/); if (!m) throw new Error("BOT_TOKEN sozlanmagan"); return m[0]; };
const whSecret = async env => (await hmacHex(token(env), "wh")).slice(0, 32);        // avvalgi bilan bir xil
const psig = async (env, login) => (await hmacHex(token(env), "p:" + login)).slice(0, 10); // avvalgi bilan bir xil

async function tg(env, method, payload) {
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`https://api.telegram.org/bot${token(env)}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload || {}) });
    const j = await r.json().catch(() => ({}));
    if (j.ok) return j.result;
    const ra = j.parameters && j.parameters.retry_after;
    if (j.error_code === 429 && ra && ra <= 3 && i === 0) { await new Promise(res => setTimeout(res, (ra + 0.2) * 1000)); continue; }
    const e = new Error(j.description || "HTTP " + r.status); e.code = j.error_code; throw e;
  }
}

// ---------------- Firebase (bot o'z hisobi bilan) ----------------
let auth = null; // { id, uid, exp }
async function fbAuth(env) {
  if (auth && auth.exp > Date.now()) return auth;
  const pw = (await hmacHex(token(env), "botpw")).slice(0, 32);
  const call = (ep, body) => fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${ep}?key=${FB.apiKey}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
  let j = await call("signInWithPassword", { email: BOT_EMAIL, password: pw, returnSecureToken: true });
  if (!j.idToken && /EMAIL_NOT_FOUND/.test(JSON.stringify(j.error || ""))) j = await call("signUp", { email: BOT_EMAIL, password: pw, returnSecureToken: true });
  if (!j.idToken) throw new Error("Firebase: " + JSON.stringify(j.error || j));
  auth = { id: j.idToken, uid: j.localId, exp: Date.now() + (Number(j.expiresIn || 3600) - 300) * 1000 };
  return auth;
}
// Botning Firebase hisobiga admin huquqini ustoz konsolda beradi: admins/<uid> = true
async function db(env, method, path, body, query = "") {
  const a = await fbAuth(env);
  const r = await fetch(`${FB.db}/${path}.json?auth=${a.id}${query}`, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!r.ok) throw new Error(`DB ${method} ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}
const vals = o => Object.values(o || {}).filter(Boolean);
const sKey = s => String(s).replace(/[.#$\[\]\/]/g, "_");

// ---------------- Mini App initData tekshiruvi ----------------
async function verifyInit(env, initData) {
  if (!initData) throw new Error("Telegram ma’lumoti yo‘q");
  const p = new URLSearchParams(initData), hash = p.get("hash"); p.delete("hash");
  const dcs = [...p.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = await hmac(enc.encode("WebAppData"), token(env));
  if (hex(await hmac(new Uint8Array(secret), dcs)) !== hash) throw new Error("Telegram imzosi noto‘g‘ri");
  if (Date.now() / 1000 - Number(p.get("auth_date") || 0) > 7 * 86400) throw new Error("Sessiya eskirgan — botni qayta oching");
  return p.get("user") ? JSON.parse(p.get("user")) : null;
}
const need = u => { if (!u) throw new Error("Telegram foydalanuvchisi aniqlanmadi"); return u; };
const requireAdmin = u => { need(u); if (!isAdminTg(u)) throw new Error("Faqat ustoz uchun"); };

// Ko'p xabarni bo'lib yuborish: har chaqiruvda BATCH tadan, sayt navbatdagisini o'zi so'raydi
async function sendBatch(env, list, from, build) {
  from = Math.max(0, Number(from) || 0);
  const part = list.slice(from, from + BATCH);
  let sent = 0, failed = 0;
  for (const to of part) {
    try { await tg(env, "sendMessage", { chat_id: to.tgId, ...build(to) }); sent++; } catch (e) { failed++; }
  }
  const next = from + BATCH < list.length ? from + BATCH : null;
  return { sent, failed, next, total: list.length };
}
const students = async (env, grp) => vals(await db(env, "GET", "tg/u")).filter(r => !r.isAdmin && (!grp || grp === "*" || r.grp === grp)).sort((a, b) => a.tgId - b.tgId);
async function parentsList(env) {
  const out = [], all = await db(env, "GET", "tg/p") || {};
  Object.entries(all).forEach(([tgId, kids]) => Object.entries(kids || {}).forEach(([login, v]) => out.push({ tgId: Number(tgId), login, name: v && v.name })));
  return out.sort((a, b) => a.tgId - b.tgId || (a.login < b.login ? -1 : 1));
}

const FN = {
  // Telegram orqali kirish: har bir Telegram foydalanuvchisi uchun o'zgarmas, faqat server biladigan hisob
  async auth(env, input, u) {
    need(u);
    const k = await hmacHex(token(env), "acct:" + u.id);
    return { email: `tg${u.id}.${k.slice(0, 8)}@${DOMAIN}`, pw: k.slice(8, 40), login: "tg" + u.id, f: u.first_name || "", l: u.last_name || "", photo: u.photo_url || "" };
  },
  async link(env, input, u) {
    need(u);
    const login = String(input.login || "").toLowerCase().trim().slice(0, 40);
    if (!login) throw new Error("Login kerak");
    const admin = isAdminTg(u);
    await db(env, "PUT", "tg/u/" + u.id, { tgId: u.id, login, name: String(input.name || fullName(u)).slice(0, 80), grp: String(input.grp || "").slice(0, 40), isAdmin: admin, un: u.username || "", at: Date.now() });
    return { ok: true, admin };
  },
  async plink(env, input, u) {
    need(u);
    const r = await db(env, "GET", "tg/u/" + u.id);
    const login = String((r && r.login) || input.login || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!login) throw new Error("Avval platformaga kiring");
    return { url: `https://t.me/${BOT_NAME}?start=p_${login}_${await psig(env, login)}` };
  },
  async me(env, input, u) { if (!u) return null; const r = await db(env, "GET", "tg/u/" + u.id); return r ? { login: r.login, admin: !!r.isAdmin } : null; },
  async unlink(env, input, u) {
    if (!u) return { ok: false };
    const r = await db(env, "GET", "tg/u/" + u.id);
    if (r && r.isAdmin && !input.admin) return { ok: true };
    await db(env, "DELETE", "tg/u/" + u.id); return { ok: true };
  },
  async stats(env, input, u) {
    requireAdmin(u);
    const us = await students(env), ps = await parentsList(env), grp = {}, kids = new Set();
    us.forEach(r => { const g = r.grp || "—"; grp[g] = (grp[g] || 0) + 1; });
    ps.forEach(p => kids.add(p.login));
    const ar = vals(await db(env, "GET", "tg/ariza", undefined, '&orderBy=' + encodeURIComponent('"$key"') + '&limitToLast=5')).sort((a, b) => b.at - a.at);
    return { students: us.length, parents: ps.length, kids: kids.size, groups: grp, arizalar: ar };
  },
  async announce(env, input, u) {
    requireAdmin(u);
    const code = String(input.code || "").replace(/\D/g, "").slice(0, 4);
    const list = await students(env, String(input.grp || ""));
    const text = (input.team ? "👥 <b>Jamoaviy turnir!</b>" : "🏆 <b>Turnir boshlanmoqda!</b>") + "\n\n📚 " + esc(input.ttl || "") + "\n🔢 Kod: <b>" + code + "</b>" +
      (input.n ? "\n❓ " + (+input.n) + " ta savol" : "") + (input.dur ? " · ⏱ " + (+input.dur) + " daqiqa" : "") + "\n\nQo‘shilish uchun tugmani bosing 👇";
    return sendBatch(env, list, input.from, () => ({ text, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🏆 Turnirga kirish", url: appLink("turnir-" + code) }]] } }));
  },
  async notifyHw(env, input, u) {
    requireAdmin(u);
    const list = await students(env, String(input.grp || ""));
    const text = "📝 <b>Yangi uy vazifasi!</b>\n\n📚 " + esc(input.ttl || "") + "\n⏰ Muddat: <b>" + esc(input.due || "") + "</b>" + (input.note ? "\n💬 " + esc(input.note) : "") + "\n\nBajarish uchun tugmani bosing 👇";
    return sendBatch(env, list, input.from, () => ({ text, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "📝 Vazifani bajarish", url: appLink() }]] } }));
  },
  async broadcast(env, input, u) {
    requireAdmin(u);
    const to = String(input.to || "stu"), grp = String(input.grp || ""), msg = String(input.text || "").trim().slice(0, 3500);
    if (!msg) return { sent: 0, failed: 0, next: null };
    const stu = await students(env, grp), seen = new Set(), list = [];
    const add = id => { if (!seen.has(id)) { seen.add(id); list.push({ tgId: id }); } };
    if (to !== "par") stu.forEach(r => add(r.tgId));
    if (to !== "stu") { const logins = new Set(stu.map(r => r.login)); (await parentsList(env)).forEach(p => { if (!grp || logins.has(p.login)) add(p.tgId); }); }
    return sendBatch(env, list, input.from, () => ({ text: "📢 <b>Ustoz xabari</b>\n\n" + esc(msg), parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "📚 Platformani ochish", url: appLink() }]] } }));
  },
  async reports(env, input, u) {
    requireAdmin(u);
    const items = Array.isArray(input.items) ? input.items.slice(0, 2000) : [], by = {}, list = [];
    (await parentsList(env)).forEach(p => (by[p.login] = by[p.login] || []).push(p));
    items.forEach(it => (by[String(it.u || "").toLowerCase()] || []).forEach(p => list.push({ tgId: p.tgId, text: String(it.text || "").slice(0, 3500) })));
    const r = await sendBatch(env, list, input.from, to => ({ text: to.text, parse_mode: "HTML" }));
    r.parents = list.length; return r;
  },
};

// ---------------- Bot: xabarlar ----------------
function shareUrl() {
  const text = "📚 Tarixdan testlar, jonli turnirlar va o‘yinlar — ZULPANOV METHODS TARIX botiga qo‘shiling! Milliy sertifikatga birga tayyorlanamiz 👇";
  return "https://t.me/share/url?url=" + encodeURIComponent("https://t.me/" + BOT_NAME) + "&text=" + encodeURIComponent(text);
}
const mainKb = () => ({ inline_keyboard: [
  [{ text: "📚 Testlarni boshlash", url: appLink() }],
  [{ text: "🏆 Turnirga qo‘shilish", url: appLink("turnir") }],
  [{ text: "🎓 Darslar haqida", callback_data: "kurs" }, { text: "👨‍👩‍👧 Ota-onalar uchun", callback_data: "ota" }],
  [{ text: "📤 Do‘stlarga ulashish", url: shareUrl() }, { text: "📞 Ustozga yozish", url: CONTACT_URL }],
] });
const sendStart = (env, chat, first) => tg(env, "sendMessage", { chat_id: chat, parse_mode: "HTML", reply_markup: mainKb(),
  text: "👋 Assalomu alaykum, " + first + "!\n\n<b>ZULPANOV METHODS TARIX</b> — tarixni o‘yin va testlar bilan o‘rganing.\n\nBugun nima qilamiz? 👇" });
const sendKurs = (env, chat) => tg(env, "sendMessage", { chat_id: chat, parse_mode: "HTML", text: KURS_TEXT,
  reply_markup: { inline_keyboard: [[{ text: "✍️ Darslarga yozilish", callback_data: "yozil" }], [{ text: "📍 Xaritada ko‘rish", url: MAP_URL }, { text: "📞 Savol berish", url: CONTACT_URL }]] } });
async function sendYozil(env, chat, from) {
  await db(env, "PUT", "tg/st/" + from.id, "kurs");
  await tg(env, "sendMessage", { chat_id: chat, text: "✍️ Darslarga yozilish uchun pastdagi «📱 Raqamni yuborish» tugmasini bosing yoki telefon raqamingizni yozing.",
    reply_markup: { keyboard: [[{ text: "📱 Raqamni yuborish", request_contact: true }], [{ text: "❌ Bekor qilish" }]], resize_keyboard: true, one_time_keyboard: true } });
}
const sendOta = (env, chat) => tg(env, "sendMessage", { chat_id: chat, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "📞 Ustozga yozish", url: CONTACT_URL }]] },
  text: "👨‍👩‍👧 <b>Ota-onalar uchun</b>\n\nFarzandingizning test natijalari va ustoz xabarlarini shu bot orqali olib turishingiz mumkin:\n\n1️⃣ Farzandingiz platformada «Statistika» bo‘limini ochadi.\n2️⃣ «✈️ Ota-onamga yuborish» tugmasini bosib, havolani sizga yuboradi.\n3️⃣ Siz havolani bosasiz — tamom, ulandingiz ✅\n\nSavol bo‘lsa, ustozga yozing." });
const turnirMsg = (env, chat, code) => tg(env, "sendMessage", { chat_id: chat, text: "🏆 Turnir kodi: " + code + "\nQo‘shilish uchun tugmani bosing 👇",
  reply_markup: { inline_keyboard: [[{ text: "🏆 Turnirga kirish", url: appLink("turnir-" + code) }]] } });

async function adminChats(env) {
  const ids = new Set(), a = await db(env, "GET", "tg/adm").catch(() => null);
  if (a) ids.add(String(a));
  vals(await db(env, "GET", "tg/u").catch(() => null)).forEach(r => { if (r.isAdmin) ids.add(String(r.tgId)); });
  return [...ids];
}
async function kursDone(env, chat, from, phone) {
  await db(env, "DELETE", "tg/st/" + from.id);
  const name = fullName(from), at = Date.now();
  await db(env, "POST", "tg/ariza", { id: from.id, name, user: from.username || "", phone, at });
  const when = new Date(at + 5 * 3600e3).toISOString().replace(/^(\d+)-(\d+)-(\d+)T(\d+:\d+).*/, "$3.$2.$1 $4");
  const note = "🎓 <b>Darslarga yangi ariza!</b>\n\n👤 " + esc(name) + (from.username ? " (@" + esc(from.username) + ")" : "") + "\n📱 " + esc(phone) + "\n🕒 " + when;
  for (const id of await adminChats(env)) { try { await tg(env, "sendMessage", { chat_id: id, parse_mode: "HTML", text: note }); } catch (e) {} }
  await tg(env, "sendMessage", { chat_id: chat, text: "✅ Rahmat! Arizangiz qabul qilindi. Ustoz tez orada siz bilan bog‘lanadi.", reply_markup: { remove_keyboard: true } });
  await tg(env, "sendMessage", { chat_id: chat, text: "Shu orada platformada mashq qilib turing 👇", reply_markup: mainKb() });
}

async function onMessage(env, m) {
  if (!m || !m.chat || m.chat.type !== "private" || !m.from) return;
  const chat = m.chat.id, text = String(m.text || "").trim(), first = esc(m.from.first_name || "");
  if (isAdminTg(m.from)) await db(env, "PUT", "tg/adm", chat);
  if (m.contact) { const st = await db(env, "GET", "tg/st/" + m.from.id); if (st === "kurs") await kursDone(env, chat, m.from, m.contact.phone_number); return; }
  if (text && text[0] !== "/" && !/^\d{4}$/.test(text)) {
    const st = await db(env, "GET", "tg/st/" + m.from.id);
    if (st === "kurs") {
      if (text === "❌ Bekor qilish") { await db(env, "DELETE", "tg/st/" + m.from.id); await tg(env, "sendMessage", { chat_id: chat, text: "Bekor qilindi.", reply_markup: { remove_keyboard: true } }); return sendStart(env, chat, first); }
      const ph = text.replace(/[^\d+]/g, "");
      if (ph.replace(/\D/g, "").length >= 9) return kursDone(env, chat, m.from, ph);
      return tg(env, "sendMessage", { chat_id: chat, text: "Telefon raqamingizni yozing (masalan, +998 90 123 45 67) yoki «📱 Raqamni yuborish» tugmasini bosing." });
    }
  }
  if (text.startsWith("/start")) {
    const arg = text.split(/\s+/)[1] || "";
    if (arg.startsWith("p_")) {
      const raw = arg.slice(2).toLowerCase(), k = raw.lastIndexOf("_");
      const login = k > 0 ? raw.slice(0, k).replace(/[^a-z0-9_]/g, "") : "", sig = k > 0 ? raw.slice(k + 1) : "";
      if (!login || sig !== await psig(env, login))
        return tg(env, "sendMessage", { chat_id: chat, text: "⚠️ Bu havola eskirgan yoki noto‘g‘ri.\n\nFarzandingizdan yangi havola so‘rang: platforma → «Statistika» → «✈️ Ota-onamga yuborish»." });
      await db(env, "PUT", `tg/p/${m.from.id}/${sKey(login)}`, { name: fullName(m.from), at: Date.now() });
      const kid = vals(await db(env, "GET", "tg/u", undefined, '&orderBy=' + encodeURIComponent('"login"') + '&equalTo=' + encodeURIComponent(JSON.stringify(login))).catch(() => null))[0];
      return tg(env, "sendMessage", { chat_id: chat, parse_mode: "HTML",
        text: "✅ Assalomu alaykum, " + first + "!\n\nSiz <b>" + esc(kid && kid.name ? kid.name : "@" + login) + "</b>ning ota-onasi sifatida ulandingiz.\n\n📊 Farzandingizning test natijalari va ustoz xabarlari shu yerga keladi.",
        reply_markup: { inline_keyboard: [[{ text: "📚 Platformani ochish", url: appLink() }]] } });
    }
    if (/^turnir-\d{4}$/.test(arg)) return turnirMsg(env, chat, arg.slice(7));
    if (arg === "kurs") return sendKurs(env, chat);
    return sendStart(env, chat, first);
  }
  if (text === "/kurs") return sendKurs(env, chat);
  if (text === "/ota") return sendOta(env, chat);
  if (/^\d{4}$/.test(text)) return turnirMsg(env, chat, text);
  return tg(env, "sendMessage", { chat_id: chat, text: "Kerakli bo‘limni tanlang 👇\n\nSavollar bo‘yicha ustozga yozing: " + CONTACT, reply_markup: mainKb() });
}
async function onCallback(env, q) {
  if (!q || !q.from) return;
  tg(env, "answerCallbackQuery", { callback_query_id: q.id }).catch(() => {});
  const chat = q.message && q.message.chat && q.message.chat.id; if (!chat) return;
  if (q.data === "kurs") return sendKurs(env, chat);
  if (q.data === "yozil") return sendYozil(env, chat, q.from);
  if (q.data === "ota") return sendOta(env, chat);
}

// ---------------- Kirish nuqtasi ----------------
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" };
const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { "content-type": "application/json; charset=utf-8", ...CORS } });

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    if (url.pathname === "/api") {
      if (req.method !== "POST") return json({ ok: true, bot: "ZULPANOV METHODS TARIX" });
      try {
        const b = await req.json();
        if (!FN[b.fn]) return json({ ok: false, err: "Noma’lum amal" });
        const u = await verifyInit(env, b.initData);
        return json({ ok: true, r: await FN[b.fn](env, b.input || {}, u) });
      } catch (e) { return json({ ok: false, err: String((e && e.message) || e) }); }
    }

    if (req.method !== "POST") {
      let st = "✅";
      try { token(env); const a = await fbAuth(env); const adm = await db(env, "GET", "admins/" + a.uid).catch(() => null); st += `\nFirebase uid: ${a.uid}\nAdmin huquqi: ${adm === true ? "bor ✅" : "yo‘q ⚠️"}`; }
      catch (e) { st = "⚠️ " + ((e && e.message) || e); }
      return new Response("ZULPANOV TARIX bot " + st, { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    // Telegram webhook
    try { if ((req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "") !== await whSecret(env)) return new Response("forbidden", { status: 403 }); }
    catch (e) { return new Response("not configured", { status: 500 }); }
    const up = await req.json().catch(() => null);
    if (up) ctx.waitUntil((async () => {
      try { if (up.callback_query) await onCallback(env, up.callback_query); else await onMessage(env, up.message); }
      catch (e) { console.error("update", up.update_id, e && e.stack || e); }
    })());
    return new Response("ok");
  },
};
