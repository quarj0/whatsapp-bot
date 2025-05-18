const redis = require('./redis');

class RedisAuth {
  constructor(sessionKey = 'whatsapp-session') {
    this.sessionKey = sessionKey;
  }

  async setup(client) {
    const data = await redis.get(this.sessionKey);
    if (data) {
      client.setAuthInfo(JSON.parse(data));
    }
  }

  async getAuthInfo() {
    const data = await redis.get(this.sessionKey);
    return data ? JSON.parse(data) : undefined;
  }

  async saveAuthInfo(auth) {
    await redis.set(this.sessionKey, JSON.stringify(auth));
  }
}

module.exports = RedisAuth;
