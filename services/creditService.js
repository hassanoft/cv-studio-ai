/**
 * services/creditService.js
 * Logique de verification / decompte des credits H$Λ,
 * en tenant compte des abonnements actifs (generations illimitees).
 */

const userModel = require('../database/models/userModel');
const { COSTS, formatCredits } = require('../config/prices');

/**
 * Verifie si l'utilisateur peut generer un document donne.
 * @param {object} user - ligne users
 * @param {'CV'|'PORTFOLIO'} product
 * @returns {{ allowed: boolean, reason?: string, cost: number, unlimited: boolean }}
 */
function canGenerate(user, product) {
  const cost = COSTS[product];
  const unlimited = userModel.hasActiveSubscription(user);

  if (unlimited) {
    return { allowed: true, cost: 0, unlimited: true };
  }

  if (user.balance < cost) {
    return {
      allowed: false,
      reason: `Solde insuffisant. Il vous faut ${formatCredits(cost)} (solde actuel : ${formatCredits(
        user.balance
      )}).`,
      cost,
      unlimited: false,
    };
  }

  return { allowed: true, cost, unlimited: false };
}

/**
 * Debite le cout d'une generation si l'utilisateur n'est pas abonne.
 */
function chargeForGeneration(userId, product, unlimited) {
  if (unlimited) return userModel.findById(userId);
  const cost = COSTS[product];
  return userModel.debitBalance(userId, cost);
}

module.exports = { canGenerate, chargeForGeneration };
