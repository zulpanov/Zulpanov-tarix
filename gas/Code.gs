/**
 * ZULPANOV METHODS TARIX — Telegram bot (Google Apps Script)
 *
 * O'rnatish:
 *  1) Loyiha sozlamalari (⚙️) → Script properties → BOT_TOKEN = botning tokeni (@BotFather → /token).
 *  2) Yuqoridagi ro'yxatdan «setup» funksiyasini tanlab ▶ Run bosing va ruxsat bering.
 *  3) Deploy → New deployment → Web app: Execute as «Me», Who has access «Anyone» → Deploy.
 *     Chiqqan Web app URL'ni ustozning sayti uchun yuboring.
 *
 * Bot har daqiqada yangi xabarlarni tekshiradi (/start, ota-ona ulanishi).
 * Sayt (Mini App) esa shu Web app orqali o'quvchini bog'laydi va xabarnomalar yuboradi.
 */

var WORKER_URL = 'https://zulpanov-tarix-bot.zulponovalimqul.workers.dev';                            // Cloudflare Worker manzili (webhook qabulxonasi)
var ADMIN_TG = ['zulpanov_methods'];           // ustozning Telegram username'i (kichik harflarda)
var CONTACT = '@ZULPANOV_METHODS';
var CONTACT_URL = 'https://t.me/ZULPANOV_METHODS';
var KURS_TEXT = 'Bizning tarix kursimizda mavzulashgan audio darslar, yangi darslik asosida mualliflikdagi milliy sertifikat kitoblari mavjud. Darslar Alimqul Zulpanov tomonidan qiziqarli va tushunarli tarzda olib boriladi. Milliy sertifikatga yoki attestatsiyaga kuchliroq tayyorlanmoqchi boʻlsangiz marhamat sizni kutamiz.';

// ---------------- Yordamchilar ----------------
var P = PropertiesService.getScriptProperties();
function token_() { var t = P.getProperty('BOT_TOKEN'); if (!t) throw new Error('BOT_TOKEN topilmadi: Script properties ga qo‘shing'); var m = t.match(/\d{5,}:[A-Za-z0-9_-]{30,}/); return m ? m[0] : t.trim(); }
function esc_(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
function isAdminTg_(u) { return !!(u && u.username && ADMIN_TG.indexOf(String(u.username).toLowerCase()) >= 0); }

function tg_(method, payload) {
  var r = UrlFetchApp.fetch('https://api.telegram.org/bot' + token_() + '/' + method, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload || {}), muteHttpExceptions: true
  });
  var j = {}; try { j = JSON.parse(r.getContentText()); } catch (e) {}
  if (!j.ok) { var err = new Error(j.description || ('HTTP ' + r.getResponseCode())); err.code = j.error_code; err.retry = j.parameters && j.parameters.retry_after; throw err; }
  return j.result;
}
function botName_() {
  var n = P.getProperty('BOT_NAME');
  if (!n) { n = tg_('getMe').username; P.setProperty('BOT_NAME', n); }
  return n;
}
function appLink_(param) { return 'https://t.me/' + botName_() + '?startapp' + (param ? '=' + encodeURIComponent(param) : ''); }
// Ota-ona havolasi imzosi: faqat o'quvchining o'zi (Mini App ichida) ola oladi
function psig_(login) {
  var b = Utilities.computeHmacSha256Signature('p:' + login, token_());
  return b.map(function (x) { return ('0' + (x & 255).toString(16)).slice(-2); }).join('').slice(0, 10);
}
function adminChats_() {
  var ids = {}, a = P.getProperty('ADMIN_CHAT'); if (a) ids[a] = 1;
  all_('u:').forEach(function (r) { if (r.isAdmin) ids[String(r.tgId)] = 1; });
  return Object.keys(ids);
}

