/**
 * handlers/cvWizardScene.js
 * Scene (wizard) Telegraf qui collecte toutes les informations
 * necessaires a la generation d'un CV, puis declenche cvService.
 */

const { Scenes } = require('telegraf');
const { handleCancel, handleSkip, getText, getPhotoFileId } = require('./wizardHelpers');
const { isValidPhone, isValidEmail, normalizePhone, isNonEmpty, sanitizeText } = require('../utils/validators');
const { skipCancelInline, cancelOnlyInline, confirmGenerateInline, mainReplyKeyboard, backToMenuInline } = require('../utils/keyboards');
const { safeDownloadPhoto } = require('../utils/telegramFile');
const creditService = require('../services/creditService');
const cvService = require('../services/cvService');
const userModel = require('../database/models/userModel');
const { formatCredits } = require('../config/prices');
const { escapeMarkdownLegacy } = require('../utils/formatters');
const logger = require('../utils/logger');

const SCENE_ID = 'CV_WIZARD';

function recap(data) {
  const e = escapeMarkdownLegacy;
  return [
    '📋 *Récapitulatif de votre CV*',
    '',
    `👤 ${e(data.prenom)} ${e(data.nom)}`,
    `💼 ${e(data.metier)}`,
    `📞 ${e(data.telephone)}`,
    `✉️ ${e(data.email)}`,
    `📍 ${e(data.adresse)}`,
    '',
    'Tout est correct ? Générez votre CV en image HD.',
  ].join('\n');
}

