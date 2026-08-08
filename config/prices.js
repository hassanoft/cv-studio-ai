/**
 * config/prices.js
 * Source unique de verite pour tous les tarifs de l'application.
 * Monnaie virtuelle : H$A (Hasha) — affichee "H$Λ".
 */

const CURRENCY_SYMBOL = 'H$Λ';

const COSTS = {
  CV: 50,
  PORTFOLIO: 100,
};

const WELCOME_BONUS = 100;

// Packs de credits : credits H$Λ <-> prix FCFA
const CREDIT_PACKS = [
  { id: 'pack_500', credits: 500, price: 900 },
  { id: 'pack_1000', credits: 1000, price: 1700 },
  { id: 'pack_1500', credits: 1500, price: 2400 },
  { id: 'pack_3000', credits: 3000, price: 4500 },
  { id: 'pack_5000', credits: 5000, price: 7000 },
];

// Plans d'abonnement : generations illimitees pendant la duree active
const SUBSCRIPTION_PLANS = [
  { id: 'sub_week', label: '1 semaine', days: 7, price: 1200 },
  { id: 'sub_month', label: '1 mois', days: 30, price: 2500 },
  { id: 'sub_quarter', label: '3 mois', days: 90, price: 6500 },
  { id: 'sub_year', label: '1 an', days: 365, price: 25000 },
];

function findCreditPack(id) {
  return CREDIT_PACKS.find((p) => p.id === id) || null;
}

function findSubscriptionPlan(id) {
  return SUBSCRIPTION_PLANS.find((p) => p.id === id) || null;
}

function formatFCFA(amount) {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

function formatCredits(amount) {
  return `${amount.toLocaleString('fr-FR')} ${CURRENCY_SYMBOL}`;
}

module.exports = {
  CURRENCY_SYMBOL,
  COSTS,
  WELCOME_BONUS,
  CREDIT_PACKS,
  SUBSCRIPTION_PLANS,
  findCreditPack,
  findSubscriptionPlan,
  formatFCFA,
  formatCredits,
};