// ---------------- Ma'lumotlar (Script properties) ----------------
// u:<tgId> → {tgId,login,name,grp,isAdmin,at}   p:<tgId>:<login> → {tgId,login,name,at}
function all_(prefix) {
  var o = P.getProperties(), out = [];
  for (var k in o) if (k.indexOf(prefix) === 0) { try { out.push(JSON.parse(o[k])); } catch (e) {} }
  return out;
}
function getUser_(id) { var v = P.getProperty('u:' + id); return v ? JSON.parse(v) : null; }

function sendMany_(list, build) {
  var sent = 0, failed = 0;
  for (var i = 0; i < list.length; i++) {
    var msg = build(list[i]); msg.chat_id = list[i].tgId;
    try { tg_('sendMessage', msg); sent++; }
    catch (e) {
      if (e.code === 429 && e.retry) { Utilities.sleep((e.retry + 1) * 1000); try { tg_('sendMessage', msg); sent++; continue; } catch (e2) {} }
      failed++;
    }
    if ((sent + failed) % 25 === 0) Utilities.sleep(1100);
  }
  return { sent: sent, failed: failed };
}
function uniq_(list) { var seen = {}; return list.filter(function (x) { if (seen[x.tgId]) return false; seen[x.tgId] = 1; return true; }); }

// ---------------- Telegram Mini App initData tekshiruvi ----------------
function verifyInit_(initData) {
  if (!initData) throw new Error('Telegram ma’lumoti yo‘q');
  var pairs = String(initData).split('&'), map = {}, hash = '';
  pairs.forEach(function (p) {
    var i = p.indexOf('='), k = decodeURIComponent(p.slice(0, i)), v = decodeURIComponent(p.slice(i + 1).replace(/\+/g, '%20'));
    if (k === 'hash') hash = v; else map[k] = v;
  });
  var dcs = Object.keys(map).sort().map(function (k) { return k + '=' + map[k]; }).join('\n');
  var secret = Utilities.computeHmacSha256Signature(Utilities.newBlob(token_()).getBytes(), Utilities.newBlob('WebAppData').getBytes());
  var sig = Utilities.computeHmacSha256Signature(Utilities.newBlob(dcs).getBytes(), secret);
  var hex = sig.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
  if (hex !== hash) throw new Error('Telegram imzosi noto‘g‘ri');
  if (map.auth_date && (Date.now() / 1000 - Number(map.auth_date)) > 7 * 86400) throw new Error('Sessiya eskirgan — botni qayta oching');
  return map.user ? JSON.parse(map.user) : null;
}
function requireAdmin_(u) { if (!u) throw new Error('Telegram foydalanuvchisi aniqlanmadi'); if (!isAdminTg_(u)) throw new Error('Faqat ustoz uchun'); }

