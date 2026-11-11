import { db } from 'sdk';
import { users, parents } from '../schema.js';
import { requireAdmin, sendMany, appLink, esc } from '../lib/common.js';

// Ustoz: erkin xabar (o'quvchilarga / ota-onalarga / hammaga)
export default async function (input, ctx) {
  await requireAdmin(ctx);
  const to = String(input.to || 'stu'), grp = String(input.grp || ''), msg = String(input.text || '').trim().slice(0, 3500);
  if (!msg) return { sent: 0, failed: 0 };
  const stu = (await db.select().from(users).all()).filter(r => !r.isAdmin && (!grp || r.grp === grp));
  let list = [];
  if (to !== 'par') list = list.concat(stu.map(r => ({ tgId: r.tgId })));
  if (to !== 'stu') { const logins = new Set(stu.map(r => r.login)); (await db.select().from(parents).all()).forEach(p => { if (!grp || logins.has(p.login)) list.push({ tgId: p.tgId }); }); }
  const seen = new Set(); list = list.filter(x => !seen.has(x.tgId) && seen.add(x.tgId));
  const link = await appLink();
  return await sendMany(list, async () => ({ text: `📢 <b>Ustoz xabari</b>\n\n${esc(msg)}`, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '📚 Platformani ochish', url: link }]] } }));
}
