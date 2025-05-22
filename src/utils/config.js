module.exports = {
    PORT: process.env.PORT || 3000,
    APP_URL: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
    DOWNLOAD_RETRIES: 5,
    DOWNLOAD_INITIAL_DELAY: 1000,
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    ALLOWED_MEDIA_TYPES: ['image', 'video', 'audio', 'PDF', 'DOC'],
};