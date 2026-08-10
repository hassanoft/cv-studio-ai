/**
 * services/cvService.js
 * Rend le template EJS du CV en HTML, puis le convertit en image PNG
 * haute definition via Puppeteer.
 */

const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { getBrowser, closeBrowser } = require('../utils/browser');
const idGenerator = require('../utils/idGenerator');
const cvModel = require('../database/models/cvModel');
const userModel = require('../database/models/userModel');
const { formatDate, parseTimelineEntries, splitList } = require('../utils/formatters');
const logger = require('../utils/logger');

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'cv', 'modern.ejs');
const EXPORT_DIR = path.join(__dirname, '..', 'public', 'cv-exports');

/**
 * @param {number} userId
 * @param {object} wizardData - donnees collectees par le wizard Telegram
 * @returns {Promise<{cvId: string, filePath: string}>}
 */
async function generateCv(userId, wizardData) {
  const cvId = idGenerator.uuid();

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
    generatedDate: formatDate(new Date().toISOString()),
  };

  const html = await ejs.renderFile(TEMPLATE_PATH, templateData);

  const userDir = path.join(EXPORT_DIR, String(userId));
  fs.mkdirSync(userDir, { recursive: true });
  const filePath = path.join(userDir, `${cvId}.png`);

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 1.5 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.screenshot({ path: filePath, fullPage: true, type: 'png' });
  } finally {
    await page.close().catch(() => {});
    // Ferme completement Chromium (pas seulement l'onglet) apres chaque generation.
    // Sur une instance a memoire limitee (ex: plan gratuit Render, ~512 Mo), garder
    // Chromium ouvert en permanence entre deux generations peut saturer la RAM et
    // provoquer des erreurs reseau ("socket hang up") meme sur des messages texte
    // sans rapport. Le cout est ~1-2s de relance au prochain CV/portfolio genere,
    // ce qui est un compromis raisonnable face au risque de saturation memoire.
    await closeBrowser();
  }

  cvModel.create({
    id: cvId,
    userId,
    fullName: `${wizardData.prenom} ${wizardData.nom}`.trim(),
    jobTitle: wizardData.metier,
    template: 'modern',
    data: templateData,
    filePath,
  });

  userModel.incrementCvCount(userId);
  logger.info(`[CV] Genere pour user ${userId} -> ${filePath}`);

  return { cvId, filePath };
}

module.exports = { generateCv };
