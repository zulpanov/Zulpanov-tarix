import { api, db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { users } from '../schema.js';

// Ustoz (admin) — Telegram username bo'yicha. Telegram buni o'zi tasdiqlaydi (initData), parol kerak emas.
export const ADMIN_TG = ['zulpanov_methods'];
export const isAdminTg = u => !!(u && u.username && ADMIN_TG.includes(String(u.username).toLowerCase()));

let me = null;
export async function botName() { if (!me) me = await api.getMe(); return me.username; }
export async function appLink(param) { const b = await botName(); return `https://t.me/${b}?startapp` + (param ? '=' + encodeURIComponent(param) : ''); }

export async function requireAdmin(ctx) {
  const u = ctx.initData && ctx.initData.user;
  if (!u) throw new EndpointError('Telegram foydalanuvchisi aniqlanmadi', { code: 'NO_USER' });
  if (!isAdminTg(u)) throw new EndpointError("Faqat ustoz uchun", { code: 'NOT_ADMIN' });
  return (await db.select().from(users).where(eq(users.tgId, u.id)).get()) || { tgId: u.id, isAdmin: true };
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
