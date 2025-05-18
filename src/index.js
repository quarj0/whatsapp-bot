const { Client, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const db = require('./utils/db');
const ms = require('ms');
const askHF = require('./utils/gpt');
const compression = require('compression');
const { LRUCache } = require('lru-cache');
const RedisAuth = require('./utils/redis-auth');
const cron = require('node-cron');
const axios = require('axios');


const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_, res) => res.send('Bot is running'));

app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));

let latestQR = null;
let qrImageBuffer = null;

app.get('/qr', (req, res) => {
  if (!qrImageBuffer) return res.status(404).send('QR not available');
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': qrImageBuffer.length,
  });
  res.end(qrImageBuffer);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});

const client = new Client({
  authStrategy: new RedisAuth('whatsapp-session'),
  skipCache: true,
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

let botJid = null;
let adminJid = null;

client.on('qr', async (qr) => {
  latestQR = qr;
  try {
    const qrDataUrl = await qrcode.toDataURL(qr);
    qrImageBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    console.log('✅ QR code updated and cached. Visit /qr to scan.');
  } catch (e) {
    console.error('Failed to cache QR:', e);
  }
});

client.on('ready', () => {
  botJid = client.info.wid._serialized;
  adminJid = botJid;
  console.log('🤖 Bot is ready! JID:', botJid);
});

async function safeDownload(msg, attempts = 5, delay = 1000) {
  for (let i = 0; i < attempts; i++) {
    try {
      const media = await msg.downloadMedia();
      if (media?.data) return media;
      console.warn(`Attempt ${i + 1}: No media data`);
    } catch (e) {
      console.warn(`Attempt ${i + 1} failed: ${e.message}`);
      if (!/mediaStage|No data found|Media not available/.test(e.message)) break;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Media download failed after retries');
}

const gptCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });

const responses = {
  school: `🏫 *School Website*:
- Basic site: GHS 2,000+
- Advanced portal: GHS 4,000+
Note: Domain and hosting not included.`,

  ecommerce: `🛒 *E-Commerce Website*:
- Starting from GHS 3,500
Includes product catalog, checkout, payment integration.
Custom features may cost more.`,

  domain: `🌐 *Domain & Hosting*:
- Domain: GHS 150+/year
- Hosting: GHS 250+/year
We’ll help with setup and DNS config.`,

  maintenance: `🛠️ *Website Maintenance*:
- GHS 50/hour for fixes, updates, and support
Let us know your needs for a custom plan.`,
};

client.on('message', async msg => {
  if (msg.from === 'status@broadcast') return;

  let from = msg.from;
  const fullId = msg.id._serialized;
  const body = msg.body?.trim() || '';
  const lc = body.toLowerCase();

  const currentTime = Math.floor(Date.now() / 1000);
  if (msg.timestamp < currentTime - 60) return;

  if (msg.fromMe) from = adminJid;

  const seen = await db('messages').where({ id: fullId }).first();
  if (seen) return;

  let mediaPath = null, mediaType = null;
  if (msg.hasMedia || msg.isViewOnce) {
    try {
      const media = await safeDownload(msg);
      const dir = path.join(__dirname, 'media', msg.isViewOnce ? 'view_once' : 'regular');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const ext = media.mimetype.split('/')[1].split(';')[0];
      mediaPath = path.join(dir, `${fullId}.${ext}`);
      fs.writeFileSync(mediaPath, media.data, 'base64');
      mediaType = media.mimetype;
      console.log(`📎 Saved media: ${mediaPath}`);

      if (msg.isViewOnce) {
        const mediaMsg = MessageMedia.fromFilePath(mediaPath);
        await client.sendMessage(adminJid, mediaMsg, {
          caption: `View Once media from ${from}`,
          sendMediaAsDocument: true
        });
      }
    } catch (e) {
      console.warn(`⚠️ Media error:`, e.message);
    }
  }

  // Insert message asynchronously
  db('messages').insert({
    id: fullId,
    fromJid: from,
    body,
    timestamp: msg.timestamp,
    mediaPath,
    mediaType,
    isViewOnce: msg.isViewOnce ? 1 : 0,
    processed: 1,
  }).catch(console.error);

  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(lc)) {
    return client.sendMessage(from, 'Hello! I’m your technical assistant. You can type "help" for available services.');
  }

  if (lc === 'help') {
    return client.sendMessage(from,
      'Available services:\n' +
      '- Website Development\n- Cyber Security\n- Mobile Apps\n- API Development\n\n' +
      'You can also ask about pricing, domain/hosting, or maintenance.\n\n'
    );
  }

  if (lc === 'admin') {
    return client.sendMessage(from,
      'Admin Commands:\n' +
      '- !status\n- !info\n- !stats\n- !exit\n- !remove (in groups only)'
    );
  }

  if (lc.startsWith('!')) {
    if (from !== adminJid) {
      return client.sendMessage(from, '❌ Admin commands are restricted to the bot owner.');
    }

    if (lc === '!status') {
      return client.sendMessage(from, 'Bot is active and running.');
    }

    if (lc === '!info') {
      return client.sendMessage(from,
        'Bot Info:\n- Version: 1.0.0\n- Developer: K. Owusu Ansah\n- Services: Automation for Businesses\n'
      );
    }

    if (lc === '!stats') {
      const totalRow = await db('messages').count({ count: '*' }).first();
      const usersRow = await db('messages').countDistinct({ count: 'fromJid' }).first();
      const total = totalRow.count;
      const users = usersRow.count;
      return client.sendMessage(from,
        `📊 Bot Stats:\n- Messages: ${total}\n- Users: ${users}`
      );
    }

    if (lc === '!exit') {
      await client.sendMessage(from, 'Shutting down... \n\n Just a moment...');
      return;
    }

    if (lc === '!remove') {
      const chat = await msg.getChat();
      if (!chat.isGroup) return client.sendMessage(from, '❌ Group command only.');

      const sender = chat.participants.find(p => p.id._serialized === msg.author);
      if (!sender?.isAdmin) return client.sendMessage(from, '❌ Only group admins can remove members.');

      const mentions = await msg.getMentions();
      if (!mentions.length) return client.sendMessage(from, 'Tag someone to remove.');

      const success = [];
      for (const user of mentions) {
        try {
          await chat.removeParticipants([user.id._serialized]);
          success.push(user.pushname || user.number);
        } catch (e) {
          console.warn('Remove failed:', e.message);
        }
      }

      return client.sendMessage(chat.id._serialized, `✅ Removed: ${success.join(', ')}`);
    }
  }

  if (/school.*(website|site)/i.test(lc)) return client.sendMessage(from, responses.school);
  if (/e-?commerce.*(website|site)/i.test(lc)) return client.sendMessage(from, responses.ecommerce);
  if (/domain|hosting/.test(lc)) return client.sendMessage(from, responses.domain);
  if (/maintenance|update|fix/.test(lc)) return client.sendMessage(from, responses.maintenance);

  if (/(price|cost|how much)/i.test(lc)) {
    return client.sendMessage(from,
      `💰 *Service Pricing*:
  - 🌍 Website: GHS 2,000+ (basic), GHS 4,000+ (custom)
  - 🔐 Cyber Security: GHS 4,000+ (assessment)
  - 📱 Mobile Apps: GHS 4,000+ (basic), GHS 7,000+ (custom)
  - 🖥️ Tech Support: GHS 50/hour
  
  Ask about packages or get a quote!`
    );
  }

  if (/how are you/.test(lc)) return client.sendMessage(from, 'I’m great! Ready to assist. What do you need?');
  if (/thank you|thanks|appreciate/.test(lc)) return client.sendMessage(from, 'You’re welcome!');

  const cacheKey = body.trim().toLowerCase();
  if (gptCache.has(cacheKey)) {
    return client.sendMessage(from, gptCache.get(cacheKey));
  }

  try {
    const gptReply = await askHF(body);
    if (!gptReply) return;
    gptCache.set(cacheKey, gptReply);
    return client.sendMessage(from, gptReply);
  } catch (err) {
    console.error('❌ GPT error:', err.message);
    return client.sendMessage(from, "Sorry, I couldn’t process that. Try rephrasing your message.");
  }
});

client.initialize();

const APP_URL = process.env.APP_URL || 'https://whatsapp-bot-3ktl.onrender.com';
// Self-ping every 4 minutes to keep the app alive 
cron.schedule('*/4 * * * *', async () => {
  try {
    await axios.get(APP_URL);
    console.log('⏱️ Self-pinged to stay alive.');
  } catch (err) {
    console.warn('⚠️ Self-ping failed:', err.message);
  }
});
