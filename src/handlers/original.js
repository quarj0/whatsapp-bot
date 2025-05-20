// const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
// const express = require('express');
// const qrcode = require('qrcode');
// const fs = require('fs');
// const path = require('path');
// const db = require('./utils/db');
// const ms = require('ms');
// const compression = require('compression');
// const { LRUCache } = require('lru-cache');
// const cron = require('node-cron');
// const axios = require('axios');


// const app = express();
// const PORT = process.env.PORT || 3000;

// app.get('/', (_, res) => res.send('Bot is running'));

// app.use(compression());
// app.use(express.static(path.join(__dirname, 'public')));

// let latestQR = null;
// let qrImageBuffer = null;

// app.get('/qr', (req, res) => {
//   if (!qrImageBuffer) return res.status(404).send('QR Code not available');
//   res.writeHead(200, {
//     'Content-Type': 'image/png',
//     'Content-Length': qrImageBuffer.length,
//   });
//   res.end(qrImageBuffer);
// });

// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
// });

// const client = new Client({
//   authStrategy: new LocalAuth(),
//   skipCache: true,
//   puppeteer: {
//     headless: true,
//     args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--single-process'],
//   },
// });

// let botJid = null;


// client.on('qr', async (qr) => {
//   latestQR = qr;
//   try {
//     const qrDataUrl = await qrcode.toDataURL(qr);
//     qrImageBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
//     console.log('✅ QR code updated and cached. Visit /qr to scan.');
//   } catch (e) {
//     console.error('Failed to cache QR:', e);
//   }
// });

// client.on('ready', () => {
//   botJid = client.info.wid._serialized;
//   adminJid = botJid;
//   console.log('🤖 Bot is ready! JID:', botJid);
// });

// async function safeDownload(msg, attempts = 5, delay = 1000) {
//   for (let i = 0; i < attempts; i++) {
//     try {
//       const media = await msg.downloadMedia();
//       if (media?.data) return media;
//       console.warn(`Attempt ${i + 1}: No media data`);
//     } catch (e) {
//       console.warn(`Attempt ${i + 1} failed: ${e.message}`);
//       if (!/mediaStage|No data found|Media not available/.test(e.message)) break;
//       await new Promise(r => setTimeout(r, delay));
//     }
//   }
//   throw new Error('Media download failed after retries');
// }

// const gptCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });

// const responses = {
//   school: `🏫 *School Website*:
// - Basic site: GHS 2,000+
// - Advanced portal: GHS 4,000+
// Note: Domain and hosting not included.`,

//   ecommerce: `🛒 *E-Commerce Website*:
// - Starting from GHS 3,500
// Includes product catalog, checkout, payment integration.
// Custom features may cost more.`,

//   domain: `🌐 *Domain & Hosting*:
// - Domain: GHS 150+/year
// - Hosting: GHS 250+/year
// I can help with setup and DNS config.`,

//   maintenance: `🛠️ *Website Maintenance*:
// - GHS 50/hour for fixes, updates, and support
// Let us know your needs for a custom plan.`,
// };

// client.on('message', async msg => {
//   if (msg.from === 'status@broadcast') return;

//   const fullId = msg.id._serialized;
//   const body = msg.body?.trim() || '';
//   const lc = body.toLowerCase();

//   const currentTime = Math.floor(Date.now() / 1000);
//   if (msg.timestamp < currentTime - 60) return;

  

//   const seen = await db('messages').where({ id: fullId }).first();
//   if (seen) return;

//   let mediaPath = null, mediaType = null;
//   if (msg.hasMedia || msg.isViewOnce) {
//     try {
//       const media = await safeDownload(msg);
//       const dir = path.join(__dirname, 'media', msg.isViewOnce ? 'view_once' : 'regular');
//       if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
//       const ext = media.mimetype.split('/')[1].split(';')[0];
//       mediaPath = path.join(dir, `${fullId}.${ext}`);
//       fs.writeFileSync(mediaPath, media.data, 'base64');
//       mediaType = media.mimetype;
//       console.log(`📎 Saved media: ${mediaPath}`);

//       if (msg.isViewOnce) {
//         const mediaMsg = MessageMedia.fromFilePath(mediaPath);
//         await client.sendMessage(adminJid, mediaMsg, {
//           caption: `View Once media from ${msg.from}`,
//           sendMediaAsDocument: true
//         });
//       }
//     } catch (e) {
//       console.warn(`⚠️ Media error:`, e.message);
//     }
//   }

