/**
 * config/env.js
 * Charge et valide les variables d'environnement du projet.
 * Point d'entree unique pour la configuration -> aucun autre fichier
 * ne doit lire process.env directement.
 */

const path = require('path');
require('dotenv').config();

const REQUIRED_IN_PRODUCTION = ['BOT_TOKEN'];

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',

  BOT_TOKEN: process.env.BOT_TOKEN || '',
  BOT_MODE: (process.env.BOT_MODE || 'polling').toLowerCase(), // polling | webhook
  WEBHOOK_URL: process.env.WEBHOOK_URL || '',
  WEBHOOK_PATH: process.env.WEBHOOK_PATH || '/telegram/webhook',

  PORT: parseInt(process.env.PORT, 10) || 3000,
  PUBLIC_BASE_URL: (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, ''),

  ADMIN_IDS: (process.env.ADMIN_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number),

  DB_PATH: path.resolve(process.cwd(), process.env.DB_PATH || './database/data/cvstudio.sqlite'),

  WAVE_PAYMENT_LINK: process.env.WAVE_PAYMENT_LINK || '',

  PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
};

function validateEnv() {
  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`[CONFIG] Variables d'environnement manquantes: ${missing.join(', ')}`);
    console.error('[CONFIG] Copiez .env.example vers .env et renseignez les valeurs.');
    process.exit(1);
  }
  if (env.ADMIN_IDS.length === 0) {
    // eslint-disable-next-line no-console
    console.warn('[CONFIG] Attention: aucun ADMIN_IDS defini. Le panneau admin sera inaccessible.');
  }
}

module.exports = { env, validateEnv };
