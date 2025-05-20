module.exports = {
    PORT: process.env.PORT || 3000,
    APP_URL: process.env.APP_URL || 'https://whatsapp-bot-3ktl.onrender.com',
    DOWNLOAD_RETRIES: 5,
    DOWNLOAD_INITIAL_DELAY: 1000,
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    ALLOWED_MEDIA_TYPES: ['image', 'video', 'audio', 'PDF', 'DOC'],
};