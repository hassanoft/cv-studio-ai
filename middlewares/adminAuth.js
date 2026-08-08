/**
 * middlewares/adminAuth.js
 * Bloque l'acces aux commandes/callbacks reserves aux administrateurs
 * definis dans ADMIN_IDS (.env). Empeche tout acces admin non autorise.
 */

const { isAdmin } = require('../config/admin');
const logger = require('../utils/logger');

function requireAdmin() {
  return async (ctx, next) => {
    const userId = ctx.from && ctx.from.id;
    if (!userId || !isAdmin(userId)) {
      logger.warn(`[ADMIN_AUTH] Acces refuse pour l'utilisateur ${userId}`);
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('⛔ Accès réservé aux administrateurs.', { show_alert: true });
      } else {
        await ctx.reply('⛔ Cette commande est réservée aux administrateurs.');
      }
      return;
    }
    return next();
  };
}

module.exports = { requireAdmin };