const scene = new Scenes.WizardScene(
  SCENE_ID,

  // Etape 0 — verification des credits + demande de la photo
  async (ctx) => {
    const { user } = userModel.findOrCreate(ctx.from);
    const check = creditService.canGenerate(user, 'CV');

    if (!check.allowed) {
      await ctx.reply(
        `❌ ${check.reason}\n\nRendez-vous dans la 💳 Boutique pour recharger votre solde.`,
        backToMenuInline()
      );
      return ctx.scene.leave();
    }

    ctx.wizard.state.data = {};
    ctx.wizard.state.unlimited = check.unlimited;

    await ctx.reply(
      "📄 *Création de votre CV*\n\nEnvoyez votre photo (portrait, format carré de préférence).\nVous pouvez aussi tapoter *Passer* pour générer un CV sans photo.\n\nTapez /annuler à tout moment pour arrêter.",
      { parse_mode: 'Markdown', ...skipCancelInline() }
    );
    return ctx.wizard.next();
  },

  // Etape 1 — photo
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    if (await handleSkip(ctx)) {
      ctx.wizard.state.data.photoDataUri = null;
      await ctx.reply('Quel est votre *nom* de famille ?', { parse_mode: 'Markdown', ...cancelOnlyInline() });
      return ctx.wizard.next();
    }

    const fileId = getPhotoFileId(ctx);
    if (!fileId) {
      await ctx.reply('Merci d’envoyer une photo (image), ou tapoter Passer.', skipCancelInline());
      return;
    }

    await ctx.reply('⏳ Photo reçue, traitement en cours...');
    const dataUri = await safeDownloadPhoto(ctx.telegram, fileId);
    ctx.wizard.state.data.photoDataUri = dataUri;

    await ctx.reply('Quel est votre *nom* de famille ?', { parse_mode: 'Markdown', ...cancelOnlyInline() });
    return ctx.wizard.next();
  },

  // Etape 2 — nom
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    const text = getText(ctx);
    if (!isNonEmpty(text, { min: 2, max: 60 })) {
      await ctx.reply('Merci d’indiquer un nom valide (2 à 60 caractères).', cancelOnlyInline());
      return;
    }
    ctx.wizard.state.data.nom = sanitizeText(text, 60);
    await ctx.reply('Quel est votre *prénom* ?', { parse_mode: 'Markdown', ...cancelOnlyInline() });
    return ctx.wizard.next();
  },

  // Etape 3 — prenom
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    const text = getText(ctx);
    if (!isNonEmpty(text, { min: 2, max: 60 })) {
      await ctx.reply('Merci d’indiquer un prénom valide (2 à 60 caractères).', cancelOnlyInline());
      return;
    }
    ctx.wizard.state.data.prenom = sanitizeText(text, 60);
    await ctx.reply('Quel est votre *métier* / poste recherché ?', { parse_mode: 'Markdown', ...cancelOnlyInline() });
    return ctx.wizard.next();
  },

  // Etape 4 — metier
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    const text = getText(ctx);
    if (!isNonEmpty(text, { min: 2, max: 80 })) {
      await ctx.reply('Merci d’indiquer un métier valide.', cancelOnlyInline());
      return;
    }
    ctx.wizard.state.data.metier = sanitizeText(text, 80);
    await ctx.reply(
      'Votre *numéro de téléphone* ? (format ivoirien, ex: +225 07 00 00 00 00)',
      { parse_mode: 'Markdown', ...cancelOnlyInline() }
    );
    return ctx.wizard.next();
  },

  // Etape 5 — telephone
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    const text = getText(ctx);
    if (!text || !isValidPhone(text)) {
      await ctx.reply('Numéro invalide. Exemple attendu : +225 07 00 00 00 00', cancelOnlyInline());
      return;
    }
    ctx.wizard.state.data.telephone = normalizePhone(text);
    await ctx.reply('Votre *adresse email* ?', { parse_mode: 'Markdown', ...cancelOnlyInline() });
    return ctx.wizard.next();
  },

  // Etape 6 — email
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    const text = getText(ctx);
    if (!text || !isValidEmail(text)) {
      await ctx.reply('Email invalide. Exemple : nom@exemple.com', cancelOnlyInline());
      return;
    }
    ctx.wizard.state.data.email = text.trim();
    await ctx.reply('Votre *adresse / ville* ? (ex: Abidjan, Cocody)', { parse_mode: 'Markdown', ...cancelOnlyInline() });
    return ctx.wizard.next();
  },

  // Etape 7 — adresse
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    const text = getText(ctx);
    if (!isNonEmpty(text, { min: 2, max: 120 })) {
      await ctx.reply('Merci d’indiquer une adresse valide.', cancelOnlyInline());
      return;
    }
    ctx.wizard.state.data.adresse = sanitizeText(text, 120);
    await ctx.reply(
      'Rédigez un court paragraphe *"À propos de vous"* (3-4 phrases).',
      { parse_mode: 'Markdown', ...cancelOnlyInline() }
    );
    return ctx.wizard.next();
  },

  // Etape 8 — about
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    const text = getText(ctx);
    if (!isNonEmpty(text, { min: 10, max: 600 })) {
      await ctx.reply('Merci de rédiger un texte entre 10 et 600 caractères.', cancelOnlyInline());
      return;
    }
    ctx.wizard.state.data.about = sanitizeText(text, 600);
    await ctx.reply(
      'Listez vos *compétences*, séparées par des virgules.\nEx: Gestion de projet, Excel, Communication',
      { parse_mode: 'Markdown', ...cancelOnlyInline() }
    );
    return ctx.wizard.next();
  },

  // Etape 9 — competences
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    const text = getText(ctx);
    if (!isNonEmpty(text, { min: 2, max: 400 })) {
      await ctx.reply('Merci d’indiquer au moins une compétence.', cancelOnlyInline());
      return;
    }
    ctx.wizard.state.data.competences = sanitizeText(text, 400);
    await ctx.reply(
      '🧾 Vos *expériences professionnelles*.\n\nUne ligne par expérience, au format :\n`Période | Poste | Entreprise`\n\nEx:\n2022 - 2024 | Développeur Web | Entreprise ABC\n2020 - 2022 | Stage Marketing | Société XYZ',
      { parse_mode: 'Markdown', ...skipCancelInline() }
    );
    return ctx.wizard.next();
  },

  // Etape 10 — experiences (optionnel)
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    if (await handleSkip(ctx)) {
      ctx.wizard.state.data.experiences = '';
      await ctx.reply(
        '🎓 Vos *études / formations*.\n\nMême format :\n`Période | Diplôme | Établissement`',
        { parse_mode: 'Markdown', ...skipCancelInline() }
      );
      return ctx.wizard.next();
    }
    const text = getText(ctx);
    if (!isNonEmpty(text, { min: 2, max: 1200 })) {
      await ctx.reply('Merci de décrire au moins une expérience, ou tapoter Passer.', skipCancelInline());
      return;
    }
    ctx.wizard.state.data.experiences = sanitizeText(text, 1200);
    await ctx.reply(
      '🎓 Vos *études / formations*.\n\nMême format :\n`Période | Diplôme | Établissement`',
      { parse_mode: 'Markdown', ...skipCancelInline() }
    );
    return ctx.wizard.next();
  },

  // Etape 11 — etudes (optionnel)
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    if (await handleSkip(ctx)) {
      ctx.wizard.state.data.etudes = '';
      await ctx.reply('Vos *langues parlées*, séparées par des virgules.\nEx: Français, Anglais, Dioula', {
        parse_mode: 'Markdown',
        ...cancelOnlyInline(),
      });
      return ctx.wizard.next();
    }
    const text = getText(ctx);
    if (!isNonEmpty(text, { min: 2, max: 1200 })) {
      await ctx.reply('Merci de décrire au moins une formation, ou tapoter Passer.', skipCancelInline());
      return;
    }
    ctx.wizard.state.data.etudes = sanitizeText(text, 1200);
    await ctx.reply('Vos *langues parlées*, séparées par des virgules.\nEx: Français, Anglais, Dioula', {
      parse_mode: 'Markdown',
      ...cancelOnlyInline(),
    });
    return ctx.wizard.next();
  },

  // Etape 12 — langues
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    const text = getText(ctx);
    if (!isNonEmpty(text, { min: 2, max: 200 })) {
      await ctx.reply('Merci d’indiquer au moins une langue.', cancelOnlyInline());
      return;
    }
    ctx.wizard.state.data.langues = sanitizeText(text, 200);
    await ctx.reply(
      'Enfin, vos *centres d’intérêt*, séparés par des virgules.\nEx: Football, Lecture, Musique',
      { parse_mode: 'Markdown', ...skipCancelInline() }
    );
    return ctx.wizard.next();
  },

  // Etape 13 — interets (optionnel) -> recapitulatif
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    if (await handleSkip(ctx)) {
      ctx.wizard.state.data.interets = '';
    } else {
      const text = getText(ctx);
      if (text) ctx.wizard.state.data.interets = sanitizeText(text, 300);
    }

    const data = ctx.wizard.state.data;
    await ctx.reply(recap(data), { parse_mode: 'Markdown', ...confirmGenerateInline('CV_CONFIRM_GENERATE') });
    return ctx.wizard.next();
  },

  // Etape 14 — confirmation et generation
  async (ctx) => {
    if (await handleCancel(ctx)) return;

    if (!ctx.callbackQuery || ctx.callbackQuery.data !== 'CV_CONFIRM_GENERATE') {
      await ctx.reply('Tapotez sur "✅ Générer" pour continuer, ou "✖️ Annuler".', confirmGenerateInline('CV_CONFIRM_GENERATE'));
      return;
    }

    await ctx.answerCbQuery().catch(() => {});
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
    await ctx.reply('🎨 Génération de votre CV en cours, merci de patienter...');

    try {
      const userId = ctx.from.id;
      const unlimited = ctx.wizard.state.unlimited;

      const { filePath } = await cvService.generateCv(userId, ctx.wizard.state.data);
      creditService.chargeForGeneration(userId, 'CV', unlimited);

      const balanceNote = unlimited
        ? '👑 Généré gratuitement grâce à votre abonnement actif.'
        : `💳 ${formatCredits(50)} débités de votre solde.`;

      await ctx.replyWithPhoto({ source: filePath }, { caption: `✅ Votre CV est prêt !\n\n${balanceNote}` });
      await ctx.reply('Que souhaitez-vous faire ensuite ?', mainReplyKeyboard());
    } catch (err) {
      logger.error('[CV_WIZARD] Erreur de génération:', err);
      await ctx.reply('❌ Une erreur est survenue lors de la génération de votre CV. Aucun crédit n’a été débité.');
    }

    return ctx.scene.leave();
  }
);

module.exports = scene;
