const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);
redis.on('error', e => console.error('Redis error', e));
module.exports = redis;
