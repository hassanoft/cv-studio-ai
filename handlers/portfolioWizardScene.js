/**
 * handlers/portfolioWizardScene.js
 * Scene (wizard) Telegraf qui collecte toutes les informations
 * necessaires a la generation d'un portfolio web, puis declenche
 * portfolioService.
 */

const { Scenes } = require('telegraf');
const { handleCancel, handleSkip, handleDone, getText, getPhotoFileId } = require('./wizardHelpers');
const { isValidPhone, isValidEmail, normalizePhone, isNonEmpty, sanitizeText } = require('../utils/validators');
const {
  skipCancelInline,
  cancelOnlyInline,
  confirmGenerateInline,
  galleryCollectInline,
  mainReplyKeyboard,
  backToMenuInline,
} = require('../utils/keyboards');
const { safeDownloadPhoto } = require('../utils/telegramFile');
const creditService = require('../services/creditService');
const portfolioService = require('../services/portfolioService');
const userModel = require('../database/models/userModel');
const { formatCredits } = require('../config/prices');
const { escapeMarkdownLegacy } = require('../utils/formatters');
const logger = require('../utils/logger');

const SCENE_ID = 'PORTFOLIO_WIZARD';
const MAX_GALLERY_PHOTOS = 8;

function recap(data) {
  const e = escapeMarkdownLegacy;
  return [
    '📋 *Récapitulatif de votre portfolio*',
    '',
    `👤 ${e(data.prenom)} ${e(data.nom)}`,
    `💼 ${e(data.metier)}`,
    `📞 ${e(data.telephone)}`,
    `✉️ ${e(data.email)}`,
    `📍 ${e(data.adresse)}`,
    `🖼 Galerie : ${(data.gallery || []).length} photo(s)`,
    `🚀 Projets : ${(data.projects || []).length}`,
    '',
    'Tout est correct ? Générez votre site portfolio.',
  ].join('\n');
}

/** Parse le texte "Cle: valeur" (une ligne par reseau) en objet { whatsapp, telegram, linkedin, github, instagram } */
function parseSocialText(text) {
  const social = {};
  text.split('\n').forEach((line) => {
    const match = line.match(/^\s*(whatsapp|telegram|linkedin|github|instagram)\s*:\s*(.+)$/i);
    if (match) {
      const key = match[1].toLowerCase();
      const value = match[2].trim();
      if (value) social[key] = value;
    }
  });
  return social;
}

/** Parse "Titre | Description | Lien" (une ligne par projet) */
function parseProjectsText(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((s) => s.trim()).filter(Boolean);
      return {
        title: parts[0] || 'Projet',
        description: parts[1] || '',
        link: parts[2] || '',
      };
    });
}

