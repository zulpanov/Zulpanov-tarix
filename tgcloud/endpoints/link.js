import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { users } from '../schema.js';
import { isAdminTg } from '../lib/common.js';

// Mini App: o'quvchi saytga kirgach, Telegram hisobini sayt hisobiga bog'laydi (parol saqlanmaydi)
export default async function (input, ctx) {
  const u = ctx.initData.user;
  if (!u) throw new EndpointError('Telegram foydalanuvchisi aniqlanmadi', { code: 'NO_USER' });
  const login = String(input.login || '').toLowerCase().trim().slice(0, 40);
  if (!login) throw new EndpointError('Login kerak', { code: 'BAD_INPUT' });
  const isAdmin = isAdminTg(u);
  const row = { login, name: String(input.name || '').slice(0, 80), grp: String(input.grp || '').slice(0, 40), isAdmin };
  const ex = await db.select().from(users).where(eq(users.tgId, u.id)).get();
  if (ex) await db.update(users).set(row).where(eq(users.tgId, u.id));
  else await db.insert(users).values({ tgId: u.id, ...row });
  return { ok: true, admin: isAdmin };
}
