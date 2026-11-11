import { api, db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { users } from '../schema.js';

// Sayt bilan bir xil admin login va parol izi (SHA-256)
export const ADMIN = { login: 'zulpanov', salt: 'd325ce6694515af7', hash: '47a3754c2847314f87b070934ef6c8ecc9480f5d2b974cfd8b8931ed370782ec' };

let me = null;
export async function botName() { if (!me) me = await api.getMe(); return me.username; }
export async function appLink(param) { const b = await botName(); return `https://t.me/${b}?startapp` + (param ? '=' + encodeURIComponent(param) : ''); }

export async function requireAdmin(ctx) {
  const u = ctx.initData && ctx.initData.user;
  if (!u) throw new EndpointError('Telegram foydalanuvchisi aniqlanmadi', { code: 'NO_USER' });
  const row = await db.select().from(users).where(eq(users.tgId, u.id)).get();
  if (!row || !row.isAdmin) throw new EndpointError("Faqat ustoz uchun", { code: 'NOT_ADMIN' });
  return row;
}

export const sleep = ms => (typeof setTimeout === 'function' ? new Promise(r => setTimeout(r, ms)) : Promise.resolve());

// Ko'p xabar yuborish: xatolarni sanaydi, Telegram cheklovini hisobga oladi
export async function sendMany(list, build) {
  let sent = 0, failed = 0;
  for (const to of list) {
    try { await api.sendMessage({ chat_id: to.tgId, ...(await build(to)) }); sent++; }
    catch (e) {
      if (e && e.code === 429 && e.parameters && e.parameters.retry_after) {
        await sleep((e.parameters.retry_after + 1) * 1000);
        try { await api.sendMessage({ chat_id: to.tgId, ...(await build(to)) }); sent++; continue; } catch (e2) {}
      }
      failed++;
    }
    if ((sent + failed) % 25 === 0) await sleep(1100);
  }
  return { sent, failed };
}

export const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// SHA-256 (sof JS) — admin parolini tekshirish uchun
export function sha256hex(str) {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const bytes = [], s = unescape(encodeURIComponent(str));
  for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i));
  const l = bytes.length * 8; bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (l >>> (i * 8)) & 255);
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const r = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < bytes.length; o += 64) {
    const w = new Array(64);
    for (let i = 0; i < 16; i++) w[i] = (bytes[o + i * 4] << 24) | (bytes[o + i * 4 + 1] << 16) | (bytes[o + i * 4 + 2] << 8) | bytes[o + i * 4 + 3];
    for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) { const S1 = r(e, 6) ^ r(e, 11) ^ r(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[i] + w[i]) | 0, S0 = r(a, 2) ^ r(a, 13) ^ r(a, 22), mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0; }
    H = [H[0] + a, H[1] + b, H[2] + c, H[3] + d, H[4] + e, H[5] + f, H[6] + g, H[7] + h].map(x => x | 0);
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
