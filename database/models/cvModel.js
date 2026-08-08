/**
 * database/models/cvModel.js
 */

const db = require('../db');

const stmts = {
  insert: db.prepare(`
    INSERT INTO cvs (id, user_id, full_name, job_title, template, data_json, file_path)
    VALUES (@id, @user_id, @full_name, @job_title, @template, @data_json, @file_path)
  `),
  findById: db.prepare('SELECT * FROM cvs WHERE id = ?'),
  listByUser: db.prepare('SELECT * FROM cvs WHERE user_id = ? ORDER BY created_at DESC'),
  countAll: db.prepare('SELECT COUNT(*) AS count FROM cvs'),
};

function create({ id, userId, fullName, jobTitle, template, data, filePath }) {
  stmts.insert.run({
    id,
    user_id: userId,
    full_name: fullName,
    job_title: jobTitle,
    template,
    data_json: JSON.stringify(data),
    file_path: filePath,
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
