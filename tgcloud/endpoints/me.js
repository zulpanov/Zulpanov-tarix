import { db } from 'sdk';
import { eq } from 'sdk/db';
import { users } from '../schema.js';

// Mini App: shu Telegram hisobiga bog'langan sayt hisobi (avtomatik kirish uchun)
export default async function (input, ctx) {
  const u = ctx.initData.user; if (!u) return null;
  const r = await db.select().from(users).where(eq(users.tgId, u.id)).get();
  return r ? { login: r.login, pw: r.pw, admin: !!r.isAdmin } : null;
}
