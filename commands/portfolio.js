/**
 * commands/portfolio.js
 * Point d'entree pour la creation d'un portfolio (commande, bouton menu, bouton clavier).
 */

function register(bot) {
  const enter = async (ctx) => {
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    await ctx.scene.enter('PORTFOLIO_WIZARD');
  };

  bot.command('portfolio', enter);
  bot.action('CREATE_PORTFOLIO', enter);
  bot.hears('🌐 Creer un Portfolio', enter);
}

module.exports = { register };
