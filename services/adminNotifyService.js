/**
 * services/adminNotifyService.js
 * Envoie les notifications de nouvelle commande a tous les
 * administrateurs configures, avec les boutons Valider / Refuser.
 */

const { env } = require('../config/env');
const { adminValidationInline } = require('../utils/keyboards');
const { formatFCFA, formatCredits } = require('../config/prices');
const { formatDateTime, escapeMarkdownV2 } = require('../utils/formatters');
const transactionModel = require('../database/models/transactionModel');
const logger = require('../utils/logger');

function buildAdminMessage(transaction, user) {
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Utilisateur';
  const username = user.username ? `@${user.username}` : 'non renseigné';

  return [
    '🔔 *Nouvelle demande de paiement*',
    '',
    `👤 Nom : ${escapeMarkdownV2(displayName)}`,
    `🔗 Username : ${escapeMarkdownV2(username)}`,
    `🆔 ID Telegram : \`${transaction.user_id}\``,
    `📦 Produit : ${escapeMarkdownV2(transaction.product_label)}`,
    `💰 Montant : ${escapeMarkdownV2(formatFCFA(transaction.amount_fcfa))}`,
    `🕒 Date : ${escapeMarkdownV2(formatDateTime(transaction.created_at))}`,
    `📌 Statut : *En attente*`,
  ].join('\n');
}

/**
 * Envoie la notification a tous les administrateurs et enregistre
 * les references de messages pour pouvoir desactiver les boutons
 * une fois la commande traitee.
 */
async function notifyAdminsNewPayment(telegram, transaction, user) {
  if (env.ADMIN_IDS.length === 0) {
    logger.warn('[ADMIN_NOTIFY] Aucun ADMIN_IDS configure, notification ignoree.');
    return;
  }

  const text = buildAdminMessage(transaction, user);
  const sent = [];

  for (const adminId of env.ADMIN_IDS) {
    try {
      const message = await telegram.sendMessage(adminId, text, {
        parse_mode: 'MarkdownV2',
        ...adminValidationInline(transaction.id),
      });
      sent.push({ chatId: message.chat.id, messageId: message.message_id });
    } catch (err) {
      logger.error(`[ADMIN_NOTIFY] Echec envoi a l'admin ${adminId}:`, err.message);
    }
  }

  transactionModel.attachAdminNotifications(transaction.id, sent);
}

/**
 * Met a jour tous les messages admin lies a une transaction pour
 * refleter la decision prise (retire les boutons, ajoute le statut final).
 */
async function updateAdminMessages(telegram, transaction, user, statusLabel, processedByLabel) {
  let notifications = [];
  try {
    notifications = JSON.parse(transaction.admin_notifications_json || '[]');
  } catch {
    notifications = [];
  }

  const updatedText = `${buildAdminMessage(transaction, user)}\n\n${statusLabel} — traité par ${escapeMarkdownV2(
    processedByLabel
  )}`;

  for (const { chatId, messageId } of notifications) {
    try {
      await telegram.editMessageText(chatId, messageId, undefined, updatedText, {
        parse_mode: 'MarkdownV2',
        reply_markup: { inline_keyboard: [] },
      });
    } catch (err) {
      logger.warn('[ADMIN_NOTIFY] Impossible de mettre a jour un message admin:', err.message);
    }
  }
}

module.exports = { notifyAdminsNewPayment, updateAdminMessages, buildAdminMessage };
