import { db } from 'sdk';
import { eq } from 'sdk/db';
import { users } from '../schema.js';

// Mini App: o'quvchi Telegram ichida hisobidan chiqsa, bog'lanish uziladi
export default async function (input, ctx) {
  const u = ctx.initData.user; if (!u) return { ok: false };
  const r = await db.select().from(users).where(eq(users.tgId, u.id)).get();
  if (r && r.isAdmin && !input.admin) return { ok: true };
  await db.delete(users).where(eq(users.tgId, u.id));
  return { ok: true };
}
