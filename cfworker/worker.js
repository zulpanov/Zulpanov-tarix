// TARIX ARENA — Telegram bot serveri (Cloudflare Worker)
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
const BOT_NAME = "tarix_arena_bot";
const OLD_BOT_NAME = "alimqul_tarix_testbot";      // eski bot: OLD_BOT_TOKEN qo'yilsa, foydalanuvchilarni yangi botga yo'naltiradi
const SITE = "https://tarixarena.uz/";
const ADMIN_TG = ["zulpanov_methods"];            // ustozning Telegram username'i (kichik harflarda)
const CONTACT = "@ZULPANOV_METHODS";
const CONTACT_URL = "https://t.me/ZULPANOV_METHODS";
const MAP_URL = "https://maps.app.goo.gl/dxLox5nZ6H4HQn6y5";
const BOT_ABOUT = "Tarixdan 5 700+ test, Milliy sertifikat variantlari, turnir va duellar. Bir bosishda kirish. Muallif: Alimqul Zulpanov";
const BOT_DESC = `🏛 TARIX ARENA — tarixni o‘yin va testlar bilan o‘rganing!

✅ 5 700+ mavzulashgan test (5–11-sinf)
🎓 Milliy sertifikat namunasidagi variantlar
📅 Har kuni yangi «Kun testi»
🏆 Turnirlar, duellar, XP va reyting
👨‍👩‍👦 Ota-onalar natijani bot orqali kuzatadi

Login va parol kerak emas — «START» ni bosing va boshlang!

Muallif: Alimqul Zulpanov`;
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
const tokOf = v => { const m = String(v || "").trim().match(/\d{5,}:[A-Za-z0-9_-]{30,}/); return m ? m[0] : null; };
const token = env => { const t = tokOf(env.BOT_TOKEN); if (!t) throw new Error("BOT_TOKEN sozlanmagan"); return t; };
const oldToken = env => { const t = tokOf(env.OLD_BOT_TOKEN); return t && t !== tokOf(env.BOT_TOKEN) ? t : null; };
const whSecretOf = async t => (await hmacHex(t, "wh")).slice(0, 32);
const whSecret = async env => whSecretOf(token(env));
// Imzolar (ota-ona havolalari) eski token bilan qoladi — bot almashganda eski havolalar buzilmasin
// Barqaror kalit: bot almashganda ham eski token bilan qoladi (bot paroli, akkaunt kalitlari, ota-ona havolalari)
const sigTok = env => oldToken(env) || token(env);
const psig = async (env, login) => (await hmacHex(sigTok(env), "p:" + login)).slice(0, 10);

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
  const pw = (await hmacHex(sigTok(env), "botpw")).slice(0, 32);
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
  let okSig = false;
  for (const t of [token(env), oldToken(env)].filter(Boolean)) { const secret = await hmac(enc.encode("WebAppData"), t); if (hex(await hmac(new Uint8Array(secret), dcs)) === hash) { okSig = true; break; } }
  if (!okSig) throw new Error("Telegram imzosi noto‘g‘ri");
  if (Date.now() / 1000 - Number(p.get("auth_date") || 0) > 7 * 86400) throw new Error("Sessiya eskirgan — botni qayta oching");
  return p.get("user") ? JSON.parse(p.get("user")) : null;
}
// ---------------- Firebase xizmat hisobi (FIREBASE_SA): bir martalik kirish kaliti va parolni yangilash ----------------
let saTok = null, saK = null;
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uS = str => b64u(enc.encode(str));
async function saKey(env) {
  if (saK) return saK;
  let sa = null; try { sa = JSON.parse(env.FIREBASE_SA || "null"); } catch (e) {}
  if (!sa || !sa.private_key || !sa.client_email) throw new Error("Server sozlanmagan (FIREBASE_SA)");
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  return (saK = { sa, key });
}
async function jwt(key, payload) { const h = b64uS(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." + b64uS(JSON.stringify(payload)); return h + "." + b64u(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(h))); }
async function customToken(env, uid) {
  const { sa, key } = await saKey(env), now = Math.floor(Date.now() / 1000);
  return jwt(key, { iss: sa.client_email, sub: sa.client_email, aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit", iat: now, exp: now + 3600, uid: String(uid) });
}
async function saAccess(env) {
  if (saTok && saTok.exp > Date.now()) return saTok.t;
  const { sa, key } = await saKey(env), now = Math.floor(Date.now() / 1000);
  const a = await jwt(key, { iss: sa.client_email, scope: "https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const j = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" + a }).then(r => r.json());
  if (!j.access_token) throw new Error("Xizmat kaliti ishlamadi");
  saTok = { t: j.access_token, exp: Date.now() + 3000e3 }; return saTok.t;
}
async function adminSetPw(env, uid, password) {
  const t = await saAccess(env), { sa } = await saKey(env);
  const j = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}/accounts:update`, { method: "POST", headers: { authorization: "Bearer " + t, "content-type": "application/json" }, body: JSON.stringify({ localId: uid, password }) }).then(r => r.json());
  if (j.error) throw new Error("Parolni yangilab bo‘lmadi: " + j.error.message);
}
// Sayt paroli (botdan kelganlar uchun qo'shimcha login): PBKDF2 xeshi faqat serverda (tg/sp — faqat admin/bot o'qiydi)
async function pwHash(pw, salt) {
  const k = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 100000 }, k, 256));
}
const LOGIN_RE = /^[a-z0-9_]{3,20}$/, RESERVED = ["zulpanov", "admin", "ustoz", "administrator", "bot"];
const checkLogin = l => { if (!LOGIN_RE.test(l)) throw new Error("Login 3–20 ta lotin harfi, raqam yoki _ belgisidan iborat bo‘lsin"); if (RESERVED.includes(l) || /^tg\d+$/.test(l)) throw new Error("Bu login band. Boshqasini tanlang"); };
async function saveSitePw(env, uid, login, pw) {
  if (String(pw || "").length < 6) throw new Error("Parol kamida 6 belgidan iborat bo‘lsin");
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  await db(env, "PUT", "tg/sp/" + login, { uid, s: salt, h: await pwHash(pw, salt), at: Date.now() });
}
// ---------------- 💳 Premium to'lovi: o'quvchi chek yuboradi → ustozga Telegram'da bir bosishda tasdiqlash ----------------
const PAY_DAY = 864e5;
const fmtD = ms => { const d = new Date(ms + 5 * 3600e3), z = n => String(n).padStart(2, "0"); return `${z(d.getUTCDate())}.${z(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`; };
const hesc = s => String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
async function tariffs(env) { const c = await db(env, "GET", "c/pm/tar").catch(() => null); return (Array.isArray(c) ? c : Object.values(c || {})).filter(t => t && t.n && +t.d > 0); }
async function studentChat(env, uid) {
  const t = await db(env, "GET", "tg/tgu/" + uid).catch(() => null); if (t) return Number(t);
  const r = await db(env, "GET", "users/" + uid + "/login").catch(() => null), m = /^tg(\d+)$/.exec(String(r || ""));
  return m ? Number(m[1]) : null;
}
function payCaption(x, extra) {
  return `💳 <b>Yangi to‘lov</b>\n👤 ${hesc(((x.f || "") + " " + (x.l || "")).trim())}${x.g ? " · " + hesc(x.g) : ""}\n🔑 ${hesc(x.login || "")}\n💎 ${hesc(x.tn || "")} — ${hesc(x.p || "")}\n🕐 ${fmtD(x.at)} ${new Date(x.at + 5 * 3600e3).toISOString().slice(11, 16)}` + (extra ? "\n\n" + extra : "");
}
async function payNotify(env, id) {
  const x = await db(env, "GET", "pay/" + id); if (!x || x.st !== "new") return;
  const T = await tariffs(env), kb = [];
  const main = T.find(t => +t.d === +x.d); if (main) kb.push([{ text: `✅ ${main.n} berish`, callback_data: `py:o:${id}:${main.d}` }]);
  const other = T.filter(t => +t.d !== +x.d).map(t => ({ text: `✅ ${t.n}`, callback_data: `py:o:${id}:${t.d}` })); if (other.length) kb.push(other.slice(0, 3));
  kb.push([{ text: "❌ Summa kam", callback_data: `py:n:${id}:sum` }, { text: "❌ Chek noto‘g‘ri", callback_data: `py:n:${id}:bad` }]);
  const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(String(x.img || "")); const sent = [];
  for (const chat of await adminChats(env)) {
    try {
      let r;
      if (m) {
        const bin = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0)), fd = new FormData();
        fd.append("chat_id", chat); fd.append("caption", payCaption(x)); fd.append("parse_mode", "HTML"); fd.append("reply_markup", JSON.stringify({ inline_keyboard: kb }));
        fd.append("photo", new Blob([bin], { type: m[1] }), "chek.jpg");
        const j = await fetch(`https://api.telegram.org/bot${token(env)}/sendPhoto`, { method: "POST", body: fd }).then(r => r.json()); r = j.ok ? j.result : null;
      } else r = await tg(env, "sendMessage", { chat_id: chat, parse_mode: "HTML", text: payCaption(x, "⚠️ Chek rasmi yo‘q"), reply_markup: { inline_keyboard: kb } });
      if (r) sent.push({ c: chat, m: r.message_id, ph: !!m });
    } catch (e) {}
  }
  if (sent.length) await db(env, "PATCH", "pay/" + id, { msg: sent }).catch(() => {});
}
const WHY = { sum: "To‘langan summa tarif narxidan kam", bad: "Chek noto‘g‘ri yoki o‘qib bo‘lmadi" };
async function payAct(env, id, ok, val, by) {
  const x = await db(env, "GET", "pay/" + id); if (!x) throw new Error("To‘lov topilmadi");
  if (x.st !== "new") return { already: x.st };
  let res = "";
  if (ok) {
    const d = Math.max(1, Math.min(400, +val || +x.d || 30)), cur = await db(env, "GET", "pm/" + x.uid).catch(() => null);
    const e = Math.max(Date.now(), (cur && cur.e) || 0) + d * PAY_DAY;
    await db(env, "PUT", "pm/" + x.uid, { e, src: "pay", at: Date.now() });
    await db(env, "PATCH", "pay/" + id, { st: "ok", gd: d, e, by: by || "", dt: Date.now() });
    res = `✅ Tasdiqlandi — Premium ${fmtD(e)} gacha (${d} kun)`;
    const ch = await studentChat(env, x.uid);
    if (ch) await tg(env, "sendMessage", { chat_id: ch, parse_mode: "HTML", text: `🎉 <b>Premium yoqildi!</b>\n\n💎 ${d} kun · <b>${fmtD(e)}</b> gacha.\nBarcha mavzu va o‘yinlar ochildi. Omad! 🚀`, reply_markup: { inline_keyboard: [[{ text: "🚀 Platformani ochish", url: appLink("") }]] } }).catch(() => {});
  } else {
    const why = WHY[val] || String(val || "Rad etildi").slice(0, 120);
    await db(env, "PATCH", "pay/" + id, { st: "no", why, by: by || "", dt: Date.now() });
    res = "❌ Rad etildi — " + why;
    const ch = await studentChat(env, x.uid);
    if (ch) await tg(env, "sendMessage", { chat_id: ch, parse_mode: "HTML", text: `⚠️ <b>To‘lov tasdiqlanmadi</b>\nSabab: ${hesc(why)}.\n\nPlatformada Premium sahifasidan chekni qayta yuborishingiz mumkin yoki ustozga yozing: ${CONTACT}` }).catch(() => {});
  }
  for (const s of (Array.isArray(x.msg) ? x.msg : [])) {
    try {
      const body = { chat_id: s.c, message_id: s.m, parse_mode: "HTML", reply_markup: { inline_keyboard: [] } };
      if (s.ph) await tg(env, "editMessageCaption", { ...body, caption: payCaption(x, res) }); else await tg(env, "editMessageText", { ...body, text: payCaption(x, res) });
    } catch (e) {}
  }
  return { ok: true, res };
}
// Saytdagi «Telegram orqali kirish» (Login Widget) imzosi: secret = SHA256(bot token)
async function verifyWidget(env, d) {
  if (!d || typeof d !== "object" || !d.hash || !d.id) throw new Error("Telegram ma’lumoti yo‘q");
  const dcs = Object.keys(d).filter(k => k !== "hash" && d[k] != null).sort().map(k => `${k}=${d[k]}`).join("\n");
  let okSig = false;
  for (const t of [token(env), oldToken(env)].filter(Boolean)) { const secret = await crypto.subtle.digest("SHA-256", enc.encode(t)); if (hex(await hmac(new Uint8Array(secret), dcs)) === String(d.hash)) { okSig = true; break; } }
  if (!okSig) throw new Error("Telegram imzosi noto‘g‘ri");
  if (Date.now() / 1000 - Number(d.auth_date || 0) > 86400) throw new Error("Kirish muddati o‘tgan — qayta urinib ko‘ring");
  return { id: Number(d.id), first_name: d.first_name || "", last_name: d.last_name || "", username: d.username || "", photo_url: d.photo_url || "" };
}
// Firebase sessiyasini tekshirish (idToken → uid, email)
async function lookup(idToken) {
  const j = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FB.apiKey}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: String(idToken || "") }) }).then(r => r.json());
  const x = j.users && j.users[0]; if (!x) throw new Error("Sessiya topilmadi — qayta urinib ko‘ring");
  return { uid: x.localId, email: x.email || "" };
}
const acctKey = async (env, id) => await hmacHex(sigTok(env), "acct:" + id);
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
// 👋 Xush kelibsiz xabari (matnni admin panelda o'zgartirish mumkin: c/wel)
const DEF_WEL = "🎉 Assalomu alaykum, {ism}!\n\nTARIX ARENA’ga xush kelibsiz! Bu yerda 5 700+ test, Kun testi, turnirlar va tarixiy o‘yinlar sizni kutmoqda.\n\n👉 Har kuni «Kun testi»ni ishlang — XP to‘plang va reytingda ko‘tariling!\n\nSavollar bo‘lsa, bemalol yozing. Omad! 🚀";
async function sendWel(env, list, from) {
  const c = await db(env, "GET", "c/wel").catch(() => null), tpl = String((c && c.t) || DEF_WEL);
  const r = await sendBatch(env, list, from, to => ({ text: esc(tpl).replace(/\{ism\}/g, "<b>" + esc(String(to.name || "do‘stim").slice(0, 40)) + "</b>"), parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "📅 Kun testini ishlash", url: appLink() }]] } }));
  const f = Math.max(0, Number(from) || 0), m = {}; list.slice(f, f + BATCH).forEach(t => m[t.tgId] = Date.now());
  if (Object.keys(m).length) await db(env, "PATCH", "tg/w", m).catch(() => {});
  return r;
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
    if (ln && ln.ct && ln.uid) return { token: await customToken(env, ln.uid), login: "tg" + u.id, linked: true, f: u.first_name || "", l: u.last_name || "", photo: u.photo_url || "" };
    return { email: ln && ln.email ? ln.email : `tg${u.id}.${k.slice(0, 8)}@${DOMAIN}`, pw: k.slice(8, 40), login: "tg" + u.id, linked: !!(ln && ln.email), f: u.first_name || "", l: u.last_name || "", photo: u.photo_url || "" };
  },
  // Eski login-parolli hisobni Telegram'ga ko'chirish: o'quvchi bir marta eski login-paroli bilan kirgan bo'lishi kerak
  async bindLegacy(env, input, u) {
    need(u);
    const a = await lookup(input.idToken);
    if (!a.email || /^tg\d+\./.test(a.email) || a.email === BOT_EMAIL) throw new Error("Bu hisobni ko‘chirib bo‘lmaydi");
    const ex = await db(env, "GET", "tg/link/" + u.id).catch(() => null);
    if (ex && ex.uid && ex.uid !== a.uid) throw new Error("Bu Telegram allaqachon boshqa hisobga ulangan");
    const own = await db(env, "GET", "logins/tg" + u.id).catch(() => null);
    if (own && own !== a.uid) throw new Error("Bu Telegram bilan alohida hisob ochilgan. Ikki hisobni birlashtirish uchun ustozga murojaat qiling");
    await db(env, "PUT", "tg/link/" + u.id, { email: a.email, uid: a.uid, ct: 1, at: Date.now() });
    await db(env, "PUT", "tg/tgu/" + a.uid, u.id);
    try { await customToken(env, a.uid); } catch (e) { await db(env, "DELETE", "tg/link/" + u.id); throw e; } // kalit ishlamasa — eski holat qoladi
    return { ct: 1 };
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
  // 👨‍🏫 Ustozlik arizasi: bosh admin Telegramiga tasdiqlash tugmalari bilan
  async tchApply(env, input, u) {
    need(u); const uid = String(input.uid || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 40); if (!uid) throw new Error("uid yo‘q");
    const ap = await db(env, "GET", "tapp/" + uid); if (!ap || !ap.n) throw new Error("Ariza topilmadi");
    const adm = await db(env, "GET", "tg/adm").catch(() => null); if (!adm) return { sent: 0 };
    await tg(env, "sendMessage", { chat_id: adm, parse_mode: "HTML",
      text: `👨‍🏫 <b>Yangi ustozlik arizasi</b>\n\n👤 ${esc(ap.n)}\n🏫 ${esc(ap.org || "")}\n📞 ${esc(ap.ph || "")}` + (u.username ? `\n✈️ @${esc(u.username)}` : ""),
      reply_markup: { inline_keyboard: [[{ text: "✅ Tasdiqlash", callback_data: `tok:${uid}:${u.id}` }, { text: "❌ Rad etish", callback_data: `tno:${uid}:${u.id}` }]] } });
    return { sent: 1 };
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
    // logins — aniq o'quvchilar ro'yxati (sayt hozirgi guruh bo'yicha hisoblaydi); bo'lmasa — grp bo'yicha
    const lg = Array.isArray(input.logins) ? new Set(input.logins.slice(0, 5000).map(x => String(x).toLowerCase())) : null;
    let stu = await students(env, lg ? "" : grp); if (lg) stu = stu.filter(r => lg.has(String(r.login || "").toLowerCase()));
    const seen = new Set(), list = [];
    const add = id => { if (!seen.has(id)) { seen.add(id); list.push({ tgId: id }); } };
    if (to !== "par") stu.forEach(r => add(r.tgId));
    if (to !== "stu") { const logins = new Set(stu.map(r => String(r.login || "").toLowerCase())); (await parentsList(env)).forEach(p => { const l = String(p.login || "").toLowerCase(); if (lg ? lg.has(l) : (!grp || logins.has(l))) add(p.tgId); }); }
    const envS = input.old && oldToken(env) ? { ...env, BOT_TOKEN: oldToken(env) } : env;
    return sendBatch(envS, list, input.from, () => ({ text: "📢 <b>Ustoz xabari</b>\n\n" + esc(msg), parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "📚 Platformani ochish", url: appLink() }]] } }));
  },
  // 💎 Premium: muddati tugayotgan o'quvchilarga eslatma (har biriga o'z matni)
  async pmNotify(env, input, u) {
    requireAdmin(u);
    const list = (Array.isArray(input.items) ? input.items.slice(0, 300) : []).map(it => ({ tgId: Number(it && it.tgId), text: String((it && it.text) || "").slice(0, 1500) })).filter(x => x.tgId && x.text);
    return sendBatch(env, list, input.from, to => ({ text: to.text, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "💎 Platformani ochish", url: appLink() }]] } }));
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