//   // Insert message asynchronously
//   db('messages').insert({
//     id: fullId,
//     fromJid: msg.from,
//     body,
//     timestamp: msg.timestamp,
//     mediaPath,
//     mediaType,
//     isViewOnce: msg.isViewOnce ? 1 : 0,
//     processed: 1,
//   }).catch(console.error);

//   if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(lc)) {
//     return client.sendMessage(msg.from, 'Hello! I’m your technical assistant. You can type "help" for available services.');
//   }

//   if (lc === 'help') {
//     return client.sendMessage(msg.from,
//       'Available services:\n' +
//       '- Website Development\n- Cyber Security\n- Mobile Apps\n- API Development\n\n' +
//       'You can also ask about pricing, domain/hosting, or maintenance.\n\n'
//     );
//   }
//   // Business inquiries
//   if (lc === 'What services do you offer?' || lc === 'services' || lc === 'What services do you offer') {
//     return client.sendMessage(msg.from,
//       'We offer web development, mobile app development, e-commerce solutions, website maintenance, API integration, and technical support.\n',
//     );
//   }

//   if (lc === 'Do you offer mobile app development?' || lc === 'Do you offer mobile app development' || lc === 'what about cybersecurity') {
//     return client.sendMessage(msg.from,
//       `Yes, We conduct security assessments and implement hardening measures starting from GHS 4,000+, depending on the project's scope.\n`
//     );
//   }
//   if (lc === 'Can you integrate APIs into my website or app?' || lc === 'Can you integrate APIs into my website or app' || lc === 'I need help with integration of API into my website') {
//     return client.sendMessage(msg.from,
//       'Absolutely, we specialize in building and integrating APIs for both web and mobile applications. Contact us for a custom quote.\n',
//     );
//   }

//   if (lc === 'Do you offer technical support?' || lc === 'Do you offer technical support' || lc === 'I need help with technical support') {
//     return client.sendMessage(msg.from,
//       'Yes, we provide technical support for web and mobile applications. Our rate is GHS 50/hour. \n',
//     );
//   }
 

//   if (lc === 'Do you offer e-commerce solutions?' || lc === 'Do you offer e-commerce solutions' || lc === 'I need help with e-commerce' || lc === 'I need website, I sell products online') {
//     return client.sendMessage(msg.from,
//       'Yes, we provide e-commerce solutions starting from GHS 3,500. This includes product catalog, checkout, and payment integration.\n',
//     );  
//   }

//   // Pricing and Payment

//   if (lc === 'How much does a basic website cost?' || lc === 'How much does a basic website cost' || lc === 'How much do you charge for a basic webiste' || lc === 'What is the price of a basic website' || lc === 'what is your price for a basic website') {
//     return client.sendMessage(msg.from,
//       'Our basic websites start at GHS 2,000. Custom portals and e-commerce platforms can range from GHS 4,000 upwards. But it all depends on the kind of website and the features.\n',
//     );  
//   }

//   if (lc === 'What is the cost of an e-commerce website?' || lc === 'How much does an e-commerce website cost' || lc === 'How much do you charge for an e-commerce website' || lc === 'What is the price of an e-commerce website' || lc === 'what is your price for an e-commerce website') {
//     return client.sendMessage(msg.from,
//       'Our e-commerce solutions start at GHS 3,500. This includes product catalog, checkout, and payment integration.\n',
//     );  
//   }

//   if (lc === 'What are your payment methods?' || lc === 'What are your payment methods' || lc === 'Payment method' || lc === 'If I want to pay how' || lc === 'How do I pay') {
//     return client.sendMessage(msg.from,
//       'We accept Mobile Money (MoMo), bank transfers, and cash. A 50% deposit is required to commence work.\n',
//     );  
//   }

//   if (lc === 'How much does hosting cost?' || lc === 'How much does hosting cost' || lc === 'How much do you charge for hosting' || lc === 'What is the price of hosting' || lc === 'what is your price for hosting') {
//     return client.sendMessage(msg.from,
//       'Hosting services start from GHS 250 per year, depending on traffic, features, and resource requirements.\n',
//     );  
//   }
//   if (lc === 'What is the cost of domain registration?' || lc === 'How much does domain registration cost' || lc === 'How much do you charge for domain registration' || lc === 'What is the price of domain registration' || lc === 'what is your price for domain registration') {
//     return client.sendMessage(msg.from,
//       'Domain names start at GHS 150 per year, varying based on the domain extension (.com, .org, etc.).\n',
//     );  
//   }

//   // 🛠️ Maintenance & Support
//   if (lc === 'Do you offer website maintenance?' || lc === 'Do you offer website maintenance' || lc === 'I need help with website maintenance' || lc === 'I need some maintenance on my website') {
//     return client.sendMessage(msg.from,
//       'Yes, we charge GHS 50 per hour for site updates, bug fixes, and feature enhancements.\n',
//     );
//   }

