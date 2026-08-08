/**
 * database/migrate.js
 * Script autonome d'initialisation de la base (npm run db:init).
 * Le schema est egalement cree automatiquement au demarrage du bot,
 * ce script est utile pour preparer la base sans lancer tout le serveur.
 */

const db = require('./db');
const { env } = require('../config/env');
const logger = require('../utils/logger');

// `db.exec` ci-dessus (via require('./db')) a deja cree/verifie le schema.
void db;
logger.info('[MIGRATE] Base de donnees prete ->', env.DB_PATH);
process.exit(0);
