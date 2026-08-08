/**
 * commands/subscription.js
 * Affiche les plans d'abonnement (generations illimitees).
 */

const { subscriptionInline } = require('../utils/keyboards');

function register(bot) {
  const show = async (ctx) => {
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    await ctx.reply(
      "👑 *Abonnement CV Studio AI*\n\nPendant un abonnement actif, vos CV et portfolios sont générés en illimité, sans consommer de H$Λ.\n\nChoisissez une formule :",
      { parse_mode: 'Markdown', ...subscriptionInline() }
    );
  };

  bot.command('abonnement', show);
  bot.action('SUBSCRIPTION', show);
  bot.hears('👑 Abonnement', show);
}

module.exports = { register };
