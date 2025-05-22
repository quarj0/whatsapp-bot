const winston = require('winston');
const { createLogger, transports } = winston;
const config = require('./config');


const logger = createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'app.log' }),
  ],
});

/**
 * @param {Object} msg - The message object from WhatsApp Web.
 * @param {number} attempts - Number of retry attempts.
 * @param {number} initialDelay - Initial delay between retries in milliseconds.
 * @returns {Promise<Object>} The downloaded media object.
 * @throws {Error} If media download fails after retries.
 */
 async function safeDownload(msg, attempts = config.DOWNLOAD_RETRIES, initialDelay = config.DOWNLOAD_INITIAL_DELAY) {
  for (let i = 0; i < attempts; i++) {
    try {
      const media = await msg.downloadMedia();
      if (media?.data) {
        if (media.data.length > config.MAX_FILE_SIZE) {
          throw new Error('Media file too large');
        }
        const mediaType = media.mimetype.split('/')[0];
        if (!config.ALLOWED_MEDIA_TYPES.includes(mediaType)) {
          throw new Error('Unsupported media type');
        }
        return media;
      }
      logger.warn(`Attempt ${i + 1}: No media data`);
    } catch (err) {
      logger.warn(`Attempt ${i + 1} failed: ${err.message}`);
      if (!/mediaStage|No data found|Media not available/.test(err.message)) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, initialDelay * Math.pow(2, i))); 
    }
  }
  throw new Error('Media download failed after retries');
 }

module.exports = {
  safeDownload,
};