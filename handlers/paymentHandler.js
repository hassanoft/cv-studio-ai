/**
 * handlers/paymentHandler.js
 * Flux complet d'achat : choix du pack/abonnement -> affichage du lien
 * Wave (montant injecté dynamiquement) -> confirmation "J'ai payé" ->
 * notification admin -> attente de validation manuelle.
 *
 * Aucune verification automatique de paiement n'est effectuee.
 */

const paymentService = require('../services/paymentService');
const transactionModel = require('../database/models/transactionModel');
const { findCreditPack, findSubscriptionPlan, formatFCFA } = require('../config/prices');
const { paidConfirmationInline, backToMenuInline, mainReplyKeyboard } = require('../utils/keyboards');
const { escapeMarkdownLegacy } = require('../utils/formatters');
const logger = require('../utils/logger');

function paymentPrompt(productLabel, amountFcfa, waveLink) {
  // Le lien Wave contient des "_" (ex: M_ci_knlRyepWBd4f) qui sont des
  // caracteres speciaux en Markdown (italique). Sans echappement,
  // Telegram les interprete comme de la mise en forme et les supprime
  // de l'affichage, ce qui casse le lien de paiement.
  const safeLink = escapeMarkdownLegacy(waveLink);
  return [
    `🧾 *${productLabel}*`,
    `💰 Montant à payer : *${formatFCFA(amountFcfa)}*`,
    '',
    `1️⃣ Effectuez le paiement via Wave : ${safeLink}`,
    '2️⃣ Une fois le paiement effectué, tapotez sur "✅ J\'ai payé" ci-dessous.',
    '',
    "⚠️ La validation est manuelle. Vous recevrez une notification dès qu'un administrateur aura traité votre demande.",
  ].join('\n');
}

function register(bot) {
  // --- Choix d'un pack de credits ---
  bot.action(/BUY_CREDIT_(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const packId = ctx.match[1];
    const pack = findCreditPack(packId);
    if (!pack) {
      await ctx.reply('❌ Pack introuvable.');
      return;
    }

    try {
      const transaction = paymentService.createCreditOrder(ctx.from.id, packId);
      const waveLink = paymentService.buildWaveLink(transaction.amount_fcfa);
      await ctx.reply(paymentPrompt(transaction.product_label, transaction.amount_fcfa, waveLink), {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...paidConfirmationInline(transaction.id),
      });
    } catch (err) {
      await ctx.reply(`❌ ${err.message}`, backToMenuInline());
    }
  });

  // --- Choix d'un plan d'abonnement ---
  bot.action(/BUY_SUB_(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const planId = ctx.match[1];
    const plan = findSubscriptionPlan(planId);
    if (!plan) {
      await ctx.reply('❌ Formule introuvable.');
      return;
    }

    try {
      const transaction = paymentService.createSubscriptionOrder(ctx.from.id, planId);
      const waveLink = paymentService.buildWaveLink(transaction.amount_fcfa);
      await ctx.reply(paymentPrompt(transaction.product_label, transaction.amount_fcfa, waveLink), {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...paidConfirmationInline(transaction.id),
      });
    } catch (err) {
      await ctx.reply(`❌ ${err.message}`, backToMenuInline());
    }
  });

  // --- "J'ai payé" ---
  bot.action(/CONFIRM_PAID_(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const transactionId = ctx.match[1];
    const transaction = transactionModel.findById(transactionId);

    if (!transaction || transaction.user_id !== ctx.from.id) {
      await ctx.reply('❌ Commande introuvable.');
      return;
    }
    if (transaction.status !== 'pending') {
      await ctx.reply('ℹ️ Cette commande a déjà été traitée.');
      return;
    }

    try {
      await paymentService.submitForReview(ctx.telegram, transactionId);
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
      await ctx.reply(
        '⏳ Votre paiement est en cours de vérification.\n\nMerci de patienter. Vous recevrez une notification dès qu\'un administrateur aura traité votre demande.'
      );
    } catch (err) {
      logger.error('[PAYMENT_HANDLER] Erreur notification admin:', err);
      await ctx.reply('❌ Une erreur est survenue lors de l’envoi de votre demande. Réessayez dans un instant.');
    }
  });

  // --- Annulation avant confirmation ---
  bot.action(/CANCEL_PAYMENT_(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const transactionId = ctx.match[1];
    const transaction = transactionModel.findById(transactionId);

    if (transaction && transaction.user_id === ctx.from.id && transaction.status === 'pending') {
      transactionModel.cancelByUser(transactionId);
    }

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
    await ctx.reply('✖️ Commande annulée.', mainReplyKeyboard());
  });
}

module.exports = { register };
