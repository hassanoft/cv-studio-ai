/**
 * handlers/wizardHelpers.js
 * Fonctions partagees par les scenes (wizards) de creation de CV
 * et de portfolio : annulation, saut d'etape, lecture du texte.
 */

const { mainReplyKeyboard } = require('../utils/keyboards');

// Libellés du clavier persistant : si l'utilisateur appuie dessus en
// pleine création (au lieu d'utiliser /annuler), on considère que
// c'est une sortie volontaire plutôt que d'enregistrer ce texte comme
// une réponse au champ en cours (évite de corrompre les données saisies).
const MENU_KEYWORDS = [
  '📄 Creer un CV',
  '🌐 Creer un Portfolio',
  '👤 Mon compte',
  '🗂 Mes creations',
  '💳 Boutique',
  '👑 Abonnement',
  'ℹ️ Aide',
  '/menu',
  '/start',
];

/**
 * Si l'utilisateur a clique sur "Annuler", envoye /annuler, ou touche
 * un bouton du menu principal en pleine saisie, quitte la scene et
 * previent l'utilisateur. Retourne true si gere.
 */
async function handleCancel(ctx) {
  const isCancelAction = ctx.callbackQuery && ctx.callbackQuery.data === 'WIZARD_CANCEL';
  const isCancelCommand = ctx.message && ctx.message.text && ctx.message.text.trim() === '/annuler';
  const text = ctx.message && ctx.message.text ? ctx.message.text.trim() : null;
  const isMenuEscape = text && MENU_KEYWORDS.includes(text);

  if (isCancelAction || isCancelCommand) {
    if (isCancelAction) await ctx.answerCbQuery().catch(() => {});
    await ctx.reply('✖️ Création annulée. Aucun crédit n’a été débité.', mainReplyKeyboard());
    await ctx.scene.leave();
    return true;
  }

  if (isMenuEscape) {
    await ctx.reply(
      '✖️ Création annulée pour accéder au menu.\n\nAppuyez à nouveau sur le bouton souhaité.',
      mainReplyKeyboard()
    );
    await ctx.scene.leave();
    return true;
  }

  return false;
}

/** Retourne true si l'utilisateur a appuye sur "Passer" (etape optionnelle) */
async function handleSkip(ctx) {
  const isSkipAction = ctx.callbackQuery && ctx.callbackQuery.data === 'WIZARD_SKIP';
  const isSkipCommand = ctx.message && ctx.message.text && ctx.message.text.trim().toLowerCase() === 'passer';

  if (isSkipAction) {
    await ctx.answerCbQuery().catch(() => {});
    return true;
  }
  return isSkipCommand;
}

/** Retourne true si l'utilisateur signale la fin d'une collecte multiple (ex: galerie photo) */
async function handleDone(ctx) {
  const isDoneAction = ctx.callbackQuery && ctx.callbackQuery.data === 'WIZARD_DONE';
  const isDoneCommand = ctx.message && ctx.message.text && ['terminé', 'termine', 'fini'].includes(ctx.message.text.trim().toLowerCase());

  if (isDoneAction) {
    await ctx.answerCbQuery().catch(() => {});
    return true;
  }
  return isDoneCommand;
}

/** Extrait le texte du message courant, ou null si absent */
function getText(ctx) {
  if (ctx.message && typeof ctx.message.text === 'string') {
    return ctx.message.text.trim();
  }
  return null;
}

/** Extrait le file_id de la photo la plus grande envoyee, ou null */
function getPhotoFileId(ctx) {
  if (ctx.message && Array.isArray(ctx.message.photo) && ctx.message.photo.length > 0) {
    return ctx.message.photo[ctx.message.photo.length - 1].file_id;
  }
  return null;
}

module.exports = { handleCancel, handleSkip, handleDone, getText, getPhotoFileId };