// ---------------- Mini App chaqiruvlari ----------------
var FN = {
  link: function (input, u) {
    if (!u) throw new Error('Telegram foydalanuvchisi aniqlanmadi');
    var login = String(input.login || '').toLowerCase().trim().slice(0, 40);
    if (!login) throw new Error('Login kerak');
    var admin = isAdminTg_(u);
    P.setProperty('u:' + u.id, JSON.stringify({ tgId: u.id, login: login, name: String(input.name || '').slice(0, 80), grp: String(input.grp || '').slice(0, 40), isAdmin: admin, at: Date.now() }));
    return { ok: true, admin: admin };
  },
  plink: function (input, u) {
    if (!u) throw new Error('Telegram foydalanuvchisi aniqlanmadi');
    var r = getUser_(u.id), login = String((r && r.login) || input.login || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!login) throw new Error('Avval platformaga kiring');
    return { url: 'https://t.me/' + botName_() + '?start=p_' + login + '_' + psig_(login) };
  },
  me: function (input, u) { if (!u) return null; var r = getUser_(u.id); return r ? { login: r.login, admin: !!r.isAdmin } : null; },
  unlink: function (input, u) {
    if (!u) return { ok: false };
    var r = getUser_(u.id); if (r && r.isAdmin && !input.admin) return { ok: true };
    P.deleteProperty('u:' + u.id); return { ok: true };
  },
  stats: function (input, u) {
    requireAdmin_(u);
    var us = all_('u:').filter(function (r) { return !r.isAdmin; }), ps = all_('p:'), grp = {}, kids = {};
    us.forEach(function (r) { var g = r.grp || '—'; grp[g] = (grp[g] || 0) + 1; });
    ps.forEach(function (p) { kids[p.login] = 1; });
    return { students: us.length, parents: ps.length, kids: Object.keys(kids).length, groups: grp };
  },
  announce: function (input, u) {
    requireAdmin_(u);
    var code = String(input.code || '').replace(/\D/g, '').slice(0, 4), grp = String(input.grp || '');
    var list = all_('u:').filter(function (r) { return !r.isAdmin && (!grp || r.grp === grp); });
    var link = appLink_('turnir-' + code);
    var text = (input.team ? '👥 <b>Jamoaviy turnir!</b>' : '🏆 <b>Turnir boshlanmoqda!</b>') + '\n\n📚 ' + esc_(input.ttl || '') + '\n🔢 Kod: <b>' + code + '</b>' +
      (input.n ? '\n❓ ' + (+input.n) + ' ta savol' : '') + (input.dur ? ' · ⏱ ' + (+input.dur) + ' daqiqa' : '') + '\n\nQo‘shilish uchun tugmani bosing 👇';
    return sendMany_(list, function () { return { text: text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '🏆 Turnirga kirish', url: link }]] } }; });
  },
  notifyHw: function (input, u) {
    requireAdmin_(u);
    var grp = String(input.grp || '');
    var list = all_('u:').filter(function (r) { return !r.isAdmin && (!grp || grp === '*' || r.grp === grp); });
    var link = appLink_();
    var text = '📝 <b>Yangi uy vazifasi!</b>\n\n📚 ' + esc_(input.ttl || '') + '\n⏰ Muddat: <b>' + esc_(input.due || '') + '</b>' + (input.note ? '\n💬 ' + esc_(input.note) : '') + '\n\nBajarish uchun tugmani bosing 👇';
    return sendMany_(list, function () { return { text: text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '📝 Vazifani bajarish', url: link }]] } }; });
  },
  broadcast: function (input, u) {
    requireAdmin_(u);
    var to = String(input.to || 'stu'), grp = String(input.grp || ''), msg = String(input.text || '').trim().slice(0, 3500);
    if (!msg) return { sent: 0, failed: 0 };
    var stu = all_('u:').filter(function (r) { return !r.isAdmin && (!grp || r.grp === grp); }), list = [];
    if (to !== 'par') list = list.concat(stu.map(function (r) { return { tgId: r.tgId }; }));
    if (to !== 'stu') { var logins = {}; stu.forEach(function (r) { logins[r.login] = 1; }); all_('p:').forEach(function (p) { if (!grp || logins[p.login]) list.push({ tgId: p.tgId }); }); }
    var link = appLink_();
    return sendMany_(uniq_(list), function () { return { text: '📢 <b>Ustoz xabari</b>\n\n' + esc_(msg), parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '📚 Platformani ochish', url: link }]] } }; });
  },
  reports: function (input, u) {
    requireAdmin_(u);
    var items = Array.isArray(input.items) ? input.items.slice(0, 500) : [], by = {}, list = [];
    all_('p:').forEach(function (p) { (by[p.login] = by[p.login] || []).push(p); });
    items.forEach(function (it) { (by[String(it.u || '').toLowerCase()] || []).forEach(function (p) { list.push({ tgId: p.tgId, text: String(it.text || '').slice(0, 3500) }); }); });
    var r = sendMany_(list, function (to) { return { text: to.text, parse_mode: 'HTML' }; });
    r.parents = list.length; return r;
  }
};

