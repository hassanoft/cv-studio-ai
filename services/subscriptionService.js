/**
 * services/subscriptionService.js
 * Active / prolonge un abonnement utilisateur.
 */

const userModel = require('../database/models/userModel');

/**
 * Active un abonnement. Si un abonnement est deja actif, la duree
 * s'ajoute a la date d'expiration existante (prolongation), sinon
 * elle demarre a partir de maintenant.
 */
function activate(userId, plan) {
  const user = userModel.findById(userId);
  const now = new Date();
  const currentExpiry =
    user.subscription_expires_at && new Date(user.subscription_expires_at) > now
      ? new Date(user.subscription_expires_at)
      : now;

  const newExpiry = new Date(currentExpiry.getTime() + plan.days * 24 * 60 * 60 * 1000);

  return userModel.activateSubscription(userId, plan.label, newExpiry.toISOString());
}

module.exports = { activate };
