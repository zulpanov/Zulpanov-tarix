import { db } from 'sdk';
import { users } from '../schema.js';
import { requireAdmin, sendMany, appLink, esc } from '../lib/common.js';

// Ustoz: turnir haqida o'quvchilarga xabar
export default async function (input, ctx) {
  await requireAdmin(ctx);
  const code = String(input.code || '').replace(/\D/g, '').slice(0, 4), grp = String(input.grp || '');
  const all = await db.select().from(users).all();
  const list = all.filter(r => !r.isAdmin && (!grp || r.grp === grp));
  const link = await appLink('turnir-' + code);
  const text = `${input.team ? '👥 <b>Jamoaviy turnir!</b>' : '🏆 <b>Turnir boshlanmoqda!</b>'}\n\n📚 ${esc(input.ttl || '')}\n🔢 Kod: <b>${code}</b>${input.n ? `\n❓ ${+input.n} ta savol` : ''}${input.dur ? ` · ⏱ ${+input.dur} daqiqa` : ''}\n\nQo'shilish uchun tugmani bosing 👇`;
  return await sendMany(list, async () => ({ text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '🏆 Turnirga kirish', url: link }]] } }));
}
