/**
 * commands/start.js
 * Commande /start — creation automatique du compte + bonus de bienvenue.
 */

const userModel = require('../database/models/userModel');
const { mainReplyKeyboard, mainMenuInline } = require('../utils/keyboards');
const { WELCOME_BONUS, formatCredits } = require('../config/prices');
const { escapeMarkdownLegacy } = require('../utils/formatters');

function register(bot) {
  bot.start(async (ctx) => {
    const { user, isNew } = userModel.findOrCreate(ctx.from);
    const firstName = escapeMarkdownLegacy(ctx.from.first_name || '');

    const welcomeText = isNew
      ? [
          `👋 Bienvenue *${firstName}* sur *CV Studio AI* !`,
          '',
          '📄 Créez un CV professionnel en image HD.',
          '🌐 Créez un portfolio web avec lien unique.',
          '',
          `🎁 Vous avez reçu *${formatCredits(WELCOME_BONUS)}* de crédit de bienvenue !`,
          `💰 Solde actuel : *${formatCredits(user.balance)}*`,
          '',
          'Que souhaitez-vous faire ?',
        ].join('\n')
      : [
          `👋 Content de vous revoir, *${firstName}* !`,
          `💰 Solde actuel : *${formatCredits(user.balance)}*`,
          '',
          'Que souhaitez-vous faire ?',
        ].join('\n');

    await ctx.reply(welcomeText, { parse_mode: 'Markdown', ...mainReplyKeyboard() });
    await ctx.reply('📋 Menu principal', mainMenuInline());
  });
}

module.exports = { register };
