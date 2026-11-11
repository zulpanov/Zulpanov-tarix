import { table, integer, text, boolean, index, sql } from 'sdk/db';

// O'quvchi (yoki ustoz) Telegram hisobi ↔ sayt hisobi
export const users = table('users', {
  tgId:    integer('tg_id').primaryKey(),
  login:   text('login').notNull(),
  name:    text('name'),
  grp:     text('grp'),
  isAdmin: boolean('is_admin').default(false),
  at:      integer('at').default(sql`(unixepoch())`),
}, (t) => ({
  loginIdx: index('idx_users_login').on(t.login),
}));

// Ota-ona Telegram hisobi ↔ farzandining logini
export const parents = table('parents', {
  id:    integer('id').primaryKey({ autoIncrement: true }),
  tgId:  integer('tg_id').notNull(),
  login: text('login').notNull(),
  name:  text('name'),
  at:    integer('at').default(sql`(unixepoch())`),
}, (t) => ({
  loginIdx: index('idx_parents_login').on(t.login),
  pairIdx:  index('idx_parents_pair').on(t.tgId, t.login),
}));