//   if (lc === 'Can you fix my broken website?' || lc === 'Can you fix my broken website' || lc === 'My website seems not be working, can you I help me' || lc === 'I need help with fixing my website') {
//     return client.sendMessage(msg.from,
//       'Certainly. Please provide details or a screenshot, and we’ll assess and address the issue.\n',
//     );
//   }

//   if (lc === 'Can you update my website?' || lc === 'Can you update my website' || lc === 'I need help with updating my website' || lc === 'I need some updates on my website') {
//     return client.sendMessage(msg.from,
//       'Yes, we can help with updates.\n' +
//       "we can upgrade or redesign existing websites.  Please share the details of what you need updated or let's discuss your specific goals and requirements.",
//     );
//   }


//   // ⏱️ Project Timeline & Delivery
//   if (lc === 'How long will it take to build my website?' || lc === 'How long will it take to build my website' || lc === 'How long does it take to build a website' || lc === 'What is the time frame for building a website') {
//     return client.sendMessage(msg.from,
//       'The timeline depends on the project scope. A basic website typically takes 2-4 weeks, while custom projects may take longer. We’ll provide a timeline after discussing your requirements.\n',
//     );
//   }
//   if (lc === 'How long will it take to build my mobile app?' || lc === 'How long will it take to build my mobile app' || lc === 'How long does it take to build a mobile app' || lc === 'What is the time frame for building a mobile app') {
//     return client.sendMessage(msg.from,
//       'The timeline depends on the project scope. A basic mobile app typically takes 4-8 weeks, while custom projects may take longer. We’ll provide a timeline after discussing your requirements.\n',
//     );  
//   }
//   if (lc === 'How long will it take to build my e-commerce website?' || lc === 'How long will it take to build my e-commerce website' || lc === 'How long does it take to build an e-commerce website' || lc === 'What is the time frame for building an e-commerce website') {
//     return client.sendMessage(msg.from,
//       'The timeline depends on the project scope. A basic e-commerce website typically takes 4-8 weeks, while custom projects may take longer. We’ll provide a timeline after discussing your requirements.\n',
//     );
//   }
//   if (lc === 'How long will it take to build my API?' || lc === 'How long will it take to build my API' || lc === 'How long does it take to build an API' || lc === 'What is the time frame for building an API') {
//     return client.sendMessage(msg.from,
//       'The timeline depends on the project scope. A basic API typically takes 2-4 weeks, while custom projects may take longer. We’ll provide a timeline after discussing your requirements.\n',
//     );
//   }

//   // 🌐 Technical & Development
//   if (/website|web.*(development|design)/i.test(lc)) return client.sendMessage(msg.from, 'We specialize in web development. Please share your requirements for a quote.');
//   if (/mobile.*(app|application)/i.test(lc)) return client.sendMessage(msg.from, 'We develop mobile apps for Android and iOS. Please share your requirements for a quote.');
//   if (/API/i.test(lc)) return client.sendMessage(msg.from, 'We build APIs for various applications. Please share your requirements for a quote.');
//   if (/cyber.*(security|security assessment)/i.test(lc)) return client.sendMessage(msg.from, 'We conduct security assessments and implement hardening measures. Please share your requirements for a quote.');
//   if (/freelance|freelancing/i.test(lc)) return client.sendMessage(msg.from, 'I can assist with freelance projects. Please share your requirements for a quote.');
//   // mobile friendly, SEO and tech stack

//   if (/mobile.*(friendly|responsive)/i.test(lc)) return client.sendMessage(msg.from, 'We ensure websites are mobile-friendly. Please share your requirements for a quote.');
//   if (/SEO|search.*engine.*optimization/i.test(lc)) return client.sendMessage(msg.from, 'We can optimize your website for search engines. Please share your requirements for a quote.');
//   if (/tech.*(stack|technology)/i.test(lc)) return client.sendMessage(msg.from, 'We can work with various tech stacks. Please share your requirements for a quote.');
//   if (/frontend|backend|fullstack/i.test(lc)) return client.sendMessage(msg.from, 'We can work on frontend, backend, or fullstack projects. Please share your requirements for a quote.');
//   if (/code|programming|software/i.test(lc)) return client.sendMessage(msg.from, 'We can assist with coding and programming tasks. Please share your requirements for a quote.');
//   if (/bug|error|issue|problem/i.test(lc)) return client.sendMessage(msg.from, 'We can help with debugging and fixing issues. Please share your requirements for a quote.');
//   if (/website.*(maintenance|support)/i.test(lc)) return client.sendMessage(msg.from, responses.maintenance);