const scene = new Scenes.WizardScene(
  SCENE_ID,

  // Etape 0 — verification des credits + demande de la photo
  async (ctx) => {
    const { user } = userModel.findOrCreate(ctx.from);
    const check = creditService.canGenerate(user, 'PORTFOLIO');

    if (!check.allowed) {
      await ctx.reply(
        `❌ ${check.reason}\n\nRendez-vous dans la 💳 Boutique pour recharger votre solde.`,
        backToMenuInline()
      );
      return ctx.scene.leave();
    }

    ctx.wizard.state.data = { gallery: [], projects: [] };
    ctx.wizard.state.unlimited = check.unlimited;

    await ctx.reply(
      "🌐 *Création de votre Portfolio*\n\nEnvoyez votre photo (portrait, format carré de préférence).\nVous pouvez tapoter *Passer* pour continuer sans photo.\n\nTapez /annuler à tout moment pour arrêter.",
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
    await ctx.reply('Quel est votre *métier* / titre professionnel ?', { parse_mode: 'Markdown', ...cancelOnlyInline() });
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
      'Votre *numéro de téléphone* ? (utilisé aussi pour le bouton WhatsApp — format ivoirien, ex: +225 07 00 00 00 00)',
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
    await ctx.reply('Rédigez un court paragraphe *"À propos de vous"* (3-5 phrases).', {
      parse_mode: 'Markdown',
      ...cancelOnlyInline(),
    });
    return ctx.wizard.next();
  },

  // Etape 8 — about
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    const text = getText(ctx);
    if (!isNonEmpty(text, { min: 10, max: 800 })) {
      await ctx.reply('Merci de rédiger un texte entre 10 et 800 caractères.', cancelOnlyInline());
      return;
    }
    ctx.wizard.state.data.about = sanitizeText(text, 800);
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
      '🧾 Vos *expériences professionnelles*.\n\nUne ligne par expérience, au format :\n`Période | Poste | Entreprise`',
      { parse_mode: 'Markdown', ...skipCancelInline() }
    );
    return ctx.wizard.next();
  },

  // Etape 10 — experiences (optionnel)
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    if (await handleSkip(ctx)) {
      ctx.wizard.state.data.experiences = '';
      await ctx.reply('🎓 Vos *études / formations*.\n\nMême format :\n`Période | Diplôme | Établissement`', {
        parse_mode: 'Markdown',
        ...skipCancelInline(),
      });
      return ctx.wizard.next();
    }
    const text = getText(ctx);
    if (!isNonEmpty(text, { min: 2, max: 1200 })) {
      await ctx.reply('Merci de décrire au moins une expérience, ou tapoter Passer.', skipCancelInline());
      return;
    }
    ctx.wizard.state.data.experiences = sanitizeText(text, 1200);
    await ctx.reply('🎓 Vos *études / formations*.\n\nMême format :\n`Période | Diplôme | Établissement`', {
      parse_mode: 'Markdown',
      ...skipCancelInline(),
    });
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
    await ctx.reply('Vos *centres d’intérêt*, séparés par des virgules.\nEx: Football, Lecture, Musique', {
      parse_mode: 'Markdown',
      ...skipCancelInline(),
    });
    return ctx.wizard.next();
  },

  // Etape 13 — interets (optionnel)
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    if (await handleSkip(ctx)) {
      ctx.wizard.state.data.interets = '';
    } else {
      const text = getText(ctx);
      if (text) ctx.wizard.state.data.interets = sanitizeText(text, 300);
    }

    await ctx.reply(
      [
        '🔗 *Vos réseaux (optionnel)*',
        '',
        'Envoyez un ou plusieurs liens, un par ligne, au format :',
        '`Telegram: @votre_pseudo`',
        '`LinkedIn: https://linkedin.com/in/...`',
        '`GitHub: https://github.com/...`',
        '`Instagram: https://instagram.com/...`',
        '',
        '(Le bouton WhatsApp utilise automatiquement votre téléphone.)',
      ].join('\n'),
      { parse_mode: 'Markdown', ...skipCancelInline() }
    );
    return ctx.wizard.next();
  },

  // Etape 14 — reseaux sociaux (optionnel)
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    const social = { whatsapp: ctx.wizard.state.data.telephone };

    if (await handleSkip(ctx)) {
      ctx.wizard.state.data.social = social;
    } else {
      const text = getText(ctx);
      if (text) {
        Object.assign(social, parseSocialText(text));
      }
      ctx.wizard.state.data.social = social;
    }

    await ctx.reply(
      [
        '🚀 *Vos projets (optionnel)*',
        '',
        'Une ligne par projet, au format :',
        '`Titre | Description | Lien (optionnel)`',
        '',
        'Ex: Site e-commerce | Boutique en ligne pour un client local | https://exemple.com',
      ].join('\n'),
      { parse_mode: 'Markdown', ...skipCancelInline() }
    );
    return ctx.wizard.next();
  },

  // Etape 15 — projets (optionnel)
  async (ctx) => {
    if (await handleCancel(ctx)) return;
    if (await handleSkip(ctx)) {
      ctx.wizard.state.data.projects = [];
    } else {
      const text = getText(ctx);
      if (text) ctx.wizard.state.data.projects = parseProjectsText(sanitizeText(text, 2000));
    }

    await ctx.reply(
      `🖼 *Galerie photo (optionnel)*\n\nEnvoyez jusqu'à ${MAX_GALLERY_PHOTOS} photos, une par une. Tapotez *Terminé* quand vous avez fini, ou *Passer* pour ignorer cette étape.`,
      { parse_mode: 'Markdown', ...galleryCollectInline() }
    );
    return ctx.wizard.next();
  },

  // Etape 16 — galerie (boucle jusqu'a Terminé/Passer)
  async (ctx) => {
    if (await handleCancel(ctx)) return;

    if (await handleDone(ctx)) {
      await proceedToRecap(ctx);
      return ctx.wizard.next();
    }
    if (await handleSkip(ctx)) {
      ctx.wizard.state.data.gallery = [];
      await proceedToRecap(ctx);
      return ctx.wizard.next();
    }

    const fileId = getPhotoFileId(ctx);
    if (!fileId) {
      await ctx.reply('Envoyez une photo, ou tapotez Terminé / Passer.', galleryCollectInline());
      return;
    }

    if (ctx.wizard.state.data.gallery.length >= MAX_GALLERY_PHOTOS) {
      await ctx.reply(`Maximum de ${MAX_GALLERY_PHOTOS} photos atteint.`, galleryCollectInline());
      await proceedToRecap(ctx);
      return ctx.wizard.next();
    }

    const dataUri = await safeDownloadPhoto(ctx.telegram, fileId);
    if (dataUri) ctx.wizard.state.data.gallery.push(dataUri);

    await ctx.reply(
      `✅ Photo ajoutée (${ctx.wizard.state.data.gallery.length}/${MAX_GALLERY_PHOTOS}). Envoyez-en une autre ou tapotez Terminé.`,
      galleryCollectInline()
    );
    // reste sur la meme etape pour accepter d'autres photos
  },

  // Etape 17 — confirmation et generation
  async (ctx) => {
    if (await handleCancel(ctx)) return;

    if (!ctx.callbackQuery || ctx.callbackQuery.data !== 'PORTFOLIO_CONFIRM_GENERATE') {
      await ctx.reply(
        'Tapotez sur "✅ Générer" pour continuer, ou "✖️ Annuler".',
        confirmGenerateInline('PORTFOLIO_CONFIRM_GENERATE')
      );
      return;
    }

    await ctx.answerCbQuery().catch(() => {});
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
    await ctx.reply('🎨 Génération de votre portfolio en cours, merci de patienter...');

    try {
      const userId = ctx.from.id;
      const unlimited = ctx.wizard.state.unlimited;

      const { url } = await portfolioService.generatePortfolio(userId, ctx.wizard.state.data);
      creditService.chargeForGeneration(userId, 'PORTFOLIO', unlimited);

      const balanceNote = unlimited
        ? '👑 Généré gratuitement grâce à votre abonnement actif.'
        : `💳 ${formatCredits(100)} débités de votre solde.`;

      await ctx.reply(`✅ Votre portfolio est en ligne !\n\n🔗 ${url}\n\n${balanceNote}`, mainReplyKeyboard());
    } catch (err) {
      logger.error('[PORTFOLIO_WIZARD] Erreur de génération:', err);
      await ctx.reply('❌ Une erreur est survenue lors de la génération de votre portfolio. Aucun crédit n’a été débité.');
    }

    return ctx.scene.leave();
  }
);

async function proceedToRecap(ctx) {
  const data = ctx.wizard.state.data;
  await ctx.reply(recap(data), {
    parse_mode: 'Markdown',
    ...confirmGenerateInline('PORTFOLIO_CONFIRM_GENERATE'),
  });
}

module.exports = scene;
