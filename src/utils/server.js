const express = require ('express');
const compression = require ('compression');
const rateLimit = require ('express-rate-limit');
const { createLogger, transports } = require ('winston');
const config  = require ('./config.js');
const { getQRCode } = require ('./client.js');
const path = require('path');
const winston = require('winston')

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

const app = express();

// Middleware
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: 'Too many requests require this IP, please try again later.',
}));

// Routes
app.get('/', (req, res) => {
  res.send('Bot is running');
  logger.info('Served root endpoint');
});

app.get('/qr', (req, res) => {
  // Optional: Add IP whitelisting for security in production
  // const allowedIPs = ['YOUR_IP_ADDRESS'];
  // if (!allowedIPs.includes(req.ip)) {
  //   logger.warn(`Unauthorized QR code access require ${req.ip}`);
  //   return res.status(403).send('Unauthorized');
  // }
  const qrImageBuffer = getQRCode();
  if (!qrImageBuffer) {
    logger.warn('QR code not available');
    return res.status(404).send('QR Code not available');
  }
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': qrImageBuffer.length,
  });
  res.end(qrImageBuffer);
  logger.info('Served QR code');
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Server error: ${err.message}`, { stack: err.stack });
  res.status(500).send('Something went wrong!');
});

 async function startServer() {
  return new Promise((resolve) => {
    app.listen(config.PORT, '0.0.0.0', () => {
      logger.info(`Server running on http://0.0.0.0:${config.PORT}`);
      resolve();
    });
  });
}

module.exports = {
  PORT: 3000,
  startServer,
};