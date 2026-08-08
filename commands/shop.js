/**
 * commands/shop.js
 * Affiche la boutique de credits H$Λ.
 */

const { shopInline } = require('../utils/keyboards');

function register(bot) {
  const show = async (ctx) => {
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    await ctx.reply('💳 *Boutique de crédits H$Λ*\n\nChoisissez un pack :', {
      parse_mode: 'Markdown',
      ...shopInline(),
    });
  };

  bot.command('boutique', show);
  bot.action('SHOP', show);
  bot.hears('💳 Boutique', show);
}

module.exports = { register };
