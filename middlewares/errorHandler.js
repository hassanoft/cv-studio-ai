/**
 * middlewares/errorHandler.js
 * Gestion centralisee des erreurs : bot Telegram (Telegraf) et
 * serveur Express. Empeche tout crash du process sur une erreur
 * non geree au sein d'un handler.
 */

const logger = require('../utils/logger');

/** A utiliser avec bot.catch(telegrafErrorHandler) */
async function telegrafErrorHandler(err, ctx) {
  logger.error(`[BOT] Erreur sur update ${ctx.updateType}:`, err);
  try {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery('⚠️ Une erreur est survenue.', { show_alert: true }).catch(() => {});
    }
    await ctx.reply(
      "⚠️ Une erreur inattendue est survenue. L'équipe technique a été notifiée. Merci de réessayer dans un instant."
    );
  } catch (sendErr) {
    logger.error('[BOT] Echec envoi du message d’erreur a l’utilisateur:', sendErr);
  }
}

/** Middleware d'erreur Express (4 arguments obligatoires) */
// eslint-disable-next-line no-unused-vars
function expressErrorHandler(err, req, res, next) {
  logger.error('[HTTP] Erreur serveur:', err);
  if (res.headersSent) return;
  res.status(500).send('Erreur interne du serveur.');
}

module.exports = { telegrafErrorHandler, expressErrorHandler };
