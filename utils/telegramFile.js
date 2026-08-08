/**
 * utils/telegramFile.js
 * Telecharge un fichier Telegram (photo envoyee par l'utilisateur)
 * et le convertit en data URI base64, pret a etre injecte dans un
 * template HTML (CV en image, page de portfolio).
 */

const logger = require('./logger');

const MAX_PHOTO_BYTES = 6 * 1024 * 1024; // 6 Mo de securite

/**
 * @param {import('telegraf').Telegram} telegram - ctx.telegram
 * @param {string} fileId - file_id Telegram (ex: le plus grand ctx.message.photo[n].file_id)
 * @returns {Promise<string>} data URI "data:image/jpeg;base64,...."
 */
async function downloadPhotoAsDataUri(telegram, fileId) {
  const fileLink = await telegram.getFileLink(fileId);
  const response = await fetch(fileLink.href || fileLink);

  if (!response.ok) {
    throw new Error(`Telechargement de la photo echoue (HTTP ${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_PHOTO_BYTES) {
    throw new Error('Photo trop volumineuse (max 6 Mo).');
  }

  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

async function safeDownloadPhoto(telegram, fileId) {
  try {
    return await downloadPhotoAsDataUri(telegram, fileId);
  } catch (err) {
    logger.error('[TELEGRAM_FILE] Echec telechargement photo:', err.message);
    return null;
  }
}

module.exports = { downloadPhotoAsDataUri, safeDownloadPhoto };
