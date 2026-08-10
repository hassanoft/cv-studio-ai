/**
 * utils/retry.js
 * Reessaie une fonction asynchrone en cas d'echec transitoire
 * (ex: "socket hang up", ECONNRESET lors de l'envoi d'un fichier a
 * l'API Telegram sur une connexion instable).
 */

const logger = require('./logger');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {Function} fn - fonction async a executer
 * @param {object} opts
 * @param {number} opts.retries - nombre de tentatives supplementaires (defaut 2)
 * @param {number} opts.delayMs - delai initial entre les tentatives (defaut 1000ms, double a chaque essai)
 * @param {string} opts.label - libelle pour les logs
 */
async function withRetry(fn, { retries = 2, delayMs = 1000, label = 'operation' } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const delay = delayMs * (attempt + 1);
        logger.warn(`[RETRY] ${label} a échoué (tentative ${attempt + 1}/${retries + 1}) : ${err.message}. Nouvel essai dans ${delay}ms.`);
        await wait(delay);
      }
    }
  }
  throw lastErr;
}

module.exports = { withRetry };
