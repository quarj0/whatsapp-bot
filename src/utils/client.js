const { Client, LocalAuth, MessageMedia }= require ('whatsapp-web.js');
const qrcode = require ('qrcode');
const { createLogger, transports } = require ('winston');
const NodeCache = require ('node-cache');
const { handleMessage } = require ('./messageHandler.js');
const config = require('./config.js');
const cron = require("node-cron")
const winston = require('winston')
const axios = require('axios');

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

const qrCache = new NodeCache({ stdTTL: 300 }); 
let client;
let botJid;
let adminJid;

async function initializeClient() {
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--single-process'],
    },
  });

  client.on('qr', async (qr) => {
    try {
      const qrDataUrl = await qrcode.toDataURL(qr);
      const qrImageBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      qrCache.set('latestQR', qrImageBuffer);
      logger.info(`QR code updated and cached. Visit ${config.APP_URL}/qr to scan.`);
      
      // Notify admin via console (and WhatsApp if client is ready)
      console.log(`New QR code generated. Access it at ${config.APP_URL}/qr`);
      if (adminJid) {
        await client.sendMessage(adminJid, `New QR code generated. Access it at ${config.APP_URL}/qr`);
      }
    } catch (err) {
      logger.error('Failed to cache QR:', err);
    }
  });

  client.on('ready', () => {
    botJid = client.info.wid._serialized;
    adminJid = botJid; 
    logger.info(`Bot is ready! JID: ${botJid}`);
    
    // Send any pending QR code URL to admin
    const qrImageBuffer = qrCache.get('latestQR');
    if (qrImageBuffer) {
      client.sendMessage(adminJid, `QR code available. Access it at ${config.APP_URL}/qr`);
    }
  });

  client.on('error', (err) => {
    logger.error('WhatsApp client error:', err);
  });

  client.on('message', (msg) => handleMessage(msg, client, adminJid));

  await client.initialize();
}

cron.schedule('*/10 * * * *', async () => {
    try {
        await axios.get(config.APP_URL);
        console.log('⏱️ Self-pinged to stay alive.');
    } catch (err) {
        console.warn('⚠️ Self-ping failed:', err.message);
    }
    });
    
function getQRCode() {
  return qrCache.get('latestQR');
}

module.exports = {
  initializeClient,
  getQRCode,
  client,
};