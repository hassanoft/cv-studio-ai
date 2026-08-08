/**
 * middlewares/antiSpam.js
 * Limite la frequence des requetes par utilisateur pour eviter le
 * flood / spam (protection simple en memoire, sans dependance externe).
 */

const logger = require('../utils/logger');

const MIN_INTERVAL_MS = 600; // ~1.6 requete / seconde max par utilisateur
const lastActionByUser = new Map();

function antiSpam() {
  return async (ctx, next) => {
    const userId = ctx.from && ctx.from.id;
    if (!userId) return next();

    const now = Date.now();
    const last = lastActionByUser.get(userId) || 0;

    if (now - last < MIN_INTERVAL_MS) {
      // Requete ignoree silencieusement pour eviter de spammer l'utilisateur en retour
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery().catch(() => {});
      }
      logger.warn(`[ANTI_SPAM] Requete ignoree (trop rapide) - user ${userId}`);
      return;
    }

    lastActionByUser.set(userId, now);
    return next();
  };
}

module.exports = { antiSpam };