// Webhook maxfiy kaliti: tokendan hosil qilinadi, Telegram uni har so'rovda qaytaradi
function whSecret_() {
  return Utilities.computeHmacSha256Signature('wh', token_()).map(function (x) { return ('0' + (x & 255).toString(16)).slice(-2); }).join('').slice(0, 32);
}
function handleUpdate_(up) {
  if (!up || up.update_id == null) return;
  var c = CacheService.getScriptCache(), k = 'up:' + up.update_id;
  if (c.get(k)) return; c.put(k, '1', 21600);
  if (up.callback_query) onCallback_(up.callback_query); else onMessage_(up.message);
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doPost(e) {
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (b.tg) {
      if (String(b.s || '') !== whSecret_()) return out_({ ok: false });
      try { setCommands_(); } catch (e1) {}
      handleUpdate_(JSON.parse(b.tg));
      return out_({ ok: true });
    }
    if (!FN[b.fn]) return out_({ ok: false, err: 'Noma’lum amal' });
    var u = verifyInit_(b.initData);
    return out_({ ok: true, r: FN[b.fn](b.input || {}, u) });
  } catch (err) { return out_({ ok: false, err: String(err && err.message || err) }); }
}
function doGet() { return out_({ ok: true, bot: 'ZULPANOV METHODS TARIX' }); }

// ---------------- Bot: xabarlarni qabul qilish (har daqiqada) ----------------
function shareUrl_() {
  var link = 'https://t.me/' + botName_();
  var text = '📚 Tarixdan testlar, jonli turnirlar va o‘yinlar — ZULPANOV METHODS TARIX botiga qo‘shiling! Milliy sertifikatga birga tayyorlanamiz 👇';
  return 'https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(text);
}
function mainKb_() {
  return { inline_keyboard: [
    [{ text: '📚 Testlarni boshlash', url: appLink_() }],
    [{ text: '🏆 Turnirga qo‘shilish', url: appLink_('turnir') }],
    [{ text: '🎓 Kursga yozilish', callback_data: 'kurs' }, { text: '👨‍👩‍👧 Ota-onalar uchun', callback_data: 'ota' }],
    [{ text: '📤 Do‘stlarga ulashish', url: shareUrl_() }, { text: '📞 Ustozga yozish', url: CONTACT_URL }]
  ] };
}
function sendStart_(chat, first) {
  tg_('sendMessage', { chat_id: chat, parse_mode: 'HTML', reply_markup: mainKb_(),
    text: '👋 Assalomu alaykum, ' + first + '!\n\n<b>ZULPANOV METHODS TARIX</b> — tarixni o‘yin va testlar bilan o‘rganing.\n\nBugun nima qilamiz? 👇' });
}
function sendKurs_(chat, from) {
  P.setProperty('st:' + from.id, 'kurs');
  tg_('sendMessage', { chat_id: chat, parse_mode: 'HTML',
    text: '🎓 <b>Tarix kursi</b>\n\n' + esc_(KURS_TEXT) + '\n\n📱 Yozilish uchun pastdagi «Raqamni yuborish» tugmasini bosing yoki telefon raqamingizni yozing.',
    reply_markup: { keyboard: [[{ text: '📱 Raqamni yuborish', request_contact: true }], [{ text: '❌ Bekor qilish' }]], resize_keyboard: true, one_time_keyboard: true } });
}
function sendOta_(chat) {
  tg_('sendMessage', { chat_id: chat, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '📞 Ustozga yozish', url: CONTACT_URL }]] },
    text: '👨‍👩‍👧 <b>Ota-onalar uchun</b>\n\nFarzandingizning test natijalari va ustoz xabarlarini shu bot orqali olib turishingiz mumkin:\n\n1️⃣ Farzandingiz platformada «Statistika» bo‘limini ochadi.\n2️⃣ «✈️ Ota-onamga yuborish» tugmasini bosib, havolani sizga yuboradi.\n3️⃣ Siz havolani bosasiz — tamom, ulandingiz ✅\n\nSavol bo‘lsa, ustozga yozing.' });
}
function kursDone_(chat, from, phone) {
  P.deleteProperty('st:' + from.id);
  var name = [from.first_name, from.last_name].filter(Boolean).join(' ');
  var note = '🎓 <b>Kursga yangi ariza!</b>\n\n👤 ' + esc_(name) + (from.username ? ' (@' + esc_(from.username) + ')' : '') + '\n📱 ' + esc_(phone) + '\n🕒 ' + Utilities.formatDate(new Date(), 'Asia/Samarkand', 'dd.MM.yyyy HH:mm');
  var arr = JSON.parse(P.getProperty('KURS_ARIZALAR') || '[]'); arr.push({ id: from.id, name: name, user: from.username || '', phone: phone, at: Date.now() });
  P.setProperty('KURS_ARIZALAR', JSON.stringify(arr.slice(-100)));
  adminChats_().forEach(function (id) { try { tg_('sendMessage', { chat_id: id, parse_mode: 'HTML', text: note }); } catch (e) { console.error(e); } });
  tg_('sendMessage', { chat_id: chat, text: '✅ Rahmat! Arizangiz qabul qilindi. Ustoz tez orada siz bilan bog‘lanadi.', reply_markup: { remove_keyboard: true } });
  tg_('sendMessage', { chat_id: chat, text: 'Shu orada platformada mashq qilib turing 👇', reply_markup: mainKb_() });
}

