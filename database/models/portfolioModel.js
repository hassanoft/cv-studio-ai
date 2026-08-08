/**
 * database/models/portfolioModel.js
 */

const db = require('../db');

const stmts = {
  insert: db.prepare(`
    INSERT INTO portfolios (id, user_id, full_name, job_title, data_json, url_path)
    VALUES (@id, @user_id, @full_name, @job_title, @data_json, @url_path)
  `),
  findById: db.prepare('SELECT * FROM portfolios WHERE id = ?'),
  listByUser: db.prepare('SELECT * FROM portfolios WHERE user_id = ? ORDER BY created_at DESC'),
  countAll: db.prepare('SELECT COUNT(*) AS count FROM portfolios'),
};

function create({ id, userId, fullName, jobTitle, data, urlPath }) {
  stmts.insert.run({
    id,
    user_id: userId,
    full_name: fullName,
    job_title: jobTitle,
    data_json: JSON.stringify(data),
    url_path: urlPath,
  });
  return stmts.findById.get(id);
}

function findById(id) {
  return stmts.findById.get(id);
}

function listByUser(userId) {
  return stmts.listByUser.all(userId);
}

function countAll() {
  return stmts.countAll.get().count;
}

module.exports = { create, findById, listByUser, countAll };
