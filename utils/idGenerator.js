/**
 * utils/idGenerator.js
 * Generateurs d'identifiants uniques (sans dependance externe).
 */

const crypto = require('crypto');

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * Genere un identifiant court, alphanumerique, adapte a une URL.
 * Ex: idGenerator.shortId() -> "k3f9a2q1"
 */
function shortId(length = 8) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/**
 * Genere un UUID v4 standard (pour les enregistrements internes : cv, transactions...).
 */
function uuid() {
  return crypto.randomUUID();
}

module.exports = { shortId, uuid };
