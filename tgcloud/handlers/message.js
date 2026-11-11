import { api, db } from 'sdk';
import { eq, and } from 'sdk/db';
import { users, parents } from '../schema.js';
import { appLink, esc } from '../lib/common.js';

export default async function (message, ctx) {
  const chat = message.chat && message.chat.id, text = (message.text || '').trim();
  if (!chat || !message.from || message.chat.type !== 'private') return;
  const first = esc(message.from.first_name || '');

  if (text.startsWith('/start')) {
    const arg = text.split(/\s+/)[1] || '';

    // Ota-onani farzandiga ulash: /start p_<login>
    if (arg.startsWith('p_')) {
      const login = arg.slice(2).toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (!login) return;
      const ex = await db.select().from(parents).where(and(eq(parents.tgId, message.from.id), eq(parents.login, login))).get();
      if (!ex) await db.insert(parents).values({ tgId: message.from.id, login, name: [message.from.first_name, message.from.last_name].filter(Boolean).join(' ') });
      const kid = await db.select().from(users).where(eq(users.login, login)).get();
      await api.sendMessage({ chat_id: chat, parse_mode: 'HTML',
        text: `✅ Assalomu alaykum, ${first}!\n\nSiz <b>${esc(kid && kid.name ? kid.name : '@' + login)}</b>ning ota-onasi sifatida ulandingiz.\n\n📊 Farzandingizning test natijalari va ustoz xabarlari shu yerga keladi.`,
        reply_markup: { inline_keyboard: [[{ text: '📚 Platformani ochish', url: await appLink() }]] } });
      return;
    }

    // Turnir havolasi: /start turnir-1234
    if (/^turnir-\d{4}$/.test(arg)) {
      await api.sendMessage({ chat_id: chat, text: `🏆 Turnir kodi: ${arg.slice(7)}\nQo'shilish uchun tugmani bosing 👇`,
        reply_markup: { inline_keyboard: [[{ text: '🏆 Turnirga kirish', url: await appLink(arg) }]] } });
      return;
    }

    await api.sendMessage({ chat_id: chat, parse_mode: 'HTML',
      text: `👋 Assalomu alaykum, ${first}!\n\n<b>ZULPANOV METHODS TARIX</b> — tarix fanidan o'quv platformasi:\n\n📚 Mavzulashgan testlar\n🎓 Milliy sertifikat variantlari\n🏆 Jonli va jamoaviy turnirlar\n📊 Shaxsiy statistika va sertifikatlar\n\nBoshlash uchun pastdagi tugmani bosing 👇`,
      reply_markup: { inline_keyboard: [[{ text: '📚 Testlarni ochish', url: await appLink() }]] } });
    return;
  }

  await api.sendMessage({ chat_id: chat, text: "📚 Platformani ochish uchun pastdagi «📚 Testlar» tugmasini yoki /start ni bosing.\n\nSavollar bo'yicha ustozga yozing: @ZULPANOV_METHODS" });
}
