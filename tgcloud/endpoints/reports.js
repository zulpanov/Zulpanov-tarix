import { db } from 'sdk';
import { parents } from '../schema.js';
import { requireAdmin, sendMany } from '../lib/common.js';

// Ustoz: ota-onalarga farzandining natijalari (matnni sayt tayyorlaydi)
export default async function (input, ctx) {
  await requireAdmin(ctx);
  const items = Array.isArray(input.items) ? input.items.slice(0, 500) : [];
  const all = await db.select().from(parents).all();
  const byLogin = {}; all.forEach(p => { (byLogin[p.login] = byLogin[p.login] || []).push(p); });
  const list = []; items.forEach(it => (byLogin[String(it.u || '').toLowerCase()] || []).forEach(p => list.push({ tgId: p.tgId, text: String(it.text || '').slice(0, 3500) })));
  const r = await sendMany(list, async to => ({ text: to.text, parse_mode: 'HTML' }));
  return { ...r, parents: list.length };
}
