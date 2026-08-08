/**
 * commands/admin.js
 * Commande /admin — ouvre le panneau d'administration.
 * Accessible uniquement aux ID Telegram listes dans ADMIN_IDS (.env).
 */

const { requireAdmin } = require('../middlewares/adminAuth');
const { adminPanelInline } = require('../utils/keyboards');

function register(bot) {
  bot.command('admin', requireAdmin(), async (ctx) => {
    await ctx.reply('⚙️ *Panneau d’administration*', { parse_mode: 'Markdown', ...adminPanelInline() });
  });
}

module.exports = { register };
