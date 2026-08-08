/**
 * middlewares/sessionMiddleware.js
 * Session en memoire (par utilisateur) utilisee par les scenes
 * (wizards CV / Portfolio). Pour une mise a l'echelle multi-instance,
 * remplacer par un store Redis (telegraf-session-redis) en conservant
 * la meme API `session()`.
 */

const { session } = require('telegraf');

module.exports = function sessionMiddleware() {
  return session({ defaultSession: () => ({}) });
};
