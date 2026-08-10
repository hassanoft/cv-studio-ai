/**
 * commands/creations.js
 * Liste les CV et portfolios de l'utilisateur ("Mes créations")
 * et permet de les rouvrir / retélécharger.
 */

const { Markup } = require('telegraf');
const cvModel = require('../database/models/cvModel');
const portfolioModel = require('../database/models/portfolioModel');
const { formatDate, escapeMarkdownLegacy } = require('../utils/formatters');
const { backToMenuInline } = require('../utils/keyboards');
const { env } = require('../config/env');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');

function register(bot) {
  const show = async (ctx) => {
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const userId = ctx.from.id;

    const cvs = cvModel.listByUser(userId);
    const portfolios = portfolioModel.listByUser(userId);

    if (cvs.length === 0 && portfolios.length === 0) {
      await ctx.reply(
        "🗂 Vous n'avez encore créé aucun CV ni portfolio.\n\nUtilisez le menu pour commencer !",
        backToMenuInline()
      );
      return;
    }

    if (cvs.length > 0) {
      const rows = cvs.map((cv) => [
        Markup.button.callback(`📄 ${cv.full_name} — ${formatDate(cv.created_at)}`, `RESEND_CV_${cv.id}`),
      ]);
      await ctx.reply('📄 *Vos CV*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard(rows) });
    }

    if (portfolios.length > 0) {
      const lines = portfolios.map(
        (p) => `🌐 *${escapeMarkdownLegacy(p.full_name)}* (${formatDate(p.created_at)})\n${env.PUBLIC_BASE_URL}${p.url_path}`
      );
      await ctx.reply(`🌐 *Vos Portfolios*\n\n${lines.join('\n\n')}`, { parse_mode: 'Markdown' });
    }

    await ctx.reply('⬅️ Revenir au menu principal', backToMenuInline());
  };

  bot.command('creations', show);
  bot.action('MY_CREATIONS', show);
  bot.hears('🗂 Mes creations', show);

  bot.action(/RESEND_CV_(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const cvId = ctx.match[1];
    const cv = cvModel.findById(cvId);

    if (!cv || cv.user_id !== ctx.from.id) {
      await ctx.reply('❌ CV introuvable.');
      return;
    }

    try {
      await withRetry(() => ctx.replyWithPhoto({ source: cv.file_path }, { caption: `📄 ${cv.full_name}` }), {
        retries: 2,
        delayMs: 1500,
        label: 'renvoi du CV',
      });
    } catch (err) {
      logger.error('[CREATIONS] Echec envoi CV:', err.message);
      await ctx.reply("❌ Impossible de renvoyer ce fichier pour le moment (problème réseau). Réessayez dans un instant.");
    }
  });
}

module.exports = { register };
