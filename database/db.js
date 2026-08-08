/**
 * database/db.js
 *
 * Connexion SQLite (better-sqlite3) + creation du schema.
 *
 * IMPORTANT — portabilite :
 * Ce fichier est le SEUL point de contact direct avec le moteur SQL.
 * Pour migrer vers PostgreSQL / Supabase, il suffit de remplacer ce
 * module (et les requetes prepare()/run()/get()/all() des models) par
 * un client compatible (ex: pg, @supabase/supabase-js) en conservant
 * les memes noms de methodes exposees par chaque model.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { env } = require('../config/env');
const logger = require('../utils/logger');

// S'assure que le dossier de la base existe
const dbDir = path.dirname(env.DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(env.DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id                      INTEGER PRIMARY KEY,      -- Telegram user id
      username                TEXT,
      first_name              TEXT,
      last_name               TEXT,
      balance                 INTEGER NOT NULL DEFAULT 0,
      subscription_plan       TEXT,
      subscription_expires_at TEXT,
      cv_count                INTEGER NOT NULL DEFAULT 0,
      portfolio_count         INTEGER NOT NULL DEFAULT 0,
      banned                  INTEGER NOT NULL DEFAULT 0,
      created_at              TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cvs (
      id           TEXT PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(id),
      full_name    TEXT,
      job_title    TEXT,
      template     TEXT NOT NULL DEFAULT 'modern',
      data_json    TEXT NOT NULL,
      file_path    TEXT NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS portfolios (
      id           TEXT PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(id),
      full_name    TEXT,
      job_title    TEXT,
      data_json    TEXT NOT NULL,
      url_path     TEXT NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id              TEXT PRIMARY KEY,
      user_id         INTEGER NOT NULL REFERENCES users(id),
      type            TEXT NOT NULL,           -- 'credit_pack' | 'subscription'
      product_id      TEXT NOT NULL,
      product_label   TEXT NOT NULL,
      credits         INTEGER,                 -- rempli si type = credit_pack
      subscription_days INTEGER,               -- rempli si type = subscription
      amount_fcfa     INTEGER NOT NULL,
      status          TEXT NOT NULL DEFAULT 'pending', -- pending | validated | refused
      admin_notifications_json TEXT,   -- [{chatId, messageId}] pour desactiver les boutons sur tous les admins
      processed_by    INTEGER,
      processed_at    TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cvs_user ON cvs(user_id);
    CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
  `);

  logger.info('[DB] Schema verifie / initialise.');
}

initSchema();

module.exports = db;
