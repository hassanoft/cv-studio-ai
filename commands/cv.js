/**
 * commands/cv.js
 * Point d'entree pour la creation d'un CV (commande, bouton menu, bouton clavier).
 */

function register(bot) {
  const enter = async (ctx) => {
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    await ctx.scene.enter('CV_WIZARD');
  };

  bot.command('cv', enter);
  bot.action('CREATE_CV', enter);
  bot.hears('📄 Creer un CV', enter);
}

module.exports = { register };
