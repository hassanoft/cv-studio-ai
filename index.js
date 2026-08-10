/**
 * index.js
 * Point d'entree de CV Studio AI.
 * Assemble le bot Telegram (Telegraf) et le serveur Express
 * (health check + hebergement des portfolios generes).
 */

const path = require('path');
const express = require('express');
const { Telegraf, Scenes } = require('telegraf');

const { env, validateEnv } = require('./config/env');
validateEnv();

// Initialise la base de donnees (creation du schema si besoin)
require('./database/db');

const logger = require('./utils/logger');
const sessionMiddleware = require('./middlewares/sessionMiddleware');
const { antiSpam } = require('./middlewares/antiSpam');
const { telegrafErrorHandler, expressErrorHandler } = require('./middlewares/errorHandler');
const { closeBrowser } = require('./utils/browser');
const { withRetry } = require('./utils/retry');

// Scenes (wizards)
const cvWizardScene = require('./handlers/cvWizardScene');
const portfolioWizardScene = require('./handlers/portfolioWizardScene');

// Commandes
const startCommand = require('./commands/start');
const menuCommand = require('./commands/menu');
const cvCommand = require('./commands/cv');
const portfolioCommand = require('./commands/portfolio');
const accountCommand = require('./commands/account');
const creationsCommand = require('./commands/creations');
const shopCommand = require('./commands/shop');
const subscriptionCommand = require('./commands/subscription');
const adminCommand = require('./commands/admin');

// Handlers (callbacks transverses)
const paymentHandler = require('./handlers/paymentHandler');
const adminHandler = require('./handlers/adminHandler');

// ---------------------------------------------------------------------
// Bot Telegram
// ---------------------------------------------------------------------
const bot = new Telegraf(env.BOT_TOKEN);

const stage = new Scenes.Stage([cvWizardScene, portfolioWizardScene]);

bot.use(antiSpam());
bot.use(sessionMiddleware());
bot.use(stage.middleware());

// Commandes
startCommand.register(bot);
menuCommand.register(bot);
cvCommand.register(bot);
portfolioCommand.register(bot);
accountCommand.register(bot);
creationsCommand.register(bot);
shopCommand.register(bot);
subscriptionCommand.register(bot);
adminCommand.register(bot);

// Handlers transverses
paymentHandler.register(bot);
adminHandler.register(bot);

// Annulation globale (hors wizard) — evite un message d'erreur si /annuler
// est tape en dehors d'une scene active
bot.command('annuler', async (ctx) => {
  if (ctx.scene && ctx.scene.current) {
    await ctx.scene.leave();
  }
  await ctx.reply('✖️ Aucune action en cours.');
});

bot.catch(telegrafErrorHandler);

// ---------------------------------------------------------------------
// Serveur Express
// ---------------------------------------------------------------------
const app = express();

// Portfolios generes : URL /portfolio/<id> -> public/portfolios/<id>/index.html
app.use('/portfolio', express.static(path.join(__dirname, 'public', 'portfolios')));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'cv-studio-ai', time: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.status(200).send('CV Studio AI est en ligne.');
});

// ---------------------------------------------------------------------
// Demarrage
// ---------------------------------------------------------------------
async function start() {
  if (env.BOT_MODE === 'webhook') {
    if (!env.WEBHOOK_URL) {
      logger.error('[STARTUP] BOT_MODE=webhook mais WEBHOOK_URL est vide. Verifiez votre .env');
      process.exit(1);
    }
    app.use(bot.webhookCallback(env.WEBHOOK_PATH));
    app.use(expressErrorHandler);

    app.listen(env.PORT, () => {
      logger.info(`[HTTP] Serveur Express demarre sur le port ${env.PORT}`);
    });

    const fullWebhookUrl = `${env.WEBHOOK_URL}${env.WEBHOOK_PATH}`;
    // Quelques tentatives : au demarrage a froid, la connexion sortante vers
    // l'API Telegram peut echouer une fois (ETIMEDOUT) avant de se stabiliser.
    await withRetry(() => bot.telegram.setWebhook(fullWebhookUrl), {
      retries: 3,
      delayMs: 2000,
      label: 'configuration du webhook Telegram',
    });
    logger.info(`[BOT] Webhook configure -> ${fullWebhookUrl}`);
  } else {
    app.use(expressErrorHandler);
    app.listen(env.PORT, () => {
      logger.info(`[HTTP] Serveur Express demarre sur le port ${env.PORT}`);
    });

    await bot.launch();
    logger.info('[BOT] Demarre en mode polling.');
  }

  logger.info('[STARTUP] CV Studio AI est operationnel.');
}

start().catch((err) => {
  logger.error('[STARTUP] Erreur fatale au demarrage:', err);
  process.exit(1);
});

// Arret propre
async function shutdown(signal) {
  logger.info(`[SHUTDOWN] Signal ${signal} recu, arret en cours...`);
  try {
    bot.stop(signal);
  } catch (err) {
    logger.error('[SHUTDOWN] Erreur arret bot:', err.message);
  }
  await closeBrowser();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
