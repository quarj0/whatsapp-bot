const { Store } = require('whatsapp-web.js');
const redis = require('./redis');

class RedisAuth {
  constructor(sessionKey = 'wwebjs-session') {
    this.sessionKey = sessionKey;
  }

  async save(session) {
    await redis.set(this.sessionKey, JSON.stringify(session));
  }

  async load() {
    const data = await redis.get(this.sessionKey);
    return data ? JSON.parse(data) : null;
  }

  async remove() {
    await redis.del(this.sessionKey);
  }
}

module.exports = RedisAuth;
