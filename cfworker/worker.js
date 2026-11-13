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
const BOT_ABOUT = "Tarixdan 5 700+ test, Milliy sertifikat variantlari, turnir va duellar. Bir bosishda kirish. Muallif: Alimqul Zulpanov";
const BOT_DESC = `📚 ZULPANOV METHODS TARIX — tarixni test orqali o‘rganing!

✅ 5 700+ mavzulashgan test (5–11-sinf)
🎓 Milliy sertifikat namunasidagi variantlar
📅 Har kuni yangi «Kun testi»
🏆 Turnirlar, duellar, XP va reyting
👨‍👩‍👦 Ota-onalar natijani bot orqali kuzatadi

Login va parol kerak emas — «START» ni bosing va boshlang!`;
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
  if (!j.idToken && /EMAIL_NOT_FOUND|INVALID_LOGIN_CREDENTIALS/.test(JSON.stringify(j.error || ""))) j = await call("signUp", { email: BOT_EMAIL, password: pw, returnSecureToken: true });
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
// Firebase sessiyasini tekshirish (idToken → uid, email)
async function lookup(idToken) {
  const j = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FB.apiKey}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: String(idToken || "") }) }).then(r => r.json());
  const x = j.users && j.users[0]; if (!x) throw new Error("Sessiya topilmadi — qayta urinib ko‘ring");
  return { uid: x.localId, email: x.email || "" };
}
const acctKey = async (env, id) => await hmacHex(token(env), "acct:" + id);
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
    const k = await acctKey(env, u.id);
    const ln = await db(env, "GET", "tg/link/" + u.id).catch(() => null); // eski (login-parolli) hisobga ulangan bo'lsa
    return { email: ln && ln.email ? ln.email : `tg${u.id}.${k.slice(0, 8)}@${DOMAIN}`, pw: k.slice(8, 40), login: "tg" + u.id, linked: !!(ln && ln.email), f: u.first_name || "", l: u.last_name || "", photo: u.photo_url || "" };
  },
  // Eski login-parolli hisobni Telegram'ga ko'chirish: o'quvchi bir marta eski login-paroli bilan kirgan bo'lishi kerak
  async bindLegacy(env, input, u) {
    need(u);
    const a = await lookup(input.idToken);
    if (!a.email || /^tg\d+\./.test(a.email) || a.email === BOT_EMAIL) throw new Error("Bu hisobni ko‘chirib bo‘lmaydi");
    const ex = await db(env, "GET", "tg/link/" + u.id).catch(() => null);
    if (ex && ex.uid && ex.uid !== a.uid) throw new Error("Bu Telegram allaqachon boshqa hisobga ulangan");
    await db(env, "PUT", "tg/link/" + u.id, { email: a.email, uid: a.uid, at: Date.now() });
    return { pw: (await acctKey(env, u.id)).slice(8, 40) };
  },
  // Ustozning Telegram hisobiga admin huquqi
  async grantAdmin(env, input, u) {
    requireAdmin(u);
    const a = await lookup(input.idToken);
    await db(env, "PUT", "admins/" + a.uid, true);
    return { ok: true };
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
  async backup(env, input, u) { requireAdmin(u); return backup(env); },
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
    const code = String(input.code || "").replace(/\D/g, "").slice(0, 5), kt = code.length === 5, to = String(input.to || "");
    let list = await students(env, to === "all" || to === "center" ? "" : String(input.grp || ""));
    if (to === "center") list = list.filter(r => r.grp);
    const kind = String(input.kind || (input.team ? "team" : kt ? "kt" : "turnir"));
    const head = { team: "👥 <b>Jamoaviy turnir!</b>", kt: "🏟 <b>Katta turnir!</b>", boss: "🏰 <b>Boss jangi!</b>" }[kind] || "🏆 <b>Turnir boshlanmoqda!</b>";
    const text = head + "\n\n📚 " + esc(input.ttl || "") + "\n🔢 Kod: <b>" + code + "</b>" +
      (input.n ? "\n❓ " + (+input.n) + " ta savol" : "") + (input.dur ? " · ⏱ " + (+input.dur) + " daqiqa" : "") + "\n\nQo‘shilish uchun tugmani bosing 👇";
    return sendBatch(env, list, input.from, () => ({ text, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🚀 Kirish", url: appLink((kt ? "kt-" : "turnir-") + code) }]] } }));
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
  reply_markup: { inline_keyboard: [[{ text: "🏆 Turnirga kirish", url: appLink((code.length === 5 ? "kt-" : "turnir-") + code) }]] } });

async function adminChats(env) {
  const ids = new Set(), a = await db(env, "GET", "tg/adm").catch(() => null);
  if (a) ids.add(String(a));
  vals(await db(env, "GET", "tg/u").catch(() => null)).forEach(r => { if (r.isAdmin) ids.add(String(r.tgId)); });
  return [...ids];
}
// Zaxira: butun bazani JSON fayl qilib ustozning Telegramiga yuborish (har yakshanba va admin paneldan)
async function backup(env) {
  const data = await db(env, "GET", "");
  const day = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
  const json = JSON.stringify(data), kb = Math.round(json.length / 1024);
  const users = Object.keys((data && data.users) || {}).length, res = Object.keys((data && data.r) || {}).length;
  const chats = await adminChats(env); let sent = 0;
  for (const chat of chats) {
    const fd = new FormData();
    fd.append("chat_id", chat);
    fd.append("caption", `📦 Zaxira · ${day}\n👥 Foydalanuvchilar: ${users}\n📝 Natijalar: ${res}\n💾 ${kb} KB\n\nBu faylni saqlab qo'ying. Kerak bo'lsa, u orqali barcha ma'lumotni tiklash mumkin.`);
    fd.append("document", new Blob([json], { type: "application/json" }), `zulpanov-tarix-zaxira-${day}.json`);
    const r = await fetch(`https://api.telegram.org/bot${token(env)}/sendDocument`, { method: "POST", body: fd }).then(x => x.json()).catch(() => ({}));
    if (r.ok) sent++;
  }
  return { sent, kb, users, res };
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
  if (/^\d{4,5}$/.test(text)) return turnirMsg(env, chat, text);
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


// ---------------- Natijalarni serverda tekshirish ----------------
// Sayt javoblarni yuboradi, server kalit bilan solishtirib ballni o'zi hisoblaydi va
// h/<uid> (o'quvchi tarixi), r/<id> (ustoz statistikasi), lb/<hafta>/<uid> (haftalik reyting) ga yozadi.
const KEY_URL = "https://raw.githubusercontent.com/zulpanov/Zulpanov-tarix/main/data/key/"; // GitHub Actions har o'zgarishda yangilaydi
const LEVELS = [0, 300, 800, 1600, 3000, 5000];
const keyCache = new Map(); // setId -> { t, v }
async function shard(env, id) {
  const c = keyCache.get(id); if (c && Date.now() - c.t < 300e3) return c.v;
  let v = null;
  const m = id.match(/^c_([A-Za-z0-9]+)$/);
  if (m) { // ustoz admin panelda qo'shgan test
    const x = await db(env, "GET", "cq/" + m[1]).catch(() => null);
    if (x && x.qs) { v = { c: {} }; vals(x.qs).forEach(q => { if (q && q.o && q.o.length === 4) v.c[String(q.k || "")] = q.o[+q.a || 0]; }); }
  } else if (/^[A-Za-z0-9_-]{1,40}$/.test(id)) {
    const r = await fetch(KEY_URL + id + ".json", { cf: { cacheTtlByStatus: { "200-299": 300, "404": 30, "500-599": 0 } } });
    if (r.ok) v = await r.json(); else if (r.status !== 404) throw new Error("Javob kaliti yuklanmadi");
  }
  keyCache.set(id, { t: Date.now(), v }); if (keyCache.size > 300) keyCache.delete(keyCache.keys().next().value);
  return v;
}
const norm = s => String(s || "").toLowerCase().replace(/[ʻʼ'`‘’"«»]/g, "").replace(/[–—−]/g, "-").replace(/\b(asrlar|asr|yillar|yil|ta)\b/g, "").replace(/[\s.,;:!?()]/g, "").replace(/x/g, "h");
function lev(a, b) { const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
// yozma javob: raqamlar aniq mos kelishi, matn esa kamida 60% o'xshash bo'lishi kerak
const nums = s => (String(s || "").match(/\d+(?:[.,]\d+)?/g) || []).map(x => parseFloat(x.replace(",", ".")));
const letters = s => norm(String(s || "").replace(/\d+(?:[.,]\d+)?/g, " ")).replace(/-/g, "");
const sim = (x, y) => { const m = Math.max(x.length, y.length); return m ? 1 - lev(x, y) / m : 1; };
const GEN = /^(sessiya|yil|asr|ta|marta|nafar|foiz|kishi|kun|oy|mln|million|milliard|mlrd)/;
function check1(v, a) {
  const nv = nums(v), na = nums(a);
  if (na.length) {
    const lv = letters(v), la = letters(a);
    if (!nv.length && la.length >= 4 && !GEN.test(la)) return sim(norm(v), norm(a)) >= 0.6; // masalan: COVID-19, Minsk-2
    if (nv.length !== na.length || nv.some((x, i) => x !== na[i])) return false;
    if (!lv) return !la || GEN.test(la);
    if (!la) return true;
    return sim(lv, la) >= 0.6 || (lv.length >= 3 && (la.includes(lv) || lv.includes(la)));
  }
  if (nv.length) return false;
  const x = norm(v), y = norm(a);
  if (!x || !y) return false;
  if (x === y) return true;
  const sx = norm(String(v).split(/\s+va\s+|,/).map(t => t.trim()).sort().join(" ")), sy = norm(String(a).split(/\s+va\s+|,/).map(t => t.trim()).sort().join(" "));
  return sim(x, y) >= 0.6 || sim(sx, sy) >= 0.6;
}
function check(v, acc) { if (!String(v || "").trim()) return false; return acc.some(a => check1(v, a)); }

const lvOf = p => p >= 70 ? "A+" : p >= 65 ? "A" : p >= 60 ? "B+" : p >= 55 ? "B" : p >= 50 ? "C+" : p >= 45 ? "C" : "";
const xpOf = r => (r.ok || 0) * 10 + (r.lv ? 20 : 0) + (r.mode === "turnir" ? (r.rank === 1 ? 50 : r.rank === 2 ? 30 : r.rank === 3 ? 20 : 0) : 0);
const UZ = 5 * 3600e3; // Toshkent vaqti
function weekStart(ms) { const d = new Date(ms + UZ), w = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - w) - UZ; }
const weekKey = ms => { const d = new Date(weekStart(ms) + UZ); return "w" + d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, "0") + String(d.getUTCDate()).padStart(2, "0"); };
const str = (v, n) => String(v == null ? "" : v).slice(0, n);

async function syncLb(env, uid, user) {
  user = user || await db(env, "GET", "users/" + uid) || {};
  const rs = vals(await db(env, "GET", "h/" + uid));
  const now = Date.now(), ws = weekStart(now);
  const xp = rs.reduce((a, r) => a + xpOf(r), 0) + (Number(user.bx) || 0), wxp = rs.filter(r => r.at >= ws).reduce((a, r) => a + xpOf(r), 0);
  let lv = 0; LEVELS.forEach((t, i) => { if (xp >= t) lv = i; });
  if (wxp > 0) await db(env, "PUT", `lb/${weekKey(now)}/${uid}`, { n: str((user.f || "") + " " + (user.l || ""), 80).trim(), g: str(user.g, 30), xp: wxp, lv, at: now });
  return { xp, wxp, lv };
}

async function grade(env, i) {
  if (i.ms) { // Milliy sertifikat: 32 yopiq + 3 moslashtirish + 20 yozma = 55
    const K = await shard(env, str(i.set, 40)); if (!K || !K.ms) throw new Error("Variant kaliti topilmadi");
    const M = K.ms, m = Array.isArray(i.m) ? i.m : [], x = Array.isArray(i.x) ? i.x : [], w = Array.isArray(i.w) ? i.w : [];
    const a = M.m.filter((c, j) => m[j] != null && String(m[j]) === c).length, b = M.x.filter((c, j) => x[j] === c).length;
    let c = 0; M.w.forEach((pr, j) => pr.forEach((acc, k) => { if (check(str((w[j] || [])[k], 200), acc)) c++; }));
    return { ok: a + b + c, tot: 55, sec: { "1–32. Yopiq testlar": [a, 32], "33–35. Moslashtirish": [b, 3], "36–45. Yozma javoblar": [c, 20] } };
  }
  const items = Array.isArray(i.items) ? i.items.slice(0, 80) : [];
  if (!items.length) throw new Error("Javoblar yo‘q");
  const seen = new Set(), need = new Set();
  items.forEach(it => { const k = str(it && it[0], 80); if (seen.has(k)) throw new Error("Takroriy savol"); seen.add(k); const m = k.match(/^(c_[A-Za-z0-9]+)_|^(.+)_\d+$/); if (m) need.add(m[1] || m[2]); });
  if (need.size > 30) throw new Error("Juda ko‘p to‘plam");
  const keys = {}; for (const id of need) { keys[id] = await shard(env, id); if (!keys[id]) throw new Error("Javob kaliti hali tayyor emas: " + id); }
  let ok = 0;
  items.forEach(([k, c]) => {
    k = str(k, 80); if (c == null) return;
    const mc = k.match(/^(c_[A-Za-z0-9]+)_(.*)$/);
    const right = mc ? (keys[mc[1]].c || {})[mc[2]] : (() => { const m = k.match(/^(.+)_(\d+)$/); return m ? (keys[m[1]].q || [])[+m[2]] : null; })();
    if (right != null && String(c) === right) ok++;
  });
  return { ok, tot: items.length };
}

async function saveRes(env, uid, user, g, info) {
  const pts = Math.round(g.ok * 100 / g.tot), lv = lvOf(pts), at = Date.now();
  const id = at.toString(36) + Math.random().toString(36).slice(2, 6);
  const h = { ttl: str(info.ttl, 100), mode: "test", ok: g.ok, tot: g.tot, pts, lv, at, v: 1 }; if (info.hw) h.hw = str(info.hw, 40);
  await db(env, "PUT", `h/${uid}/${id}`, h);
  const s0 = g.sec || null, sec = s0 ? Object.fromEntries(Object.entries(s0).slice(0, 30).map(([k, v]) => [sKey(k).slice(0, 60), Array.isArray(v) ? v.slice(0, 2).map(Number) : 0])) : undefined;
  await db(env, "PUT", "r/" + id, { ...h, n: str(((user.f || "") + " " + (user.l || "")).trim() || info.n, 80), u: str(user.login, 40), set: str(info.set, 40), dur: info.dur || 0, ...(info.code ? { code: info.code } : {}), ...(sec ? { sec } : {}) }).catch(() => {});
  if (user.f) { const o = user.rs || {}; await db(env, "PUT", `users/${uid}/rs`, { n: (o.n || 0) + 1, s: (o.s || 0) + pts, last: at }).catch(() => {}); }
  const x = await syncLb(env, uid, user).catch(() => null);
  return { id, ok: g.ok, tot: g.tot, pts, lv, ...(x || {}) };
}
const VFN = {
  async res(env, uid, i) {
    const g = await grade(env, i);
    const dur = Math.max(0, Number(i.dur) || 0);
    if (dur && dur < g.tot * 700) throw new Error("Juda tez yakunlandi — natija qabul qilinmadi");
    if (!g.sec && i.sec && typeof i.sec === "object") g.sec = i.sec;
    const user = await db(env, "GET", "users/" + uid) || {};
    return saveRes(env, uid, user, g, { ttl: i.ttl, hw: i.hw, set: i.set, n: i.n, dur });
  },
  async lb(env, uid) { return syncLb(env, uid); },
  // Katta turnir: o'quvchi testni ulanmasdan ishlaydi, oxirida bitta so'rov yuboradi
  async kt(env, uid, i) {
    const code = str(i.code, 6); if (!/^\d{5}$/.test(code)) throw new Error("Kod noto‘g‘ri");
    const m = await db(env, "GET", `kt/${code}/meta`); if (!m) throw new Error("Turnir topilmadi");
    const now = Date.now();
    if (!m.startAt || now < m.startAt - 5000) throw new Error("Turnir hali boshlanmagan");
    if (now > m.startAt + m.dur + 120e3) throw new Error("Vaqt tugagan — natija qabul qilinmadi");
    if (await db(env, "GET", `kt/${code}/r/${uid}`)) throw new Error("Natijangiz allaqachon qabul qilingan");
    const items = Array.isArray(i.items) ? i.items : [], sets = new Set(m.sets || []);
    if (!items.length || items.length > (m.n || 0)) throw new Error("Savollar soni mos emas");
    items.forEach(it => { const k = str(it && it[0], 80), mm = k.match(/^(c_[A-Za-z0-9]+)_|^(.+)_\d+$/); if (!mm || !sets.has(mm[1] || mm[2])) throw new Error("Bu savol turnirga tegishli emas"); });
    const g = await grade(env, { items }); g.tot = m.n;
    const user = await db(env, "GET", "users/" + uid) || {};
    const t = Math.max(0, Math.min(m.dur, now - m.startAt)), pts = Math.round(g.ok * 100 / g.tot);
    await db(env, "PUT", `kt/${code}/r/${uid}`, { n: str(((user.f || "") + " " + (user.l || "")).trim() || "O‘quvchi", 80), g: str(user.g, 30), ok: g.ok, tot: g.tot, pts, t, at: now });
    await saveRes(env, uid, user, g, { ttl: "🏟 " + str(m.ttl, 90), set: "kt", dur: t, code });
    return { ok: g.ok, tot: g.tot, pts };
  },
};

// ---------------- Kirish nuqtasi ----------------
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" };
const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { "content-type": "application/json; charset=utf-8", ...CORS } });

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(backup(env).catch(e => console.error("backup", e && e.stack || e))); },
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

    if (url.pathname === "/v") { // sayt (Telegram ichida ham, brauzerda ham) — Firebase sessiyasi bilan
      if (req.method !== "POST") return json({ ok: true });
      try {
        const b = await req.json();
        if (!VFN[b.fn]) return json({ ok: false, err: "Noma’lum amal" });
        const a = await lookup(b.idToken);
        if (a.email === BOT_EMAIL) throw new Error("Ruxsat yo‘q");
        return json({ ok: true, r: await VFN[b.fn](env, a.uid, b.input || {}) });
      } catch (e) { return json({ ok: false, err: String((e && e.message) || e) }); }
    }

    if (req.method === "GET" && url.searchParams.get("setup") === "1") { // bot tavsifi (About va Description)
      try { await tg(env, "setMyShortDescription", { short_description: BOT_ABOUT }); await tg(env, "setMyDescription", { description: BOT_DESC }); return new Response("✅ Bot tavsifi yangilandi", { headers: { "content-type": "text/plain; charset=utf-8" } }); }
      catch (e) { return new Response("⚠️ " + ((e && e.message) || e), { headers: { "content-type": "text/plain; charset=utf-8" } }); }
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
