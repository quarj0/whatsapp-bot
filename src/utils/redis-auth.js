const { Store } = require('whatsapp-web.js');
const redis = require('./redis');

class RedisAuth extends Store {
  constructor(sessionKey = 'whatsapp-session') {
    super();
    this.sessionKey = sessionKey;
  }
  async setup() {
    const data = await redis.get(this.sessionKey);
    if (data) this.saveAuthInfo(JSON.parse(data));
  }
  async saveAuthInfo(auth) {
    await redis.set(this.sessionKey, JSON.stringify(auth));
  }
  async getAuthInfo() {
    const data = await redis.get(this.sessionKey);
    return data ? JSON.parse(data) : undefined;
  }
}
module.exports = RedisAuth;