function onMessage_(m) {
  if (!m || !m.chat || m.chat.type !== 'private' || !m.from) return;
  var chat = m.chat.id, text = String(m.text || '').trim(), first = esc_(m.from.first_name || '');
  if (isAdminTg_(m.from)) P.setProperty('ADMIN_CHAT', String(chat));
  var st = P.getProperty('st:' + m.from.id);

  if (m.contact) {
    if (st === 'kurs') kursDone_(chat, m.from, m.contact.phone_number);
    return;
  }
  if (st === 'kurs' && text && text.charAt(0) !== '/') {
    if (text === '❌ Bekor qilish') { P.deleteProperty('st:' + m.from.id); tg_('sendMessage', { chat_id: chat, text: 'Bekor qilindi.', reply_markup: { remove_keyboard: true } }); return sendStart_(chat, first); }
    var ph = text.replace(/[^\d+]/g, '');
    if (ph.replace(/\D/g, '').length >= 9) return kursDone_(chat, m.from, ph);
    tg_('sendMessage', { chat_id: chat, text: 'Telefon raqamingizni yozing (masalan, +998 90 123 45 67) yoki «📱 Raqamni yuborish» tugmasini bosing.' });
    return;
  }

  if (text.indexOf('/start') === 0) {
    var arg = text.split(/\s+/)[1] || '';
    if (arg.indexOf('p_') === 0) {
      var raw = arg.slice(2).toLowerCase(), k = raw.lastIndexOf('_'), login = k > 0 ? raw.slice(0, k).replace(/[^a-z0-9_]/g, '') : '', sig = k > 0 ? raw.slice(k + 1) : '';
      if (!login || sig !== psig_(login)) {
        tg_('sendMessage', { chat_id: chat, text: '⚠️ Bu havola eskirgan yoki noto‘g‘ri.\n\nFarzandingizdan yangi havola so‘rang: platforma → «Statistika» → «✈️ Ota-onamga yuborish».' });
        return;
      }
      P.setProperty('p:' + m.from.id + ':' + login, JSON.stringify({ tgId: m.from.id, login: login, name: [m.from.first_name, m.from.last_name].filter(Boolean).join(' '), at: Date.now() }));
      var kid = all_('u:').filter(function (r) { return r.login === login; })[0];
      tg_('sendMessage', { chat_id: chat, parse_mode: 'HTML',
        text: '✅ Assalomu alaykum, ' + first + '!\n\nSiz <b>' + esc_(kid && kid.name ? kid.name : '@' + login) + '</b>ning ota-onasi sifatida ulandingiz.\n\n📊 Farzandingizning test natijalari va ustoz xabarlari shu yerga keladi.',
        reply_markup: { inline_keyboard: [[{ text: '📚 Platformani ochish', url: appLink_() }]] } });
      return;
    }
    if (/^turnir-\d{4}$/.test(arg)) {
      tg_('sendMessage', { chat_id: chat, text: '🏆 Turnir kodi: ' + arg.slice(7) + '\nQo‘shilish uchun tugmani bosing 👇',
        reply_markup: { inline_keyboard: [[{ text: '🏆 Turnirga kirish', url: appLink_(arg) }]] } });
      return;
    }
    if (arg === 'kurs') return sendKurs_(chat, m.from);
    return sendStart_(chat, first);
  }
  if (text === '/kurs') return sendKurs_(chat, m.from);
  if (text === '/ota') return sendOta_(chat);
  if (/^\d{4}$/.test(text)) {
    tg_('sendMessage', { chat_id: chat, text: '🏆 Turnir kodi: ' + text + '\nQo‘shilish uchun tugmani bosing 👇',
      reply_markup: { inline_keyboard: [[{ text: '🏆 Turnirga kirish', url: appLink_('turnir-' + text) }]] } });
    return;
  }
  tg_('sendMessage', { chat_id: chat, text: 'Kerakli bo‘limni tanlang 👇\n\nSavollar bo‘yicha ustozga yozing: ' + CONTACT, reply_markup: mainKb_() });
}

