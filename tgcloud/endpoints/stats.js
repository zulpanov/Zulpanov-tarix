import { db } from 'sdk';
import { users, parents } from '../schema.js';
import { requireAdmin } from '../lib/common.js';

// Ustoz: botga ulanganlar soni
export default async function (input, ctx) {
  await requireAdmin(ctx);
  const u = await db.select().from(users).all(), p = await db.select().from(parents).all();
  const grp = {}; u.filter(r => !r.isAdmin).forEach(r => { const g = r.grp || '—'; grp[g] = (grp[g] || 0) + 1; });
  return { students: u.filter(r => !r.isAdmin).length, parents: p.length, kids: new Set(p.map(x => x.login)).size, groups: grp };
}
