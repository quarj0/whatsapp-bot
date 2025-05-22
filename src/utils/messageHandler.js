const { MessageMedia } = require ('whatsapp-web.js');
const sanitizeHtml = require ('sanitize-html');
const { createLogger, transports } = require ('winston');
const { LRUCache } = require ('lru-cache');
const db = require ('./db.js');
const responses = require ('./responses.js');
const { safeDownload } = require ('./utils.js');
const path = require ('path');
const fs = require('fs');
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
  ],
});

const gptCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 });

const handlers = {
  greeting: (msg, client) => client.sendMessage(msg.from, 'Hello! I’m your technical assistant. Type "help" for services.'),
  help: (msg, client) => client.sendMessage(msg.from, responses.help),
  pricing: (msg, client) => client.sendMessage(msg.from, responses.pricing),
  services: (msg, client) => client.sendMessage(msg.from, responses.services),
  mobileApp: (msg, client) => client.sendMessage(msg.from, responses.mobileApp),
  apiIntegration: (msg, client) => client.sendMessage(msg.from, responses.apiIntegration),
  technicalSupport: (msg, client) => client.sendMessage(msg.from, responses.technicalSupport),
  ecommerce: (msg, client) => client.sendMessage(msg.from, responses.ecommerce),
  websiteCost: (msg, client) => client.sendMessage(msg.from, responses.websiteCost),
  ecommerceCost: (msg, client) => client.sendMessage(msg.from, responses.ecommerce),
  paymentMethods: (msg, client) => client.sendMessage(msg.from, responses.paymentMethods),
  hostingCost: (msg, client) => client.sendMessage(msg.from, responses.hostingCost),
  domainCost: (msg, client) => client.sendMessage(msg.from, responses.domainCost),
  maintenance: (msg, client) => client.sendMessage(msg.from, responses.maintenance),
  fixWebsite: (msg, client) => client.sendMessage(msg.from, responses.fixWebsite),
  updateWebsite: (msg, client) => client.sendMessage(msg.from, responses.updateWebsite),
  websiteTimeline: (msg, client) => client.sendMessage(msg.from, responses.websiteTimeline),
  mobileAppTimeline: (msg, client) => client.sendMessage(msg.from, responses.mobileAppTimeline),
  ecommerceTimeline: (msg, client) => client.sendMessage(msg.from, responses.ecommerceTimeline),
  apiTimeline: (msg, client) => client.sendMessage(msg.from, responses.apiTimeline),
  thankyou: (msg, client) => client.sendMessage(msg.from, 'You’re welcome!'),
  howAreYou: (msg, client) => client.sendMessage(msg.from, 'I’m great! Ready to assist. What do you need?'),
};

 async function handleMessage(msg, client, adminJid) {
    if (msg.from === 'status@broadcast') return;

    const fullId = msg.id._serialized;
    const body = sanitizeHtml(msg.body?.trim() || '', { allowedTags: [], allowedAttributes: {} });
    const lc = body.toLowerCase();
    const currentTime = Math.floor(Date.now() / 1000);

    if (msg.timestamp < currentTime - 60) {
        logger.info(`Ignored old message: ${fullId}`);
        return;
    }

    const seen = await db('messages').where({ id: fullId }).first();
    if (seen) {
        logger.info(`Ignored duplicate message: ${fullId}`);
        return;
    }

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
            logger.info(`Saved media: ${mediaPath}`);

            if (msg.isViewOnce) {
                const mediaMsg = MessageMedia.fromFilePath(mediaPath);
                await client.sendMessage(adminJid, mediaMsg, {
                    caption: `View Once media from ${msg.from}`,
                    sendMediaAsDocument: true,
                });
                logger.info(`Sent view-once media to admin from ${msg.from}`);
            }
        } catch (err) {
            logger.warn(`Media error for message ${fullId}: ${err.message}`);
        }
    }

    await db('messages')
        .insert({
            id: fullId,
            fromJid: msg.from,
            body,
            timestamp: msg.timestamp,
            mediaPath,
            mediaType,
            isViewOnce: msg.isViewOnce ? 1 : 0,
            processed: 1,
        })
        .catch((err) => logger.error(`Failed to insert message ${fullId}: ${err.message}`));

    // Check cache
    const cacheKey = lc;
    if (gptCache.has(cacheKey)) {
        const cachedResponse = gptCache.get(cacheKey);
        await client.sendMessage(msg.from, cachedResponse);
        logger.info(`Served cached response for message ${fullId}`);
        return;
    }

    if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(lc)) {
        await handlers.greeting(msg, client);
    } else if (lc === 'help') {
        await handlers.help(msg, client);
    } else if (/price|cost|how much/i.test(lc)) {
        await handlers.pricing(msg, client);
    } else if (['what services do you offer', 'services'].includes(lc)) {
        await handlers.services(msg, client);
    } else if (['do you offer mobile app development', 'what about cybersecurity'].includes(lc)) {
        await handlers.mobileApp(msg, client);
    } else if (['can you integrate apis into my website or app', 'i need help with integration of api into my website'].includes(lc)) {
        await handlers.apiIntegration(msg, client);
    } else if (['do you offer technical support', 'i need help with technical support'].includes(lc)) {
        await handlers.technicalSupport(msg, client);
    } else if (['do you offer e-commerce solutions', 'i need help with e-commerce', 'i need website, i sell products online'].includes(lc)) {
        await handlers.ecommerce(msg, client);
    } else if (['how much does a basic website cost', 'how much do you charge for a basic website', 'what is the price of a basic website'].includes(lc)) {
        await handlers.websiteCost(msg, client);
    } else if (['what is the cost of an e-commerce website', 'how much does an e-commerce website cost', 'how much do you charge for an e-commerce website'].includes(lc)) {
        await handlers.ecommerceCost(msg, client);
    } else if (['what are your payment methods', 'payment method', 'if i want to pay how', 'how do i pay'].includes(lc)) {
        await handlers.paymentMethods(msg, client);
    } else if (['how much does hosting cost', 'how much do you charge for hosting', 'what is the price of hosting'].includes(lc)) {
        await handlers.hostingCost(msg, client);
    } else if (['what is the cost of domain registration', 'how much does domain registration cost', 'what is the price of domain registration'].includes(lc)) {
        await handlers.domainCost(msg, client);
    } else if (['do you offer website maintenance', 'i need help with website maintenance', 'i need some maintenance on my website'].includes(lc)) {
        await handlers.maintenance(msg, client);
    } else if (['can you fix my broken website', 'my website seems not be working, can you help me', 'i need help with fixing my website'].includes(lc)) {
        await handlers.fixWebsite(msg, client);
    } else if (['can you update my website', 'i need help with updating my website', 'i need some updates on my website'].includes(lc)) {
        await handlers.updateWebsite(msg, client);
    } else if (['how long will it take to build my website', 'how long does it take to build a website', 'what is the time frame for building a website'].includes(lc)) {
        await handlers.websiteTimeline(msg, client);
    } else if (['how long will it take to build my mobile app', 'how long does it take to build a mobile app', 'what is the time frame for building a mobile app'].includes(lc)) {
        await handlers.mobileAppTimeline(msg, client);
    } else if (['how long will it take to build my e-commerce website', 'how long does it take to build an e-commerce website', 'what is the time frame for building an e-commerce website'].includes(lc)) {
        await handlers.ecommerceTimeline(msg, client);
    } else if (['how long will it take to build my api', 'how long does it take to build an api', 'what is the time frame for building an api'].includes(lc)) {
        await handlers.apiTimeline(msg, client);
    } else if (/thank you|thanks|appreciate/.test(lc)) {
        await handlers.thankyou(msg, client);
    } else if (/how are you/.test(lc)) {
        await handlers.howAreYou(msg, client);
    } else if (/school.*(website|site)/i.test(lc)) {
        await client.sendMessage(msg.from, responses.school);
    } else if (/e-?commerce.*(website|site)/i.test(lc)) {
        await client.sendMessage(msg.from, responses.ecommerce);
    } else if (/domain|hosting/.test(lc)) {
        await client.sendMessage(msg.from, responses.domain);
    } else if (/maintenance|update|fix/.test(lc)) {
        await client.sendMessage(msg.from, responses.maintenance);
    } else if (/website|web.*(development|design)/i.test(lc)) {
        await client.sendMessage(msg.from, 'We specialize in web development. Please share your requirements for a quote.');
    } else if (/mobile.*(app|application)/i.test(lc)) {
        await client.sendMessage(msg.from, 'We develop mobile apps for Android and iOS. Please share your requirements for a quote.');
    } else if (/api/i.test(lc)) {
        await client.sendMessage(msg.from, 'We build APIs for various applications. Please share your requirements for a quote.');
    } else if (/cyber.*(security|security assessment)/i.test(lc)) {
        await client.sendMessage(msg.from, 'We conduct security assessments and implement hardening measures. Please share your requirements for a quote.');
    } else if (/freelance|freelancing/i.test(lc)) {
        await client.sendMessage(msg.from, 'I can assist with freelance projects. Please share your requirements for a quote.');
    } else if (/mobile.*(friendly|responsive)/i.test(lc)) {
        await client.sendMessage(msg.from, 'We ensure websites are mobile-friendly. Please share your requirements for a quote.');
    } else if (/seo|search.*engine.*optimization/i.test(lc)) {
        await client.sendMessage(msg.from, 'We can optimize your website for search engines. Please share your requirements for a quote.');
    } else if (/tech.*(stack|technology)/i.test(lc)) {
        await client.sendMessage(msg.from, 'We can work with various tech stacks. Please share your requirements for a quote.');
    } else if (/frontend|backend|fullstack/i.test(lc)) {
        await client.sendMessage(msg.from, 'We can work on frontend, backend, or fullstack projects. Please share your requirements for a quote.');
    } else if (/code|programming|software/i.test(lc)) {
        await client.sendMessage(msg.from, 'We can assist with coding and programming tasks. Please share your requirements for a quote.');
    } else if (/bug|error|issue|problem/i.test(lc)) {
        await client.sendMessage(msg.from, 'We can help with debugging and fixing issues. Please share your requirements for a quote.');
    }

    logger.info(`Processed message ${fullId} from ${msg.from}`);
 }

module.exports = {
    handleMessage,
};