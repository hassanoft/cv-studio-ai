/**
 * services/portfolioService.js
 * Rend le template EJS du portfolio en une page HTML statique et
 * autonome, enregistree dans public/portfolios/<id>/index.html.
 */

const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const idGenerator = require('../utils/idGenerator');
const portfolioModel = require('../database/models/portfolioModel');
const userModel = require('../database/models/userModel');
const { env } = require('../config/env');
const { formatDate, parseTimelineEntries, splitList } = require('../utils/formatters');
const logger = require('../utils/logger');

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'portfolio', 'index.ejs');
const PORTFOLIOS_DIR = path.join(__dirname, '..', 'public', 'portfolios');

/**
 * Construit les liens sociaux a partir des saisies utilisateur.
 * Renvoie null pour tout champ absent (le bouton correspondant est masque).
 */
function buildSocialLinks(raw = {}) {
  const social = {};

  if (raw.whatsapp) {
    const digits = raw.whatsapp.replace(/\D/g, '');
    social.whatsapp = `https://wa.me/${digits}`;
  }
  if (raw.telegram) {
    const handle = raw.telegram.replace('@', '').trim();
    social.telegram = `https://t.me/${handle}`;
  }
  if (raw.linkedin) social.linkedin = normalizeUrl(raw.linkedin);
  if (raw.github) social.github = normalizeUrl(raw.github);
  if (raw.instagram) social.instagram = normalizeUrl(raw.instagram);

  return social;
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * @param {number} userId
 * @param {object} wizardData
 * @returns {Promise<{portfolioId: string, url: string}>}
 */
async function generatePortfolio(userId, wizardData) {
  const portfolioId = idGenerator.shortId(8);

  const templateData = {
    photoDataUri: wizardData.photoDataUri || null,
    prenom: wizardData.prenom,
    nom: wizardData.nom,
    metier: wizardData.metier,
    telephone: wizardData.telephone,
    email: wizardData.email,
    adresse: wizardData.adresse,
    about: wizardData.about,
    competences: splitList(wizardData.competences),
    experiences: parseTimelineEntries(wizardData.experiences),
    etudes: parseTimelineEntries(wizardData.etudes),
    langues: splitList(wizardData.langues),
    interets: splitList(wizardData.interets),
    projects: wizardData.projects || [],
    gallery: wizardData.gallery || [],
    social: buildSocialLinks(wizardData.social || {}),
    generatedDate: formatDate(new Date().toISOString()),
  };

  const html = await ejs.renderFile(TEMPLATE_PATH, templateData);

  const portfolioDir = path.join(PORTFOLIOS_DIR, portfolioId);
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'index.html'), html, 'utf8');

  const urlPath = `/portfolio/${portfolioId}`;
  const url = `${env.PUBLIC_BASE_URL}${urlPath}`;

  portfolioModel.create({
    id: portfolioId,
    userId,
    fullName: `${wizardData.prenom} ${wizardData.nom}`.trim(),
    jobTitle: wizardData.metier,
    data: templateData,
    urlPath,
  });

  userModel.incrementPortfolioCount(userId);
  logger.info(`[PORTFOLIO] Genere pour user ${userId} -> ${urlPath}`);

  return { portfolioId, url };
}

module.exports = { generatePortfolio };
