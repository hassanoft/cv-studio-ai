/**
 * utils/browser.js
 * Gestionnaire unique d'instance Puppeteer (lazy singleton).
 * Evite de relancer Chromium a chaque generation de CV.
 */

const puppeteer = require('puppeteer');
const { env } = require('../config/env');
const logger = require('../utils/logger');

let browserPromise = null;

async function launchBrowser() {
  logger.info('[BROWSER] Lancement de Chromium (Puppeteer)...');
  return puppeteer.launch({
    headless: 'new',
    executablePath: env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
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
