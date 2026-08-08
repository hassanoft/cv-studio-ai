/**
 * database/models/transactionModel.js
 * Gere les commandes de credits / abonnements et leur validation manuelle.
 */

const db = require('../db');

const stmts = {
  insert: db.prepare(`
    INSERT INTO transactions
      (id, user_id, type, product_id, product_label, credits, subscription_days, amount_fcfa, status)
    VALUES
      (@id, @user_id, @type, @product_id, @product_label, @credits, @subscription_days, @amount_fcfa, 'pending')
  `),
  findById: db.prepare('SELECT * FROM transactions WHERE id = ?'),
  findPendingByUser: db.prepare(
    "SELECT * FROM transactions WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
  ),
  attachAdminNotifications: db.prepare(
    'UPDATE transactions SET admin_notifications_json = ? WHERE id = ?'
  ),
  setStatus: db.prepare(`
    UPDATE transactions
    SET status = ?, processed_by = ?, processed_at = datetime('now')
    WHERE id = ?
  `),
  listPending: db.prepare("SELECT * FROM transactions WHERE status = 'pending' ORDER BY created_at ASC"),
  listByUser: db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'),
  listHistory: db.prepare(
    "SELECT * FROM transactions WHERE status != 'pending' ORDER BY processed_at DESC LIMIT ?"
  ),
  countValidatedRevenue: db.prepare(
    "SELECT COALESCE(SUM(amount_fcfa), 0) AS total FROM transactions WHERE status = 'validated'"
  ),
  countByStatus: db.prepare('SELECT status, COUNT(*) AS count FROM transactions GROUP BY status'),
};

function create({ id, userId, type, productId, productLabel, credits, subscriptionDays, amountFcfa }) {
  stmts.insert.run({
    id,
    user_id: userId,
    type,
    product_id: productId,
    product_label: productLabel,
    credits: credits ?? null,
    subscription_days: subscriptionDays ?? null,
    amount_fcfa: amountFcfa,
  });
  return stmts.findById.get(id);
}

function findById(id) {
  return stmts.findById.get(id);
}

function findPendingByUser(userId) {
  return stmts.findPendingByUser.get(userId);
}

function attachAdminNotifications(id, notifications) {
  stmts.attachAdminNotifications.run(JSON.stringify(notifications), id);
}

function validate(id, adminId) {
  stmts.setStatus.run('validated', adminId, id);
  return findById(id);
}

function refuse(id, adminId) {
  stmts.setStatus.run('refused', adminId, id);
  return findById(id);
}

/** Annulation par l'utilisateur lui-meme avant tout traitement admin */
function cancelByUser(id) {
  stmts.setStatus.run('refused', null, id);
  return findById(id);
}

function listPending() {
  return stmts.listPending.all();
}

function listByUser(userId, limit = 20) {
  return stmts.listByUser.all(userId, limit);
}

function listHistory(limit = 30) {
  return stmts.listHistory.all(limit);
}

function totalValidatedRevenue() {
  return stmts.countValidatedRevenue.get().total;
}

function countsByStatus() {
  const rows = stmts.countByStatus.all();
  const result = { pending: 0, validated: 0, refused: 0 };
  rows.forEach((r) => {
    result[r.status] = r.count;
  });
  return result;
}

module.exports = {
  create,
  findById,
  findPendingByUser,
  attachAdminNotifications,
  validate,
  refuse,
  cancelByUser,
  listPending,
  listByUser,
  listHistory,
  totalValidatedRevenue,
  countsByStatus,
};
