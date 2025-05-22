const { startServer } = require('./utils/server.js');
const { initializeClient, client } = require('./utils/client.js');
const { createLogger, transports } = require('winston');
const winston = require('winston');

const logger = createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'app.log' }),
    new transports.File({ filename: 'error.log', level: 'error' }),
  ],
});

async function main() {
  try {
    await startServer();
    logger.info('Server started successfully');

    await initializeClient();
    logger.info('WhatsApp client initialized');
  } catch (err) {
    logger.error('Startup error:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM. Shutting down...');
 if (client) await client.destroy();
  logger.info('WhatsApp client destroyed');
  process.exit(0);
});

main();