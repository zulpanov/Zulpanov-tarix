import { db } from 'sdk';
import { users } from '../schema.js';
import { requireAdmin, sendMany, appLink, esc } from '../lib/common.js';

// Ustoz: yangi uy vazifasi haqida xabar
export default async function (input, ctx) {
  await requireAdmin(ctx);
  const grp = String(input.grp || '');
  const all = await db.select().from(users).all();
  const list = all.filter(r => !r.isAdmin && (!grp || grp === '*' || r.grp === grp));
  const link = await appLink();
  const text = `📝 <b>Yangi uy vazifasi!</b>\n\n📚 ${esc(input.ttl || '')}\n⏰ Muddat: <b>${esc(input.due || '')}</b>${input.note ? `\n💬 ${esc(input.note)}` : ''}\n\nBajarish uchun tugmani bosing 👇`;
  return await sendMany(list, async () => ({ text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '📝 Vazifani bajarish', url: link }]] } }));
}
