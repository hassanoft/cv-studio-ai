/**
 * commands/menu.js
 * Commande /menu — reaffiche le menu principal (inline).
 */

const { mainMenuInline, backToMenuInline } = require('../utils/keyboards');
const { COSTS, formatCredits } = require('../config/prices');

const HELP_TEXT = [
  'ℹ️ *Aide — CV Studio AI*',
  '',
  `📄 *Créer un CV* (${formatCredits(COSTS.CV)}) : CV professionnel en image PNG HD.`,
  `🌐 *Créer un Portfolio* (${formatCredits(COSTS.PORTFOLIO)}) : site web avec lien unique.`,
  '👤 *Mon compte* : solde, abonnement, statistiques.',
  '🗂 *Mes créations* : retrouvez vos CV et portfolios.',
  '💳 *Boutique* : achetez des crédits H$Λ (paiement Wave, validation manuelle).',
  '👑 *Abonnement* : générations illimitées pendant la durée choisie.',
  '',
  'Tapez /annuler pour arrêter une création en cours.',
].join('\n');

function register(bot) {
  bot.command('menu', async (ctx) => {
    await ctx.reply('📋 Menu principal', mainMenuInline());
  });

  bot.command('aide', async (ctx) => {
    await ctx.reply(HELP_TEXT, { parse_mode: 'Markdown', ...backToMenuInline() });
  });
  bot.hears('ℹ️ Aide', async (ctx) => {
    await ctx.reply(HELP_TEXT, { parse_mode: 'Markdown', ...backToMenuInline() });
  });

  bot.action('BACK_TO_MENU', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    await ctx.editMessageText('📋 Menu principal', mainMenuInline()).catch(async () => {
      await ctx.reply('📋 Menu principal', mainMenuInline());
    });
  });
}

module.exports = { register };
