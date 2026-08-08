/**
 * config/admin.js
 * Utilitaires lies au statut administrateur.
 */

const { env } = require('./env');

function isAdmin(telegramId) {
  return env.ADMIN_IDS.includes(Number(telegramId));
}

module.exports = { isAdmin };
