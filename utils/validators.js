/**
 * utils/validators.js
 * Validation et nettoyage des entrees utilisateur.
 * Toutes les valeurs saisies dans Telegram passent par ici avant
 * d'etre stockees ou injectees dans un template.
 */

// Formats acceptes : +225XXXXXXXXXX, 225XXXXXXXXXX, 0XXXXXXXXXX, ou 10 chiffres locaux
const CI_PHONE_REGEX = /^(?:\+?225)?[\s.-]?(\d{2}[\s.-]?){4}\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmpty(text, { min = 1, max = 500 } = {}) {
  if (typeof text !== 'string') return false;
  const trimmed = text.trim();
  return trimmed.length >= min && trimmed.length <= max;
}

function isValidPhone(text) {
  if (typeof text !== 'string') return false;
  return CI_PHONE_REGEX.test(text.trim());
}

/**
 * Normalise un numero ivoirien vers le format +225 XX XX XX XX XX
 */
function normalizePhone(text) {
  const digitsOnly = text.replace(/\D/g, '').replace(/^225/, '');
  const local = digitsOnly.slice(-10);
  const groups = local.match(/.{1,2}/g) || [local];
  return `+225 ${groups.join(' ')}`;
}

function isValidEmail(text) {
  if (typeof text !== 'string') return false;
  return EMAIL_REGEX.test(text.trim()) && text.trim().length <= 254;
}

/**
 * Nettoie un texte libre : supprime les caracteres de controle et
 * limite la longueur. La protection XSS reelle est assuree par
 * l'echappement automatique d'EJS (<%= %>) au moment du rendu.
 */
function sanitizeText(text, maxLength = 1000) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim()
    .slice(0, maxLength);
}

module.exports = {
  isNonEmpty,
  isValidPhone,
  normalizePhone,
  isValidEmail,
  sanitizeText,
};
