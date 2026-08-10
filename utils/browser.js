/**
 * utils/browser.js
 * Gestionnaire unique d'instance Puppeteer (lazy singleton).
 * Evite de relancer Chromium a chaque generation de CV.
 *
 * IMPORTANT : ce projet utilise "puppeteer-core" + "@sparticuz/chromium"
 * plutot que le package "puppeteer" complet. Raison : sur certains
 * environnements de build (ex: Render), le telechargeur automatique de
 * Chromium de "puppeteer" peut echouer ou produire un binaire incomplet
 * ("The browser folder exists but the executable is missing"),
 * ce qui fait echouer tout le deploiement. "@sparticuz/chromium" fournit
 * un binaire Chromium precompile et compatible avec les environnements
 * conteneurises (Render, AWS Lambda, etc.), sans etape de telechargement
 * fragile au moment du build.
 *
 * En local / Termux : definissez PUPPETEER_EXECUTABLE_PATH dans .env pour
 * pointer vers un Chrome/Chromium deja installe sur la machine (le binaire
 * de @sparticuz/chromium est compile pour Linux x64 et ne fonctionne pas
 * sur Android/ARM ni sur macOS/Windows).
 */

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const { env } = require('../config/env');
const logger = require('../utils/logger');

let browserPromise = null;

async function resolveExecutablePath() {
  if (env.PUPPETEER_EXECUTABLE_PATH) {
    return env.PUPPETEER_EXECUTABLE_PATH;
  }
  return chromium.executablePath();
}

async function launchBrowser() {
  logger.info('[BROWSER] Lancement de Chromium (Puppeteer)...');
  const executablePath = await resolveExecutablePath();

  return puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      ...chromium.args,
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    defaultViewport: chromium.defaultViewport,
  });
}

/** Retourne une instance Chromium reutilisable, la relance si elle a plante. */
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = launchBrowser();
  }
  try {
    const browser = await browserPromise;
    if (!browser.isConnected()) {
      browserPromise = launchBrowser();
      return browserPromise;
    }
    return browser;
  } catch (err) {
    browserPromise = null;
    throw err;
  }
}

async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise.catch(() => null);
    if (browser) await browser.close().catch(() => {});
    browserPromise = null;
  }
}

module.exports = { getBrowser, closeBrowser };
