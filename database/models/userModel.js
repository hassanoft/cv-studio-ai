/**
 * database/models/userModel.js
 * Toutes les requetes SQL relatives aux utilisateurs.
 * Utilise exclusivement des requetes preparees (protection anti-injection SQL).
 */

const db = require('../db');
const { WELCOME_BONUS } = require('../../config/prices');

const stmts = {
  findById: db.prepare('SELECT * FROM users WHERE id = ?'),
  insert: db.prepare(`
    INSERT INTO users (id, username, first_name, last_name, balance)
    VALUES (@id, @username, @first_name, @last_name, @balance)
  `),
  updateProfile: db.prepare(`
    UPDATE users SET username = @username, first_name = @first_name, last_name = @last_name
    WHERE id = @id
  `),
  updateBalance: db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?'),
  setBalance: db.prepare('UPDATE users SET balance = ? WHERE id = ?'),
  incrementCvCount: db.prepare('UPDATE users SET cv_count = cv_count + 1 WHERE id = ?'),
  incrementPortfolioCount: db.prepare('UPDATE users SET portfolio_count = portfolio_count + 1 WHERE id = ?'),
  setSubscription: db.prepare(`
    UPDATE users SET subscription_plan = ?, subscription_expires_at = ? WHERE id = ?
  `),
  setBanned: db.prepare('UPDATE users SET banned = ? WHERE id = ?'),
  countAll: db.prepare('SELECT COUNT(*) AS count FROM users'),
  countActiveSubs: db.prepare(
    "SELECT COUNT(*) AS count FROM users WHERE subscription_expires_at IS NOT NULL AND subscription_expires_at > datetime('now')"
  ),
  sumBalances: db.prepare('SELECT COALESCE(SUM(balance), 0) AS total FROM users'),
  recent: db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ?'),
};

/** Recupere un utilisateur, ou le cree automatiquement avec le bonus de bienvenue */
function findOrCreate(telegramUser) {
  const existing = stmts.findById.get(telegramUser.id);
  if (existing) {
    // Garde le profil a jour (pseudo / prenom peuvent changer)
    stmts.updateProfile.run({
      id: telegramUser.id,
      username: telegramUser.username || null,
      first_name: telegramUser.first_name || null,
      last_name: telegramUser.last_name || null,
    });
    return { user: stmts.findById.get(telegramUser.id), isNew: false };
  }

  stmts.insert.run({
    id: telegramUser.id,
    username: telegramUser.username || null,
    first_name: telegramUser.first_name || null,
    last_name: telegramUser.last_name || null,
    balance: WELCOME_BONUS,
  });

  return { user: stmts.findById.get(telegramUser.id), isNew: true };
}

function findById(id) {
  return stmts.findById.get(id);
}

function creditBalance(id, amount) {
  stmts.updateBalance.run(amount, id);
  return findById(id);
}

function debitBalance(id, amount) {
  stmts.updateBalance.run(-Math.abs(amount), id);
  return findById(id);
}

function hasActiveSubscription(user) {
  if (!user || !user.subscription_expires_at) return false;
  return new Date(user.subscription_expires_at) > new Date();
}

function activateSubscription(id, planLabel, expiresAtISO) {
  stmts.setSubscription.run(planLabel, expiresAtISO, id);
  return findById(id);
}

function incrementCvCount(id) {
  stmts.incrementCvCount.run(id);
}

function incrementPortfolioCount(id) {
  stmts.incrementPortfolioCount.run(id);
}

function setBanned(id, banned) {
  stmts.setBanned.run(banned ? 1 : 0, id);
}

function stats() {
  return {
    totalUsers: stmts.countAll.get().count,
    activeSubscriptions: stmts.countActiveSubs.get().count,
    totalBalance: stmts.sumBalances.get().total,
  };
}

function recentUsers(limit = 20) {
  return stmts.recent.all(limit);
}

module.exports = {
  findOrCreate,
  findById,
  creditBalance,
  debitBalance,
  hasActiveSubscription,
  activateSubscription,
  incrementCvCount,
  incrementPortfolioCount,
  setBanned,
  stats,
  recentUsers,
};