function onCallback_(q) {
  if (!q || !q.from) return;
  try { tg_('answerCallbackQuery', { callback_query_id: q.id }); } catch (e) {}
  var chat = q.message && q.message.chat && q.message.chat.id; if (!chat) return;
  if (q.data === 'kurs') return sendKurs_(chat, q.from);
  if (q.data === 'ota') return sendOta_(chat);
}

function setCommands_() {
  if (P.getProperty('CMDV') === '2') return;
  tg_('setMyCommands', { commands: [
    { command: 'start', description: 'Bosh menyu' },
    { command: 'kurs', description: 'Tarix kursiga yozilish' },
    { command: 'ota', description: 'Ota-onalar uchun' }
  ] });
  P.setProperty('CMDV', '2');
}

function poll() {
  var lock = LockService.getScriptLock(); if (!lock.tryLock(1000)) return;
  try {
    var off = Number(P.getProperty('OFFSET') || 0);
    try { setCommands_(); } catch (e) { console.error(e); }
    var ups = tg_('getUpdates', { offset: off, timeout: 0, allowed_updates: ['message', 'callback_query'] });
    ups.forEach(function (up) {
      P.setProperty('OFFSET', String(up.update_id + 1));
      try { if (up.callback_query) onCallback_(up.callback_query); else onMessage_(up.message); } catch (e) { console.error(e); }
    });
  } finally { lock.releaseLock(); }
}

// ---------------- Webhook rejimi (Cloudflare Worker orqali, tezkor) ----------------
function setupWebhook() {
  if (!WORKER_URL) throw new Error('WORKER_URL bo‘sh');
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'poll') ScriptApp.deleteTrigger(t); });
  try { poll(); } catch (e) {}   // navbatda qolgan xabarlarni olib qo'yish
  tg_('setWebhook', { url: WORKER_URL, secret_token: whSecret_(), allowed_updates: ['message', 'callback_query'], drop_pending_updates: false, max_connections: 20 });
  P.deleteProperty('CMDV'); setCommands_();
  console.log('✅ Webhook yoqildi: ' + WORKER_URL + '\n' + JSON.stringify(tg_('getWebhookInfo')));
}

// ---------------- Bir martalik sozlash (eski usul: har daqiqada tekshirish) ----------------
function setup() {
  tg_('deleteWebhook', { drop_pending_updates: false });
  P.deleteProperty('BOT_NAME');
  var name = botName_();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'poll') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('poll').timeBased().everyMinutes(1).create();
  poll();
  console.log('✅ Tayyor! Bot: @' + name + '. Endi Deploy → New deployment → Web app qiling.');
}
