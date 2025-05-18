// utils/redis-auth.js
const redis = require('./redis');

class RedisAuth {
  constructor(sessionKey = 'whatsapp-session') {
    this.sessionKey = sessionKey;
  }

  // Called before browser is launched
  async beforeBrowserInitialized(opts) {
    // you can tweak opts here if needed
  }
    
  async onAuthenticationNeeded() {
    return { failed: false, restart: false };
  }

  // logout
  async logout() {
    await redis.del(this.sessionKey);
  }
  
  // Called after browser is launched
  async afterBrowserInitialized(browser) {}

  // Called before each page load
  async beforePageLoad(page) {}

  // Called on initialize, load and apply saved auth
  async setup(client) {
    const data = await redis.get(this.sessionKey);
    if (data) client.setAuthInfo(JSON.parse(data));
  }

  // Called by client to load existing session
  async getAuthInfo() {
    const data = await redis.get(this.sessionKey);
    return data ? JSON.parse(data) : undefined;
  }

  // Called by client to save session whenever it updates
  async saveAuthInfo(auth) {
    await redis.set(this.sessionKey, JSON.stringify(auth));
  }

  // Called by client to clear session
  async deleteAuthInfo() {
    await redis.del(this.sessionKey);
  }
}

module.exports = RedisAuth;
