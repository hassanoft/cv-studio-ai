/**
 * handlers/adminHandler.js
 * Navigation du panneau d'administration + validation/refus manuel
 * des paiements.
 */

const { requireAdmin } = require('../middlewares/adminAuth');
const paymentService = require('../services/paymentService');
const transactionModel = require('../database/models/transactionModel');
const userModel = require('../database/models/userModel');
const cvModel = require('../database/models/cvModel');
const portfolioModel = require('../database/models/portfolioModel');
const { formatFCFA } = require('../config/prices');
const { formatDateTime, escapeMarkdownLegacy } = require('../utils/formatters');
const { adminPanelInline, adminValidationInline } = require('../utils/keyboards');
const { env } = require('../config/env');
const { COSTS, WELCOME_BONUS, CREDIT_PACKS, SUBSCRIPTION_PLANS } = require('../config/prices');
const logger = require('../utils/logger');

function register(bot) {
  // ---------- Demandes en attente ----------
  bot.action('ADMIN_PENDING', requireAdmin(), async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const pending = transactionModel.listPending();

    if (pending.length === 0) {
      await ctx.reply('📥 Aucune demande en attente.', adminPanelInline());
      return;
    }

    await ctx.reply(`📥 *${pending.length} demande(s) en attente*`, { parse_mode: 'Markdown' });
    for (const t of pending) {
      const user = userModel.findById(t.user_id);
      const name = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : 'Inconnu';
      const username = user && user.username ? `@${user.username}` : 'sans pseudo';
      await ctx.reply(
        [
          `👤 ${name} (${username})`,
          `🆔 ${t.user_id}`,
          `📦 ${t.product_label}`,
          `💰 ${formatFCFA(t.amount_fcfa)}`,
          `🕒 ${formatDateTime(t.created_at)}`,
        ].join('\n'),
        adminValidationInline(t.id)
      );
    }
  });

  // ---------- Historique des paiements ----------
  bot.action('ADMIN_HISTORY', requireAdmin(), async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const history = transactionModel.listHistory(20);

    if (history.length === 0) {
      await ctx.reply('💰 Aucun historique pour le moment.', adminPanelInline());
      return;
    }

    const lines = history.map((t) => {
      const icon = t.status === 'validated' ? '✅' : '❌';
      return `${icon} ${t.product_label} — ${formatFCFA(t.amount_fcfa)} — user ${t.user_id} — ${formatDateTime(
        t.processed_at
      )}`;
    });

    await ctx.reply(`💰 *Historique (20 derniers)*\n\n${lines.join('\n')}`, {
      parse_mode: 'Markdown',
      ...adminPanelInline(),
    });
  });

  // ---------- Utilisateurs ----------
  bot.action('ADMIN_USERS', requireAdmin(), async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const stats = userModel.stats();
    const recent = userModel.recentUsers(15);

    const lines = recent.map((u) => {
      const name = escapeMarkdownLegacy([u.first_name, u.last_name].filter(Boolean).join(' ')) || 'Sans nom';
      return `• ${name} (${u.id}) — ${u.balance} H$Λ`;
    });

    await ctx.reply(
      [
        `👥 *Utilisateurs* — total : ${stats.totalUsers}`,
        '',
        '*15 derniers inscrits :*',
        ...lines,
      ].join('\n'),
      { parse_mode: 'Markdown', ...adminPanelInline() }
    );
  });

  // ---------- Abonnements ----------
  bot.action('ADMIN_SUBS', requireAdmin(), async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const stats = userModel.stats();
    await ctx.reply(`👑 *Abonnements actifs* : ${stats.activeSubscriptions}`, {
      parse_mode: 'Markdown',
      ...adminPanelInline(),
    });
  });

  // ---------- Statistiques ----------
  bot.action('ADMIN_STATS', requireAdmin(), async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const userStats = userModel.stats();
    const txCounts = transactionModel.countsByStatus();
    const revenue = transactionModel.totalValidatedRevenue();

    await ctx.reply(
      [
        '📊 *Statistiques globales*',
        '',
        `👥 Utilisateurs : ${userStats.totalUsers}`,
        `👑 Abonnements actifs : ${userStats.activeSubscriptions}`,
        `💰 Solde total en circulation : ${userStats.totalBalance} H$Λ`,
        '',
        `📄 CV générés : ${cvModel.countAll()}`,
        `🌐 Portfolios générés : ${portfolioModel.countAll()}`,
        '',
        `📥 Transactions en attente : ${txCounts.pending}`,
        `✅ Validées : ${txCounts.validated}`,
        `❌ Refusées : ${txCounts.refused}`,
        `💵 Revenu total validé : ${formatFCFA(revenue)}`,
      ].join('\n'),
      { parse_mode: 'Markdown', ...adminPanelInline() }
    );
  });

  // ---------- Parametres ----------
  bot.action('ADMIN_SETTINGS', requireAdmin(), async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const packsList = CREDIT_PACKS.map((p) => `• ${p.credits} H$Λ = ${formatFCFA(p.price)}`).join('\n');
    const plansList = SUBSCRIPTION_PLANS.map((p) => `• ${p.label} = ${formatFCFA(p.price)}`).join('\n');

    await ctx.reply(
      [
        '⚙️ *Paramètres actuels*',
        '',
        `🎁 Bonus de bienvenue : ${WELCOME_BONUS} H$Λ`,
        `📄 Coût CV : ${COSTS.CV} H$Λ`,
        `🌐 Coût Portfolio : ${COSTS.PORTFOLIO} H$Λ`,
        '',
        '*Packs de crédits :*',
        packsList,
        '',
        '*Abonnements :*',
        plansList,
        '',
        `👤 Administrateurs configurés : ${env.ADMIN_IDS.length}`,
        '',
        'ℹ️ Pour modifier ces valeurs, éditez config/prices.js puis redéployez.',
      ].join('\n'),
      { parse_mode: 'Markdown', ...adminPanelInline() }
    );
  });

  // ---------- Validation ----------
  bot.action(/ADMIN_VALIDATE_(.+)/, requireAdmin(), async (ctx) => {
    const transactionId = ctx.match[1];
    try {
      const { transaction, user } = await paymentService.approve(ctx.telegram, transactionId, ctx.from.id);
      await ctx.answerCbQuery('✅ Paiement validé.').catch(() => {});

      const notifText =
        transaction.type === 'credit_pack'
          ? `✅ Votre paiement a été validé !\n\n💰 ${transaction.credits} H$Λ ont été ajoutés à votre solde.\n💳 Nouveau solde : ${user.balance} H$Λ`
          : `✅ Votre paiement a été validé !\n\n👑 Votre abonnement "${transaction.product_label}" est maintenant actif.`;

      await ctx.telegram.sendMessage(transaction.user_id, notifText).catch(() => {});
    } catch (err) {
      logger.error('[ADMIN_HANDLER] Erreur validation:', err);
      await ctx.answerCbQuery(`❌ ${err.message}`, { show_alert: true }).catch(() => {});
    }
  });

  // ---------- Refus ----------
  bot.action(/ADMIN_REFUSE_(.+)/, requireAdmin(), async (ctx) => {
    const transactionId = ctx.match[1];
    try {
      const { transaction } = await paymentService.reject(ctx.telegram, transactionId, ctx.from.id);
      await ctx.answerCbQuery('❌ Paiement refusé.').catch(() => {});

      await ctx.telegram
        .sendMessage(
          transaction.user_id,
          `❌ Votre paiement pour "${transaction.product_label}" n'a pas été validé.\n\nVous pouvez soumettre une nouvelle demande depuis la Boutique.`
        )
        .catch(() => {});
    } catch (err) {
      logger.error('[ADMIN_HANDLER] Erreur refus:', err);
      await ctx.answerCbQuery(`❌ ${err.message}`, { show_alert: true }).catch(() => {});
    }
  });
}

module.exports = { register };
