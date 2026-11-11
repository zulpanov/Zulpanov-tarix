import { db } from 'sdk';
import { eq } from 'sdk/db';
import { users } from '../schema.js';

// Mini App: shu Telegram hisobiga bog'langan sayt logini (parolsiz)
export default async function (input, ctx) {
  const u = ctx.initData.user; if (!u) return null;
  const r = await db.select().from(users).where(eq(users.tgId, u.id)).get();
  return r ? { login: r.login, admin: !!r.isAdmin } : null;
}
