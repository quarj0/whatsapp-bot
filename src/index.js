const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const db = require('./utils/db');
const ms = require('ms');

const OWNER_JID = '233595603554@c.us';

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-cache'],
    timeout: 60000
  }
});

let botJid = null;

client.on('qr', qr => {
  console.log('QR code generated');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  botJid = client.info.wid._serialized;
  console.log('✅ Bot is ready! JID:', botJid);
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

const responses = {
  school: `A school website starts from GHS 2,000. Advanced portals start at GHS 4,000. Domain/hosting not included.`,
  ecommerce: `E-commerce sites start at GHS 3,500. Includes products, checkout, payment. Custom features cost more.`,
  domain: `Domains: GHS 150+/year. Hosting: GHS 250+/year. We can help you set them up.`,
  maintenance: `We charge GHS 50/hour for fixes or updates. For ongoing support, let us know your needs.`,
};

client.on('message', async msg => {
  if (msg.from === 'status@broadcast') return;

  if (msg.from !== OWNER_JID && !msg.fromMe) return;

  if (msg.fromMe) msg.from = OWNER_JID;

  const fullId = msg.id._serialized;
  const from = msg.from;
  const body = msg.body?.trim() || '';
  const lc = body.toLowerCase();

  const currentTime = Math.floor(Date.now() / 1000);
  if (msg.timestamp < currentTime - 60) return;

  const seen = db.prepare('SELECT 1 FROM messages WHERE id = ?').get(fullId);
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
        await client.sendMessage(OWNER_JID, mediaMsg, {
          caption: `View Once media from ${from}`,
          sendMediaAsDocument: true
        });
      }
    } catch (e) {
      console.warn(`⚠️ Media error:`, e.message);
    }
  }

  db.prepare(`
    INSERT INTO messages (id, fromJid, body, timestamp, mediaPath, mediaType, isViewOnce, processed)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(fullId, from, body, msg.timestamp, mediaPath, mediaType, msg.isViewOnce ? 1 : 0);

  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(lc)) {
    return client.sendMessage(from, 'Hello! I’m your assistant. Type "help" for available services.');
  }

  if (lc === 'help') {
    return client.sendMessage(from, 
      'Available services:\n' +
      '- Website Development\n- Cyber Security\n- Mobile Apps\n- API Development\n\n' +
      'Ask about cost, maintenance, or features. I’m here to help!'
    );
  }

  if (lc === 'admin') {
    return client.sendMessage(from,
      'Admin Commands:\n' +
      '- !status\n- !info\n- !stats\n- !exit\n- !remove (in groups only)'
    );
  }

  // Admin commands
  if (lc === '!status') {
    return client.sendMessage(from, 'Bot is active and running.');
  }

  if (lc === '!info') {
    return client.sendMessage(from,
      'Bot Info:\n- Version: 1.0.0\n- Developer: K. Owusu Ansah\n- Services: Automation for Businesses\n'
    );
  }

  if (lc === '!stats') {
    const total = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
    const users = db.prepare('SELECT COUNT(DISTINCT fromJid) as count FROM messages').get().count;
    return client.sendMessage(from,
      `📊 Bot Stats:\n- Messages: ${total}\n- Users: ${users}`
    );
  }

  if (lc === '!exit') {
    await client.sendMessage(from, 'Shutting down...');
    await client.destroy();
    return;
  }

  if (lc.startsWith('!remove')) {
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

  // Service-specific replies
  if (/school.*(website|site)/i.test(lc)) return client.sendMessage(from, responses.school);
  if (/e-?commerce.*(website|site)/i.test(lc)) return client.sendMessage(from, responses.ecommerce);
  if (/domain|hosting/.test(lc)) return client.sendMessage(from, responses.domain);
  if (/maintenance|update|fix/.test(lc)) return client.sendMessage(from, responses.maintenance);

  // Pricing general
  if (lc.includes('price') || lc.includes('cost') || lc.includes('how much')) {
    return client.sendMessage(from,
      '💰 Prices:\n- Websites: GHS 2,000+ (basic), GHS 4,000+ (custom)\n' +
      '- Cyber Security: GHS 4,000+ (assessment)\n' +
      '- Mobile Apps: GHS 4,000+ (basic), GHS 7,000+ (custom)\n' +
      '- Tech Support: GHS 50/hr\nAsk for a quote!'
    );
  }



  if (/how are you/.test(lc)) return client.sendMessage(from, 'I’m great! Ready to assist. What do you need?');
  if (/thank you|thanks|appreciate/.test(lc)) return client.sendMessage(from, 'You’re welcome!');
});

client.initialize();
