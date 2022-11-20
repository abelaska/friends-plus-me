/* jshint node: true */

const LRU = require('lru-cache');
const Memcached = require('memcached');
const crypto = require('crypto');
const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { CacheRedis } = require('@fpm/cache-redis');

const memcachedAddr = config.get('MEMCACHE_PORT_11211_TCP_ADDR');
const memcachedPort = config.get('MEMCACHE_PORT_11211_TCP_PORT');
const memcachedLocation = memcachedAddr && memcachedPort && `${memcachedAddr}:${memcachedPort}`;
const memcached =
  memcachedLocation &&
  new Memcached(memcachedLocation, {
    poolSize: 16,
    timeout: 5000,
    reconnect: 5000,
    retries: 5,
    failures: 1000
  });

const redisCache = config.get('crawler:cache:provider') === 'redis' && new CacheRedis({ config });

const localCache =
  !memcachedLocation &&
  !redisCache &&
  LRU({
    max: 2000,
    maxAge: 24 * 60 * 60 * 1000
  });

log.info(`Caching engine: ${memcached ? `memcached (${memcachedLocation})` : redisCache ? 'redis' : 'local'}`);

if (localCache) {
  setInterval(() => localCache.prune(), 10 * 60 * 1000);
}

exports.hash = url =>
  crypto
    .createHash('md5')
    .update(url)
    .digest('hex');

exports.set = (key, value, expireInSeconds, callback) => {
  if (memcached) {
    return memcached.set(key, value, expireInSeconds, callback);
  }
  if (redisCache) {
    return redisCache
      .set(key, value, expireInSeconds, callback)
      .then(() => callback())
      .catch(callback);
  }
  localCache.set(key, value, (expireInSeconds && expireInSeconds * 1000) || undefined);
  return callback();
};

exports.get = (key, callback) => {
  if (memcached) {
    return memcached.get(key, callback);
  }
  if (redisCache) {
    return redisCache
      .get(key)
      .then(value => callback(null, value))
      .catch(callback);
  }
  return callback(null, localCache.get(key));
};
