/**
 * services/paymentService.js
 * Orchestration des commandes de credits / abonnements et de leur
 * validation manuelle par l'administrateur (aucune verification
 * automatique de paiement, conformement au cahier des charges).
 */

const idGenerator = require('../utils/idGenerator');
const transactionModel = require('../database/models/transactionModel');
const userModel = require('../database/models/userModel');
const subscriptionService = require('./subscriptionService');
const adminNotifyService = require('./adminNotifyService');
const { env } = require('../config/env');
const { findCreditPack, findSubscriptionPlan, formatCredits } = require('../config/prices');

class PaymentError extends Error {}

/**
 * Construit le lien de paiement Wave avec le montant exact du pack/abonnement
 * choisi, ajouté dynamiquement a la fin du lien marchand (?amount=...).
 */
function buildWaveLink(amountFcfa) {
  return `${env.WAVE_PAYMENT_LINK}${amountFcfa}`;
}

/** Un utilisateur ne peut avoir qu'une seule commande en attente a la fois (anti double-paiement / anti-spam). */
function assertNoPendingOrder(userId) {
  const pending = transactionModel.findPendingByUser(userId);
  if (pending) {
    throw new PaymentError(
      "Vous avez déjà une demande en attente de validation. Merci de patienter avant d'en créer une nouvelle."
    );
  }
}

function createCreditOrder(userId, packId) {
  const pack = findCreditPack(packId);
  if (!pack) throw new PaymentError('Pack de crédits introuvable.');
  assertNoPendingOrder(userId);

  return transactionModel.create({
    id: idGenerator.uuid(),
    userId,
    type: 'credit_pack',
    productId: pack.id,
    productLabel: `${formatCredits(pack.credits)}`,
    credits: pack.credits,
    subscriptionDays: null,
    amountFcfa: pack.price,
  });
}

function createSubscriptionOrder(userId, planId) {
  const plan = findSubscriptionPlan(planId);
  if (!plan) throw new PaymentError('Plan d’abonnement introuvable.');
  assertNoPendingOrder(userId);

  return transactionModel.create({
    id: idGenerator.uuid(),
    userId,
    type: 'subscription',
    productId: plan.id,
    productLabel: `Abonnement ${plan.label}`,
    credits: null,
    subscriptionDays: plan.days,
    amountFcfa: plan.price,
  });
}

/** Envoie la notification aux administrateurs pour une transaction donnee. */
async function submitForReview(telegram, transactionId) {
  const transaction = transactionModel.findById(transactionId);
  if (!transaction) throw new PaymentError('Transaction introuvable.');
  const user = userModel.findById(transaction.user_id);
  await adminNotifyService.notifyAdminsNewPayment(telegram, transaction, user);
  return transaction;
}

/**
 * Applique la validation d'une transaction : credite les H$Λ ou active
 * l'abonnement, marque la transaction comme validee.
 */
async function approve(telegram, transactionId, adminId) {
  const transaction = transactionModel.findById(transactionId);
  if (!transaction) throw new PaymentError('Transaction introuvable.');
  if (transaction.status !== 'pending') {
    throw new PaymentError('Cette demande a déjà été traitée.');
  }

  if (transaction.type === 'credit_pack') {
    userModel.creditBalance(transaction.user_id, transaction.credits);
  } else if (transaction.type === 'subscription') {
    const plan = findSubscriptionPlan(transaction.product_id) || {
      label: transaction.product_label,
      days: transaction.subscription_days,
    };
    subscriptionService.activate(transaction.user_id, plan);
  }

  const validated = transactionModel.validate(transactionId, adminId);
  const user = userModel.findById(transaction.user_id);

  await adminNotifyService.updateAdminMessages(telegram, validated, user, '✅ Validée', `admin ${adminId}`);

  return { transaction: validated, user };
}

async function reject(telegram, transactionId, adminId) {
  const transaction = transactionModel.findById(transactionId);
  if (!transaction) throw new PaymentError('Transaction introuvable.');
  if (transaction.status !== 'pending') {
    throw new PaymentError('Cette demande a déjà été traitée.');
  }

  const refused = transactionModel.refuse(transactionId, adminId);
  const user = userModel.findById(transaction.user_id);

  await adminNotifyService.updateAdminMessages(telegram, refused, user, '❌ Refusée', `admin ${adminId}`);

  return { transaction: refused, user };
}

module.exports = {
  PaymentError,
  buildWaveLink,
  createCreditOrder,
  createSubscriptionOrder,
  submitForReview,
  approve,
  reject,
};
