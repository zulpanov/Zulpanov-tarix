import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { users } from '../schema.js';
import { ADMIN, sha256hex } from '../lib/common.js';

// Mini App: o'quvchi saytga kirgach, Telegram hisobini sayt hisobiga bog'laydi
export default async function (input, ctx) {
  const u = ctx.initData.user;
  if (!u) throw new EndpointError('Telegram foydalanuvchisi aniqlanmadi', { code: 'NO_USER' });
  const login = String(input.login || '').toLowerCase().trim().slice(0, 40), pw = String(input.pw || '').slice(0, 100);
  if (!login) throw new EndpointError('Login kerak', { code: 'BAD_INPUT' });
  let isAdmin = false;
  if (input.admin) {
    if (login !== ADMIN.login || sha256hex(ADMIN.salt + ':' + login + ':' + pw) !== ADMIN.hash) throw new EndpointError("Admin paroli noto'g'ri", { code: 'BAD_ADMIN' });
    isAdmin = true;
  }
  const row = { login, pw, name: String(input.name || '').slice(0, 80), grp: String(input.grp || '').slice(0, 40), isAdmin };
  const ex = await db.select().from(users).where(eq(users.tgId, u.id)).get();
  if (ex) {
    if (ex.isAdmin && !isAdmin) { if (login === ex.login) return { ok: true, admin: true }; }
    await db.update(users).set(isAdmin ? row : { ...row, isAdmin: ex.isAdmin && login === ex.login }).where(eq(users.tgId, u.id));
  } else await db.insert(users).values({ tgId: u.id, ...row });
  return { ok: true, admin: isAdmin };
}
