/**
 * database/migrate.js
 * Script autonome d'initialisation de la base (npm run db:init).
 * Le schema est egalement cree automatiquement au demarrage du bot,
 * ce script est utile pour preparer la base sans lancer tout le serveur.
 */

const db = require('./db');
const logger = require('../utils/logger');

logger.info('[MIGRATE] Base de donnees prete ->', db.name);
process.exit(0);
