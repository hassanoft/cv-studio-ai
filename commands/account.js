/**
 * commands/account.js
 * Affiche les informations du compte de l'utilisateur ("Mon compte").
 */

const userModel = require('../database/models/userModel');
const { formatDate, formatDateTime, escapeMarkdownLegacy } = require('../utils/formatters');
const { formatCredits } = require('../config/prices');
const { backToMenuInline } = require('../utils/keyboards');

function buildAccountText(user) {
  const displayName =
    escapeMarkdownLegacy([user.first_name, user.last_name].filter(Boolean).join(' ')) || 'Non renseigné';
  const hasSub = user.subscription_expires_at && new Date(user.subscription_expires_at) > new Date();

  return [
    '👤 *Mon compte*',
    '',
    `Nom : ${displayName}`,
    `ID Telegram : \`${user.id}\``,
    `Inscrit le : ${formatDate(user.created_at)}`,
    `💰 Solde : ${formatCredits(user.balance)}`,
    `👑 Abonnement : ${hasSub ? user.subscription_plan : 'Aucun'}`,
    `📅 Expire le : ${hasSub ? formatDateTime(user.subscription_expires_at) : '—'}`,
    '',
    `📄 CV créés : ${user.cv_count}`,
    `🌐 Portfolios créés : ${user.portfolio_count}`,
  ].join('\n');
}

function register(bot) {
  const show = async (ctx) => {
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const { user } = userModel.findOrCreate(ctx.from);
    await ctx.reply(buildAccountText(user), { parse_mode: 'Markdown', ...backToMenuInline() });
  };

  bot.command('compte', show);
  bot.action('MY_ACCOUNT', show);
  bot.hears('👤 Mon compte', show);
}

module.exports = { register, buildAccountText };