// ---------------- Eski bot: «yangi botga o'ting» ----------------
async function oldBotReply(env, up) {
  const m = up.message || (up.callback_query && up.callback_query.message), chat = m && m.chat && m.chat.id; if (!chat) return;
  const st = up.message && /^\/start\s+(\S+)/.exec(up.message.text || ""), p = st ? st[1] : "";
  const call = (method, body) => fetch(`https://api.telegram.org/bot${oldToken(env)}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (up.callback_query) await call("answerCallbackQuery", { callback_query_id: up.callback_query.id });
  await call("sendMessage", { chat_id: chat, parse_mode: "HTML", text: "🔔 <b>Bot yangilandi!</b>\n\nPlatformamiz endi yangi botda: <b>@" + BOT_NAME + "</b>\n\nPastdagi tugmani bosing va <b>START</b> ni bosing — akkauntingiz, ballaringiz va Premium o‘z joyida qoladi ✅", reply_markup: { inline_keyboard: [[{ text: "🚀 Yangi botga o‘tish", url: "https://t.me/" + BOT_NAME + (p ? "?start=" + encodeURIComponent(p) : "") }]] } });
}

// ---------------- Bot: xabarlar ----------------
// Ulashish: brend rasmi + matn + havola (havola matn ostida)
const SHARE_IMG = "https://tarixarena.uz/og.jpg?v=2";
const SHARE_TEXT = "📚 Tarixdan testlar, jonli turnirlar va o‘yinlar — <b>TARIX ARENA</b> botiga qo‘shiling! Milliy sertifikatga birga tayyorlanamiz 👇\n\n👉 https://t.me/" + BOT_NAME;
const shareKb = () => ({ inline_keyboard: [[{ text: "📚 Botga kirish", url: "https://t.me/" + BOT_NAME + "?start=dost" }]] });
// Bot o'zi ulashiladigan xabarni yuboradi: uni do'stga yuborish (inline) yoki forward qilish mumkin
async function sendShare(env, chat) {
  await tg(env, "sendPhoto", { chat_id: chat, photo: SHARE_IMG, caption: SHARE_TEXT, parse_mode: "HTML", reply_markup: shareKb() });
  return tg(env, "sendMessage", { chat_id: chat, text: "☝️ Shu xabarni do‘stlaringizga yuboring: ustiga bosib «Forward / Переслать» ni tanlang yoki pastdagi tugmani bosing.",
    reply_markup: { inline_keyboard: [[{ text: "📤 Do‘stga yuborish", switch_inline_query: "" }]] } });
}
// Inline rejim (@bot yozilganda yoki «Do'stga yuborish» bosilganda): rasmli taklif
async function onInline(env, q) {
  if (!q || !q.id) return;
  return tg(env, "answerInlineQuery", { inline_query_id: q.id, cache_time: 300, is_personal: false,
    results: [{ type: "photo", id: "share1", photo_url: SHARE_IMG, thumbnail_url: SHARE_IMG, photo_width: 1200, photo_height: 630, title: "TARIX ARENA", description: "Do‘stingizni botga taklif qiling", caption: SHARE_TEXT, parse_mode: "HTML", reply_markup: shareKb() }] });
}
const mainKb = () => ({ inline_keyboard: [
  [{ text: "📚 Testlarni boshlash", url: appLink() }],
  [{ text: "🏆 Turnirga qo‘shilish", url: appLink("turnir") }],
  [{ text: "🎓 Darslar haqida", callback_data: "kurs" }, { text: "👨‍👩‍👧 Ota-onalar uchun", callback_data: "ota" }],
  [{ text: "📤 Do‘stlarga ulashish", callback_data: "share" }, { text: "📞 Ustozga yozish", url: CONTACT_URL }],
] });
const sendStart = (env, chat, first) => tg(env, "sendMessage", { chat_id: chat, parse_mode: "HTML", reply_markup: mainKb(),
  text: "👋 Assalomu alaykum, " + first + "!\n\n<b>TARIX ARENA</b> — tarixni o‘yin va testlar bilan o‘rganing.\n<i>by Alimqul Zulpanov</i>\n\nBugun nima qilamiz? 👇" });
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
// ⏰ Uy vazifasi eslatmasi: muddatga 24 soatdan kam qolganda, bajarmaganlarga (har 10 daqiqada, bepul reja cheklovi doirasida qismlab)
async function hwRemind(env) {
  const now = Date.now();
  // Faqat muddati keyingi 24 soatda tugaydigan vazifalar (butun ro'yxat emas)
  const hw = await db(env, "GET", "hw", undefined, `&orderBy=%22due%22&startAt=${now}&endAt=${now + 24 * 3600e3}`) || {};
  const e = Object.entries(hw).find(([id, x]) => x && x.g && x.g !== "*" && !x.rm && x.due > now && x.due - now <= 24 * 3600e3);
  if (!e) return; const [id, x] = e;
  const [users, sub, tgs] = await Promise.all([db(env, "GET", "users"), db(env, "GET", "hwr/" + id), students(env)]);
  const byL = {}; tgs.forEach(r => byL[low(r.login)] = r.tgId);
  const seen = new Set(), list = [];
  Object.entries(users || {}).forEach(([uid, u]) => { if (!u || low(u.g) !== low(x.g) || (sub || {})[uid]) return; const t = loginsOf({ uid, ...u }).map(l => byL[l]).find(Boolean); if (t && !seen.has(t)) { seen.add(t); list.push({ tgId: t }); } });
  list.sort((a, b) => a.tgId - b.tgId);
  const text = "⏰ <b>Eslatma: uy vazifasi</b>\n\n📚 " + esc(x.ttl || "") + "\n⏳ Muddat: <b>" + tashDt(x.due) + "</b> — bir kundan kam qoldi.\n\nHali bajarmadingiz — hozir ishlang 👇";
  const r = await sendBatch(env, list, x.rmi || 0, () => ({ text, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "📝 Vazifani bajarish", url: appLink() }]] } }));
  if (r.next == null) await db(env, "PUT", `hw/${id}/rm`, true); else await db(env, "PUT", `hw/${id}/rmi`, r.next);
}
// Tozalash: 3 kundan eski turnir xonalari (t/) va eski «faol turnir» yozuvlari (a/) — baza kichik va tez bo'lib qoladi
async function cleanup(env) {
  const cut = Date.now() - 3 * 864e5, up = {};
  const t = await db(env, "GET", "t", undefined, `&orderBy=%22meta%2Fc%22&endAt=${cut}`).catch(() => ({})) || {};
  Object.entries(t).forEach(([k, x]) => { const c = x && x.meta && x.meta.c; if (c && c < cut) up["t/" + k] = null; });
  const a = await db(env, "GET", "a", undefined, `&orderBy=%22c%22&endAt=${cut}`).catch(() => ({})) || {};
  Object.entries(a).forEach(([k, x]) => { if (x && x.c && x.c < cut) up["a/" + k] = null; });
  if (Object.keys(up).length) await db(env, "PATCH", "", up);
  return Object.keys(up).length;
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
  if (q.data === "share") return sendShare(env, chat);
  const mp = /^py:(o|n):([A-Za-z0-9_-]{6,40}):(\w{1,5})$/.exec(q.data || "");
  if (mp && isAdminTg(q.from)) {
    try { const r = await payAct(env, mp[2], mp[1] === "o", mp[3], "@" + (q.from.username || "")); if (r.already) await tg(env, "answerCallbackQuery", { callback_query_id: q.id, text: "Bu to‘lov allaqachon ko‘rib chiqilgan" }).catch(() => {}); }
    catch (e) { await tg(env, "sendMessage", { chat_id: chat, text: "⚠️ " + (e.message || e) }).catch(() => {}); }
    return;
  }
  const mt = /^(tok|tno):([A-Za-z0-9]{1,40}):(\d{1,15})$/.exec(q.data || "");
  if (mt && isAdminTg(q.from)) {
    const [, act, uid, tid] = mt, ap = await db(env, "GET", "tapp/" + uid).catch(() => null), mid = q.message && q.message.message_id;
    const done = t => tg(env, "editMessageReplyMarkup", { chat_id: chat, message_id: mid, reply_markup: { inline_keyboard: [[{ text: t, callback_data: "x" }]] } }).catch(() => {});
    if (!ap) return done("Ariza allaqachon ko‘rib chiqilgan");
    if (act === "tok") {
      await db(env, "PUT", "tch/" + uid, { n: String(ap.n || "").slice(0, 60), org: String(ap.org || "").slice(0, 80), ok: true, at: Date.now() });
      await db(env, "DELETE", "tapp/" + uid); await done("✅ Tasdiqlandi");
      await tg(env, "sendMessage", { chat_id: Number(tid), parse_mode: "HTML", text: "🎉 <b>Tabriklaymiz!</b> Ustozlik arizangiz tasdiqlandi.\n\nPlatformani oching — bosh sahifada «👨‍🏫 Ustoz paneli» paydo bo‘ldi. U yerda guruh yaratib, havolani o‘quvchilaringizga yuboring.", reply_markup: { inline_keyboard: [[{ text: "👨‍🏫 Ustoz panelini ochish", url: appLink() }]] } }).catch(() => {});
    } else {
      await db(env, "DELETE", "tapp/" + uid); await done("❌ Rad etildi");
      await tg(env, "sendMessage", { chat_id: Number(tid), text: "Ustozlik arizangiz hozircha tasdiqlanmadi. Savollar bo‘lsa: " + CONTACT }).catch(() => {});
    }
  }
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
// Hafta chegarasi: yakshanba 20:00 (Toshkent) — sayt (TW) bilan bir xil: +9 soat siljitib dushanba 00:00 deb hisoblanadi
const WOFF = UZ + 4 * 3600e3;
// ⚔️ Arena yo'li: boshlanganda va oxirgi soatda guruhga xabar, tugaganda g'olibni aniqlash (kam xato, teng bo'lsa — oldin) va tabrik
async function arenaCron(env) {
  const now = Date.now();
  const ar = await db(env, "GET", "ar", undefined, `&orderBy=%22e%22&startAt=${now - 2 * 864e5}`).catch(() => null) || {};
  const groupTg = async (x, skip) => {
    if (!x.g || x.g === "*") return [];
    const [users, tgs] = await Promise.all([db(env, "GET", "users"), students(env)]);
    const byL = {}; tgs.forEach(r => byL[low(r.login)] = r.tgId);
    const seen = new Set(), list = [];
    Object.entries(users || {}).forEach(([uid, u]) => { if (!u || low(u.g) !== low(x.g) || (skip && skip(uid))) return; const t = loginsOf({ uid, ...u }).map(l => byL[l]).find(Boolean); if (t && !seen.has(t)) { seen.add(t); list.push({ tgId: t }); } });
    return list.sort((a, b) => a.tgId - b.tgId);
  };
  const kb = (id, t) => ({ inline_keyboard: [[{ text: t, url: appLink("ar-" + id) }]] });
  for (const [id, x] of Object.entries(ar)) {
    if (!x || !Array.isArray(x.st) || !x.n) continue;
    const n = x.st.length;
    if (!x.sn && x.a <= now && x.e > now + 10 * 60e3) {
      const list = await groupTg(x);
      const text = `⚔️ <b>ARENA YO‘LI boshlandi!</b>\n\n«${esc(x.n)}» — ${n} bosqich\n⏳ Tugash: <b>${tashDt(x.e)}</b>\n\nHar bosqichdan o‘tsangiz, keyingisi ochiladi. Oxirigacha yetganlar ichida <b>eng kam xato</b> qilgan — 👑 ARENA CHEMPIONI!`;
      const r = await sendBatch(env, list, x.sni || 0, () => ({ text, parse_mode: "HTML", reply_markup: kb(id, "⚔️ Arenaga kirish") }));
      await db(env, "PATCH", "ar/" + id, r.next == null ? { sn: true, sni: null } : { sni: r.next });
      return;
    }
    if (!x.r1 && x.a <= now && x.e > now && x.e - now <= 3600e3) {
      const P = await db(env, "GET", "arp/" + id).catch(() => null) || {};
      const list = await groupTg(x, uid => P[uid] && P[uid].f);
      const text = `🔥 <b>Arena yo‘li — oxirgi soat!</b>\n\n«${esc(x.n)}» soat <b>${tashDt(x.e).slice(-5)}</b> da yakunlanadi.\nHali marraga yetmadingiz — chempionlik uchun shoshiling! ⚔️`;
      const r = await sendBatch(env, list, x.r1i || 0, () => ({ text, parse_mode: "HTML", reply_markup: kb(id, "⚔️ Davom etish") }));
      await db(env, "PATCH", "ar/" + id, r.next == null ? { r1: true, r1i: null } : { r1i: r.next });
      return;
    }
    if (!x.wd && x.e <= now) {
      const P = await db(env, "GET", "arp/" + id).catch(() => null) || {};
      const R = Object.entries(P).filter(([u, p]) => p && p.n && p.f && p.f <= x.e + 6e4).map(([u, p]) => ({ u, ...p, e: p.e || 0 })).sort((a, b) => a.e - b.e || a.f - b.f);
      const w = R[0];
      const up = { wd: true };
      if (w) {
        up.w = { k: w.u, n: str(w.n, 80), e: w.e, f: w.f, j: w.j || x.a };
        await db(env, "PUT", `arc/${w.u}/${id}`, { n: str(x.n, 60), wn: str(w.n, 80), e: w.e, f: w.f, j: w.j || x.a, a: x.a, s: n, at: x.e });
      }
      await db(env, "PATCH", "ar/" + id, up);
      const hm = ms => { const s = Math.round(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h} soat ${m} daqiqa` : `${m} daqiqa ${s % 60} soniya`; };
      if (w) {
        const chat = await studentChat(env, w.u).catch(() => null);
        if (chat) await tg(env, "sendPhoto", { chat_id: chat, photo: SITE + "img/aw-arena.jpg", parse_mode: "HTML", reply_markup: kb(id, "👑 Kartamni ko‘rish"),
          caption: `🔥 <b>Tabriklaymiz, ${esc(w.n)}!</b>\n\nSiz — <b>👑 ARENA CHEMPIONI!</b>\n⚔️ «${esc(x.n)}»\n🏁 ${n}/${n} bosqich · ❌ ${w.e} xato · ⏱ ${hm(w.f - (w.j || x.a))}\n\n🎁 Profilingizga «ARENA CHEMPIONI» kartasi qo‘shildi. Ustozingiz va sinfdoshlaringiz uni ko‘radi! 💪` }).catch(() => {});
      }
      const tc = x.t ? await studentChat(env, x.t).catch(() => null) : null;
      if (tc) {
        const all = Object.values(P).filter(p => p && p.n), fin = all.filter(p => p.f && p.f <= x.e + 6e4).sort((a, b) => (a.e || 0) - (b.e || 0) || a.f - b.f);
        const lines = fin.slice(0, 10).map((p, i) => `${["🥇", "🥈", "🥉"][i] || (i + 1) + "."} ${esc(p.n)} — ${p.e || 0} xato`).join("\n");
        await tg(env, "sendMessage", { chat_id: tc, parse_mode: "HTML", reply_markup: kb(id, "📊 Natijalar"),
          text: `🏁 <b>Arena yakunlandi</b> — «${esc(x.n)}»\n\n👥 Qatnashdi: <b>${all.length}</b> · 🏁 Marraga yetdi: <b>${fin.length}</b>\n${w ? `👑 Chempion: <b>${esc(w.n)}</b> (${w.e} xato)` : "Hech kim marraga yetmadi."}${lines ? "\n\n" + lines : ""}` }).catch(() => {});
      }
      return;
    }
  }
}
// 🏆 Yakshanba 20:00 — hafta g'oliblari: Shon-sharaf zaliga (hof/<hafta>) yozish va botda sertifikat bilan tabrik
async function weeklyAwards(env) {
  const now = Date.now(), ws = weekStart(now);
  if (now - ws > 6 * 3600e3) return;                       // faqat chegaradan keyingi ~6 soat ichida
  const k = weekKey(ws - 864e5); if (await db(env, "GET", `hof/${k}/sn`).catch(() => null)) return;
  const [L, V] = await Promise.all([db(env, "GET", "lb/" + k).catch(() => null), db(env, "GET", "vw/" + k).catch(() => null)]);
  const xp = Object.entries(L || {}).filter(([u, x]) => x && x.xp > 0).sort((a, b) => b[1].xp - a[1].xp || (a[1].at || 0) - (b[1].at || 0)).slice(0, 3).map(([u, x]) => ({ k: u, n: str(x.n, 80), g: str(x.g || "", 30), xp: x.xp }));
  const tm = Object.entries(V || {}).filter(([u, x]) => x && x.g && x.s > 0).sort((a, b) => b[1].s - a[1].s).slice(0, 3).map(([u, x]) => ({ k: u, n: str(x.n, 80), g: str(x.g || "", 30), s: x.s }));
  await db(env, "PUT", "hof/" + k, { xp, tm, at: now, sn: 1 });
  const hm = s => { const h = Math.floor(s / 3600), m = Math.round(s % 3600 / 60); return h ? `${h} soat ${m} daqiqa` : `${m} daqiqa`; };
  const XT = ["👑 HAFTA CHEMPIONI", "🥈 HAFTA KUMUSHI", "🥉 HAFTA BRONZASI"], TT = ["💠 PLATINUM KARTA", "⭐ GOLD KARTA", "✦ SILVER KARTA"];
  const XR = ["Bir hafta davomida profilingizda 👑 toj, testlarda oltin halqa va «Registon» premium mavzusi!", "Bir hafta davomida profilingizda 🥈 kumush nishon va halqa!", "Bir hafta davomida profilingizda 🥉 bronza nishon va halqa!"];
  const TR = ["Bir hafta davomida 💠 Platinum karta — profilda yorqin nur va kartalar jangida +1 sandiq!", "Bir hafta davomida ⭐ Gold karta va kartalar jangida +1 sandiq!", "Bir hafta davomida ✦ Silver karta profilingizda!"];
  const send = async (p, i, img, title, val, rew) => {
    const id = await studentChat(env, p.k).catch(() => null); if (!id) return;
    const caption = `🎉 <b>Tabriklaymiz, ${esc(p.n || "do‘stim")}!</b>\n\n${title} — <b>${i + 1}-o‘rin</b>\n${val}\n\n🎁 ${rew}\n\n🏛 Ismingiz Shon-sharaf zaliga abadiy yozildi. Yangi hafta boshlandi — unvonni qo‘ldan bermang! 💪`;
    await tg(env, "sendPhoto", { chat_id: id, photo: SITE + "img/" + img + ".jpg", caption, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🏛 Shon-sharaf zalini ochish", url: appLink("") }]] } }).catch(() => {});
  };
  for (let i = 0; i < xp.length; i++) await send(xp[i], i, "aw-x" + (i + 1), XT[i], `⚡ ${xp[i].xp} XP`, XR[i]);
  for (let i = 0; i < tm.length; i++) await send(tm[i], i, "aw-t" + (i + 1), TT[i], `⏱ Saytda ${hm(tm[i].s)}`, TR[i]);
}
function weekStart(ms) { const d = new Date(ms + WOFF), w = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - w) - WOFF; }
const weekKey = ms => { const d = new Date(weekStart(ms) + WOFF); return "w" + d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, "0") + String(d.getUTCDate()).padStart(2, "0"); };
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
// ---------------- 👨‍🏫 Ustozlar: o'z o'quvchilari ----------------
const low = x => String(x || "").trim().toLowerCase();
const loginsOf = x => [x.login || x.uid].concat(Array.isArray(x.al) ? x.al : []).map(low).filter(Boolean);
const tashDt = ms => { const d = new Date(ms + 5 * 3600e3), z = n => String(n).padStart(2, "0"); return `${z(d.getUTCDate())}.${z(d.getUTCMonth() + 1)} ${z(d.getUTCHours())}:${z(d.getUTCMinutes())}`; };
// Ustozni tekshirish va uning o'quvchilari (guruhlari bo'yicha) — kam so'rov bilan (Cloudflare bepul rejasi cheklovi)
async function teacherCtx(env, uid) {
  const t = await db(env, "GET", "tch/" + uid); if (!t || t.ok !== true) throw new Error("Faqat tasdiqlangan ustoz uchun");
  const [grp, tst, users] = await Promise.all([db(env, "GET", "grp"), db(env, "GET", "tst/" + uid), db(env, "GET", "users")]);
  const names = new Set(vals(grp).filter(g => g.t === uid && g.n).map(g => low(g.n)));
  const us = Object.keys(tst || {}).map(id => (users || {})[id] ? { uid: id, ...users[id] } : null).filter(x => x && x.f && names.has(low(x.g)));
  return { t, names, us };
}
async function tgOfLogins(env, logins, to) {
  const L = new Set(logins), seen = new Set(), list = [], add = id => { if (id && !seen.has(id)) { seen.add(id); list.push({ tgId: id }); } };
  if (to !== "par") (await students(env)).forEach(r => { if (L.has(low(r.login))) add(r.tgId); });
  if (to !== "stu") (await parentsList(env)).forEach(p => { if (L.has(low(p.login))) add(p.tgId); });
  return list;
}
const VFN = {
  // Ustoz vazifa berdi — guruh o'quvchilariga bot xabari
  async tHw(env, uid, i) {
    const c = await teacherCtx(env, uid), id = String(i.id || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
    const hw = await db(env, "GET", "hw/" + id); if (!hw || hw.t !== uid) throw new Error("Vazifa topilmadi");
    const list = await tgOfLogins(env, c.us.filter(x => low(x.g) === low(hw.g)).flatMap(loginsOf), "stu");
    const text = "📝 <b>Yangi uy vazifasi!</b>\n👨‍🏫 Ustoz: " + esc(c.t.n || "") + "\n\n📚 " + esc(hw.ttl || "") + "\n⏰ Muddat: <b>" + tashDt(hw.due) + "</b>" + (hw.note ? "\n💬 " + esc(hw.note) : "") + "\n\nBajarish uchun tugmani bosing 👇";
    return sendBatch(env, list, i.from, () => ({ text, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "📝 Vazifani bajarish", url: appLink() }]] } }));
  },
  // Ustoz xabari — faqat o'z o'quvchilari (va ota-onalari)
  async tMsg(env, uid, i) {
    const c = await teacherCtx(env, uid), msg = String(i.text || "").trim().slice(0, 3500); if (!msg) return { sent: 0, failed: 0, next: null };
    const allow = new Set(c.us.flatMap(loginsOf)), want = Array.isArray(i.logins) ? i.logins.map(low).filter(l => allow.has(l)) : [...allow];
    const to = ["stu", "par", "all"].includes(i.to) ? i.to : "stu", list = await tgOfLogins(env, want, to);
    return sendBatch(env, list, i.from, () => ({ text: "📢 <b>Ustoz xabari</b> — " + esc(c.t.n || "") + "\n\n" + esc(msg), parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "📚 Platformani ochish", url: appLink() }]] } }));
  },
  // Ota-onalarga hisobot: matnni sayt tayyorlaydi (ustoz natijalarni o'qiy oladi), server faqat o'z o'quvchilariga ruxsat beradi
  async tRep(env, uid, i) {
    const c = await teacherCtx(env, uid), allow = new Set(c.us.flatMap(loginsOf)), by = {}, list = [];
    (await parentsList(env)).forEach(p => (by[low(p.login)] = by[low(p.login)] || []).push(p.tgId));
    (Array.isArray(i.items) ? i.items.slice(0, 1000) : []).forEach(it => { const l = low(it && it.u); if (allow.has(l)) (by[l] || []).forEach(tgId => list.push({ tgId, text: String(it.text || "").slice(0, 3500) })); });
    const r = await sendBatch(env, list, i.from, to => ({ text: to.text, parse_mode: "HTML" })); r.parents = list.length; return r;
  },
  async res(env, uid, i) {
    const g = await grade(env, i);
    const dur = Math.max(0, Number(i.dur) || 0);
    if (dur && dur < g.tot * 700) throw new Error("Juda tez yakunlandi — natija qabul qilinmadi");
    if (!g.sec && i.sec && typeof i.sec === "object") g.sec = i.sec;
    const user = await db(env, "GET", "users/" + uid) || {};
    return saveRes(env, uid, user, g, { ttl: i.ttl, hw: i.hw, set: i.set, n: i.n, dur });
  },
  async lb(env, uid) { return syncLb(env, uid); },
  // O'quvchi chek yubordi → ustozga Telegram'da xabar
  async payNew(env, uid, i) {
    const id = String(i.id || ""); if (!/^[A-Za-z0-9_-]{6,40}$/.test(id)) throw new Error("Noto‘g‘ri so‘rov");
    const x = await db(env, "GET", "pay/" + id); if (!x || x.uid !== uid) throw new Error("To‘lov topilmadi");
    if (x.msg) return { ok: true };
    await payNotify(env, id); return { ok: true };
  },
  // Ustoz admin paneldan tasdiqlaydi yoki rad etadi
  // Yangi o'quvchi: Telegram orqali ro'yxatdan o'tgach — bir marta xush kelibsiz xabari
  async wel(env, uid) {
    const user = await db(env, "GET", "users/" + uid); if (!user) return { ok: false };
    const m = String(user.login || "").match(/^tg(\d+)$/), id = m ? +m[1] : Number(await db(env, "GET", "tg/tgu/" + uid).catch(() => 0)) || 0;
    if (!id || !(user.c > Date.now() - 2 * 864e5)) return { ok: false };
    if (await db(env, "GET", "tg/w/" + id).catch(() => null)) return { ok: false, dup: 1 };
    const r = await sendWel(env, [{ tgId: id, name: user.f }], 0); return { ok: !!r.sent };
  },
  // Admin: tanlangan yangi a'zolarga xush kelibsiz xabari
  async aWel(env, uid, i) {
    if ((await db(env, "GET", "admins/" + uid)) !== true) throw new Error("Faqat ustoz uchun");
    const list = (Array.isArray(i.items) ? i.items.slice(0, 1000) : []).map(x => ({ tgId: Number(x && x.tgId), name: String((x && x.name) || "") })).filter(x => x.tgId);
    return sendWel(env, list, i.from);
  },
  // Admin: tanlangan o'quvchilarga bot orqali xabar (sayt yoki Telegram ichidan)
  async aMsg(env, uid, i) {
    if ((await db(env, "GET", "admins/" + uid)) !== true) throw new Error("Faqat ustoz uchun");
    const msg = String(i.text || "").trim().slice(0, 3500); if (!msg) return { sent: 0, failed: 0, next: null };
    const list = await tgOfLogins(env, (Array.isArray(i.logins) ? i.logins.slice(0, 2000) : []).map(low), "stu");
    return sendBatch(env, list, i.from, () => ({ text: "📢 <b>Ustoz xabari</b>\n\n" + esc(msg), parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "📚 Platformani ochish", url: appLink() }]] } }));
  },
  async payAct(env, uid, i) {
    if ((await db(env, "GET", "admins/" + uid)) !== true) throw new Error("Faqat ustoz uchun");
    return payAct(env, String(i.id || ""), !!i.ok, i.ok ? i.d : i.why, "admin panel");
  },
  // Kirish usullari: Telegram ulanganmi, saytga qaysi login bilan kiriladi
  async lpInfo(env, uid) {
    const r = await db(env, "GET", "users/" + uid) || {}, tgO = /^tg\d+$/.test(r.login || "");
    const al = await db(env, "GET", "tg/spu/" + uid).catch(() => null), tu = await db(env, "GET", "tg/tgu/" + uid).catch(() => null);
    return { login: al || (tgO ? "" : r.login || ""), tg: tgO || !!tu, tgOrigin: tgO };
  },
  // Saytga kirish uchun login-parol o'rnatish / o'zgartirish
  async setLp(env, uid, i) {
    const login = String(i.login || "").toLowerCase().trim(), pw = String(i.pw || "");
    const r = await db(env, "GET", "users/" + uid); if (!r) throw new Error("Hisob topilmadi");
    if (String(pw).length < 6) throw new Error("Parol kamida 6 belgidan iborat bo‘lsin");
    const tgO = /^tg\d+$/.test(r.login || ""), old = await db(env, "GET", "tg/spu/" + uid).catch(() => null);
    if (!tgO && login === r.login) { // saytda ochilgan hisob — o'z paroli
      await adminSetPw(env, uid, pw);
      if (old === login) await saveSitePw(env, uid, login, pw);
      return { login };
    }
    checkLogin(login);
    const lg = await db(env, "GET", "logins/" + login).catch(() => null), sp = await db(env, "GET", "tg/sp/" + login).catch(() => null);
    if ((lg && lg !== uid) || (sp && sp.uid !== uid)) throw new Error("Bu login band. Boshqasini tanlang");
    await saveSitePw(env, uid, login, pw);
    await db(env, "PUT", "logins/" + login, uid);
    await db(env, "PUT", "tg/spu/" + uid, login);
    if (old && old !== login && old !== r.login) { await db(env, "DELETE", "tg/sp/" + old).catch(() => {}); const o = await db(env, "GET", "logins/" + old).catch(() => null); if (o === uid) await db(env, "DELETE", "logins/" + old).catch(() => {}); }
    return { login };
  },
  // Saytda ochilgan hisobga Telegramni ulash (Telegram Login tasdig'i bilan)
  async linkTg(env, uid, i) {
    const t = await verifyWidget(env, i.d), r = await db(env, "GET", "users/" + uid);
    if (!r) throw new Error("Hisob topilmadi");
    if (/^tg\d+$/.test(r.login || "")) throw new Error("Telegram allaqachon ulangan");
    const ex = await db(env, "GET", "tg/link/" + t.id).catch(() => null);
    if (ex && ex.uid && ex.uid !== uid) throw new Error("Bu Telegram boshqa hisobga ulangan");
    const own = await db(env, "GET", "logins/tg" + t.id).catch(() => null);
    if (own && own !== uid) throw new Error("Bu Telegram bilan botda alohida hisob ochilgan. Ikki hisobni birlashtirish uchun ustozga murojaat qiling");
    await customToken(env, uid); // kalit ishlashini oldindan tekshiramiz
    await db(env, "PUT", "tg/link/" + t.id, { email: "", uid, ct: 1, at: Date.now() });
    await db(env, "PUT", "tg/tgu/" + uid, t.id);
    await db(env, "PATCH", "users/" + uid, { tg: 1 }).catch(() => {});
    return { ok: true };
  },
  // Ustoz: o'quvchi parolini yangilash
  async admPw(env, uid, i) {
    if ((await db(env, "GET", "admins/" + uid)) !== true) throw new Error("Faqat ustoz uchun");
    const t = String(i.uid || ""), pw = String(i.pw || ""), r = await db(env, "GET", "users/" + t);
    if (!r) throw new Error("O‘quvchi topilmadi");
    if (pw.length < 6) throw new Error("Parol kamida 6 belgidan iborat bo‘lsin");
    const al = await db(env, "GET", "tg/spu/" + t).catch(() => null), tgO = /^tg\d+$/.test(r.login || "");
    if (tgO && !al) throw new Error("Bu o‘quvchi Telegram orqali kiradi. Avval o‘zi profilida «Saytga kirish uchun login-parol»ni o‘rnatsin");
    if (al) await saveSitePw(env, t, al, pw);
    if (!tgO) await adminSetPw(env, t, pw);
    return { login: al || r.login };
  },
  // Ota-ona havolasi (brauzerdagi sayt uchun)
  async plink(env, uid) {
    const r = await db(env, "GET", "users/" + uid);
    const login = String((r && r.login) || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!login) throw new Error("Avval platformaga kiring");
    return { url: `https://t.me/${BOT_NAME}?start=p_${login}_${await psig(env, login)}` };
  },
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
  async scheduled(event, env, ctx) {
    if (event.cron !== "0 4 * * SUN") ctx.waitUntil(weeklyAwards(env).catch(e => console.error("awards", e && e.stack || e)).then(() => arenaCron(env)).catch(e => console.error("arena", e && e.stack || e)));
    if (event.cron === "0 4 * * SUN") ctx.waitUntil(backup(env).catch(e => console.error("backup", e && e.stack || e)).then(() => cleanup(env)).catch(e => console.error("cleanup", e && e.stack || e)));
    else ctx.waitUntil(hwRemind(env).catch(e => console.error("hwRemind", e && e.stack || e)));
  },
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    if (url.pathname === "/api") {
      if (req.method !== "POST") return json({ ok: true, bot: "TARIX ARENA" });
      try {
        const b = await req.json();
        if (!FN[b.fn]) return json({ ok: false, err: "Noma’lum amal" });
        const u = await verifyInit(env, b.initData);
        return json({ ok: true, r: await FN[b.fn](env, b.input || {}, u) });
      } catch (e) { return json({ ok: false, err: String((e && e.message) || e) }); }
    }

    if (url.pathname === "/wl") { // brauzerdagi sayt: Telegram Login orqali kirish
      try {
        if (req.method !== "POST") return json({ ok: true, bot_id: Number(String(token(env)).split(":")[0]), bot: BOT_NAME });
        const b = await req.json(), u = await verifyWidget(env, b.d);
        return json({ ok: true, r: await FN.auth(env, {}, u) });
      } catch (e) { return json({ ok: false, err: String((e && e.message) || e) }); }
    }

    if (url.pathname === "/wp") { // saytda login-parol: server tekshiradigan (botdan kelgan) hisoblar uchun
      try {
        if (req.method !== "POST") {
          if ((await db(env, "GET", "c/pm/tarV").catch(() => null)) !== 3) { await db(env, "PUT", "c/pm/tar", [{ n: "1 oy", d: 30, p: "69 000 so‘m", p1: "39 000 so‘m" }, { n: "3 oy", d: 90, p: "150 000 so‘m" }]); await db(env, "PUT", "c/pm/tarV", 3); }
          let sa = "yo‘q"; try { await saAccess(env); sa = "ishlayapti"; } catch (e) { sa = String(e.message || e); } return json({ ok: true, sa }); }
        const b = await req.json(), login = String(b.login || "").toLowerCase().trim(), pw = String(b.pw || "");
        if (!LOGIN_RE.test(login) || !pw) throw new Error("Login yoki parol noto‘g‘ri");
        const rl = await db(env, "GET", "tg/rl/" + login).catch(() => null);
        if (rl && rl.n >= 5 && Date.now() - rl.t < 15 * 60e3) throw new Error("Ko‘p marta xato kiritildi. 15 daqiqadan keyin urinib ko‘ring");
        const sp = await db(env, "GET", "tg/sp/" + login).catch(() => null);
        if (!sp || (await pwHash(pw, sp.s)) !== sp.h) {
          await db(env, "PUT", "tg/rl/" + login, { n: (rl && Date.now() - rl.t < 15 * 60e3 ? rl.n : 0) + 1, t: Date.now() }).catch(() => {});
          throw new Error("Login yoki parol noto‘g‘ri");
        }
        if (rl) await db(env, "DELETE", "tg/rl/" + login).catch(() => {});
        return json({ ok: true, r: { token: await customToken(env, sp.uid) } });
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

    if (req.method === "GET" && url.searchParams.get("setup") === "1") { // bot sozlash: webhook, menyu tugmasi, buyruqlar, tavsif
      try {
        const me = await tg(env, "getMe", {});
        await tg(env, "setWebhook", { url: url.origin + "/", secret_token: await whSecret(env), allowed_updates: ["message", "callback_query", "inline_query"], drop_pending_updates: false });
        await tg(env, "setChatMenuButton", { menu_button: { type: "web_app", text: "📚 Ochish", web_app: { url: SITE } } }).catch(() => {});
        await tg(env, "setMyShortDescription", { short_description: BOT_ABOUT }); await tg(env, "setMyDescription", { description: BOT_DESC });
        let old = "";
        if (oldToken(env)) { const r = await fetch(`https://api.telegram.org/bot${oldToken(env)}/setWebhook`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: url.origin + "/", secret_token: await whSecretOf(oldToken(env)), allowed_updates: ["message", "callback_query"] }) }).then(r => r.json()).catch(() => ({})); old = r.ok ? "\n✅ Eski bot @" + OLD_BOT_NAME + " endi foydalanuvchilarni yangi botga yo‘naltiradi" : "\n⚠️ Eski bot sozlanmadi: " + (r.description || ""); }
        return new Response(`✅ @${me.username} sozlandi: webhook, menyu tugmasi va tavsif${old}${me.username !== BOT_NAME ? `\n⚠️ Diqqat: kodda bot nomi @${BOT_NAME}, token esa @${me.username} niki` : ""}`, { headers: { "content-type": "text/plain; charset=utf-8" } }); }
      catch (e) { return new Response("⚠️ " + ((e && e.message) || e), { headers: { "content-type": "text/plain; charset=utf-8" } }); }
    }
    if (req.method !== "POST") {
      let st = "✅";
      try { token(env); const a = await fbAuth(env); const adm = await db(env, "GET", "admins/" + a.uid).catch(() => null); st += `\nFirebase uid: ${a.uid}\nAdmin huquqi: ${adm === true ? "bor ✅" : "yo‘q ⚠️"}`; }
      catch (e) { st = "⚠️ " + ((e && e.message) || e); }
      return new Response("ZULPANOV TARIX bot " + st, { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    // Telegram webhook
    const hs = req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    try {
      if (hs !== await whSecret(env)) {
        // Eski botga yozganlarni yangi botga yo'naltirish
        if (oldToken(env) && hs === await whSecretOf(oldToken(env))) { const up = await req.json().catch(() => null); if (up) ctx.waitUntil(oldBotReply(env, up).catch(() => {})); return new Response("ok"); }
        return new Response("forbidden", { status: 403 });
      }
    } catch (e) { return new Response("not configured", { status: 500 }); }
    const up = await req.json().catch(() => null);
    if (up) ctx.waitUntil((async () => {
      try { if (up.callback_query) await onCallback(env, up.callback_query); else if (up.inline_query) await onInline(env, up.inline_query); else await onMessage(env, up.message); }
      catch (e) { console.error("update", up.update_id, e && e.stack || e); }
    })());
    return new Response("ok");
  },
};