//   if (/school.*(website|site)/i.test(lc)) return client.sendMessage(msg.from, responses.school);
//   if (/e-?commerce.*(website|site)/i.test(lc)) return client.sendMessage(msg.from, responses.ecommerce);
//   if (/domain|hosting/.test(lc)) return client.sendMessage(msg.from, responses.domain);
//   if (/maintenance|update|fix/.test(lc)) return client.sendMessage(msg.from, responses.maintenance);

//   if (/(price|cost|how much)/i.test(lc)) {
//     return client.sendMessage(msg.from,
//       `💰 *Service Pricing*:
//   - 🌍 Website: GHS 2,000+ (basic), GHS 4,000+ (custom)
//   - 🔐 Cyber Security: GHS 4,000+ (assessment)
//   - 📱 Mobile Apps: GHS 4,000+ (basic), GHS 7,000+ (custom)
//   - 🖥️ Tech Support: GHS 50/hour
  
//   Ask about packages or get a quote!`
//     );
//   }

//   if (/how are you/.test(lc)) return client.sendMessage(msg.from, 'I’m great! Ready to assist. What do you need?');
//   if (/thank you|thanks|appreciate/.test(lc)) return client.sendMessage(msg.from, 'You’re welcome!');

//   const cacheKey = body.trim().toLowerCase();
//   if (gptCache.has(cacheKey)) {
//     return client.sendMessage(msg.from, gptCache.get(cacheKey));
//   }

 
// });

// client.initialize();

// const APP_URL = process.env.APP_URL || 'https://whatsapp-bot-3ktl.onrender.com';
// // Self-ping every 10 minutes to keep the app alive
// cron.schedule('*/10 * * * *', async () => {
//   try {
//     await axios.get(APP_URL);
//     console.log('⏱️ Self-pinged to stay alive.');
//   } catch (err) {
//     console.warn('⚠️ Self-ping failed:', err.message);
//   }
// });


// const askHF = require('./utils/gpt'); TODO - Uncomment when implementing GPT


 // TODO - Uncomment and implement the askHF function
  // try {
  //   const gptReply = await askHF(body);
  //   if (!gptReply) return;
  //   gptCache.set(cacheKey, gptReply);
  //   return client.sendMessage(msg.from, gptReply);
  // } catch (err) {
  //   console.error('❌ GPT error:', err.message);
  //   return client.sendMessage(msg.from, "Sorry, I couldn’t process that. Try rephrasing your message.");
  // }



// TODO
// if (lc === 'admin' && msg.fromMe) {
//   return client.sendMessage(msg.from,
//     'Admin Commands:\n' +
//     '- !status\n- !stats\n- !exit\n- !remove (in groups only)'
//   );
// }

// if (lc.startsWith('!')) {
//   if (msg.from !== msg.fromMe) {
//     return client.sendMessage(msg.from, '❌ Admin commands are restricted to the bot owner.');
//   }

//   if (lc === '!status') {
//     return client.sendMessage(msg.from, 'Bot is active and running.');
//   }



//   if (lc === '!stats') {
//     const totalRow = await db('messages').count({ count: '*' }).first();
//     const usersRow = await db('messages').countDistinct({ count: 'fromJid' }).first();
//     const total = totalRow.count;
//     const users = usersRow.count;
//     return client.sendMessage(msg.from,
//       `📊 Bot Stats:\n- Messages: ${total}\n- Users: ${users}`
//     );
//   }

//   if (lc === '!exit') {
//     await client.sendMessage(msg.from, 'Shutting down... \n\n Just a moment...');
//     return;
//   }

//   if (lc === '!remove') {
//     const chat = await msg.getChat();
//     if (!chat.isGroup) return client.sendMessage(msg.from, '❌ Group command only.');

//     const sender = chat.participants.find(p => p.id._serialized === msg.author);
//     if (!sender?.isAdmin) return client.sendMessage(msg.from, '❌ Only group admins can remove members.');

//     const mentions = await msg.getMentions();
//     if (!mentions.length) return client.sendMessage(msg.from, 'Tag someone to remove.');

//     const success = [];
//     for (const user of mentions) {
//       try {
//         await chat.removeParticipants([user.id._serialized]);
//         success.push(user.pushname || user.number);
//       } catch (e) {
//         console.warn('Remove failed:', e.message);
//       }
//     }

//     return client.sendMessage(chat.id._serialized, `✅ Removed: ${success.join(', ')}`);
//   }
// }
