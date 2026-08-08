/**
 * utils/keyboards.js
 * Centralise tous les claviers (inline / reply) de l'application
 * pour garder une interface Telegram coherente.
 */

const { Markup } = require('telegraf');
const { CREDIT_PACKS, SUBSCRIPTION_PLANS, formatFCFA, formatCredits } = require('../config/prices');

/** Clavier persistant affiche sous la zone de saisie */
function mainReplyKeyboard() {
  return Markup.keyboard([
    ['📄 Creer un CV', '🌐 Creer un Portfolio'],
    ['👤 Mon compte', '🗂 Mes creations'],
    ['💳 Boutique', '👑 Abonnement'],
    ['ℹ️ Aide'],
  ]).resize();
}

/** Menu principal inline (utilise apres /start et /menu) */
function mainMenuInline() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📄 Creer un CV (50 H$Λ)', 'CREATE_CV')],
    [Markup.button.callback('🌐 Creer un Portfolio (100 H$Λ)', 'CREATE_PORTFOLIO')],
    [
      Markup.button.callback('👤 Mon compte', 'MY_ACCOUNT'),
      Markup.button.callback('🗂 Mes creations', 'MY_CREATIONS'),
    ],
    [
      Markup.button.callback('💳 Boutique', 'SHOP'),
      Markup.button.callback('👑 Abonnement', 'SUBSCRIPTION'),
    ],
  ]);
}

function backToMenuInline() {
  return Markup.inlineKeyboard([[Markup.button.callback('⬅️ Menu principal', 'BACK_TO_MENU')]]);
}

/** Boutique de credits */
function shopInline() {
  const rows = CREDIT_PACKS.map((pack) => [
    Markup.button.callback(
      `${formatCredits(pack.credits)} — ${formatFCFA(pack.price)}`,
      `BUY_CREDIT_${pack.id}`
    ),
  ]);
  rows.push([Markup.button.callback('⬅️ Menu principal', 'BACK_TO_MENU')]);
  return Markup.inlineKeyboard(rows);
}

/** Plans d'abonnement */
function subscriptionInline() {
  const rows = SUBSCRIPTION_PLANS.map((plan) => [
    Markup.button.callback(`${plan.label} — ${formatFCFA(plan.price)}`, `BUY_SUB_${plan.id}`),
  ]);
  rows.push([Markup.button.callback('⬅️ Menu principal', 'BACK_TO_MENU')]);
  return Markup.inlineKeyboard(rows);
}

/** Confirmation "j'ai paye" apres affichage du lien Wave */
function paidConfirmationInline(transactionId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("✅ J'ai payé", `CONFIRM_PAID_${transactionId}`)],
    [Markup.button.callback('❌ Annuler', `CANCEL_PAYMENT_${transactionId}`)],
  ]);
}

/** Boutons envoyes a l'administrateur pour valider/refuser un paiement */
function adminValidationInline(transactionId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Valider', `ADMIN_VALIDATE_${transactionId}`),
      Markup.button.callback('❌ Refuser', `ADMIN_REFUSE_${transactionId}`),
    ],
  ]);
}

/** Panneau d'administration */
function adminPanelInline() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📥 Demandes en attente', 'ADMIN_PENDING')],
    [Markup.button.callback('💰 Historique des paiements', 'ADMIN_HISTORY')],
    [Markup.button.callback('👥 Utilisateurs', 'ADMIN_USERS')],
    [Markup.button.callback('👑 Abonnements', 'ADMIN_SUBS')],
    [Markup.button.callback('📊 Statistiques', 'ADMIN_STATS')],
    [Markup.button.callback('⚙️ Parametres', 'ADMIN_SETTINGS')],
  ]);
}

function skipCancelInline(skipData = 'WIZARD_SKIP', cancelData = 'WIZARD_CANCEL') {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⏭️ Passer', skipData), Markup.button.callback('✖️ Annuler', cancelData)],
  ]);
}

function galleryCollectInline() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Terminé', 'WIZARD_DONE'), Markup.button.callback('⏭️ Passer', 'WIZARD_SKIP')],
    [Markup.button.callback('✖️ Annuler', 'WIZARD_CANCEL')],
  ]);
}

function cancelOnlyInline(cancelData = 'WIZARD_CANCEL') {
  return Markup.inlineKeyboard([[Markup.button.callback('✖️ Annuler', cancelData)]]);
}

function confirmGenerateInline(confirmData, cancelData = 'WIZARD_CANCEL') {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Générer', confirmData)],
    [Markup.button.callback('✖️ Annuler', cancelData)],
  ]);
}

module.exports = {
  mainReplyKeyboard,
  mainMenuInline,
  backToMenuInline,
  shopInline,
  subscriptionInline,
  paidConfirmationInline,
  adminValidationInline,
  adminPanelInline,
  skipCancelInline,
  galleryCollectInline,
  cancelOnlyInline,
  confirmGenerateInline,
};
