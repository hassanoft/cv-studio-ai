/**
 * utils/formatters.js
 * Aide au formatage de texte pour les messages Telegram.
 */

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString.includes('T') ? isoString : isoString.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString.includes('T') ? isoString : isoString.replace(' ', 'T') + 'Z');
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Echappe les caracteres speciaux Markdown V2 de Telegram.
 */
function escapeMarkdownV2(text = '') {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/** Transforme une liste "a, b, c" saisie par l'utilisateur en tableau propre */
function splitList(text = '') {
  return text
    .split(/[,•\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Echappe les caracteres speciaux du Markdown "legacy" de Telegram
 * (_ * ` [) pour eviter qu'un texte libre saisi par l'utilisateur
 * (nom, metier, etc.) ne casse le parsing d'un message parse_mode=Markdown.
 */
function escapeMarkdownLegacy(text = '') {
  return String(text).replace(/([_*`[])/g, '\\$1');
}

/**
 * Transforme un texte multi-lignes "Periode | Titre | Sous-titre" en
 * entrees de frise chronologique. Une ligne sans "|" devient un item
 * simple (title uniquement).
 */
function parseTimelineEntries(text = '') {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return { period: parts[0], title: parts[1], subtitle: parts.slice(2).join(' · ') };
      }
      return { period: '', title: line, subtitle: '' };
    });
}

module.exports = {
  formatDate,
  formatDateTime,
  escapeMarkdownV2,
  escapeMarkdownLegacy,
  splitList,
  parseTimelineEntries,
};
