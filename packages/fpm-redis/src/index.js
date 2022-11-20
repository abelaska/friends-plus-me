import Promise from 'bluebird';
import getPort from 'get-port';
import RedisServer from 'redis-server';
import redisClient from 'redis';

RedisServer.parseConfig = (source, target) => Object.assign(target, source);
RedisServer.parseFlags = cfg =>
  Object.keys(cfg)
    .filter(k => ['bin', 'conf'].indexOf(k) === -1 && cfg[k] !== undefined && cfg[k] !== null)
    .map(key => `--${key} ${cfg[key]}`);

let redisServer;
let redisPort;

const isTest = process.env.NODE_ENV === 'test';

export const redis = redisClient;

Promise.promisifyAll(redis.RedisClient.prototype);

if (redis.Multi && redis.Multi.prototype) {
  Promise.promisifyAll(redis.Multi.prototype);
}

export const startRedisServer = async () => {
  if (!redisServer) {
    // console.log('Test redis server starting...');
    redisPort = await getPort();
    redisServer = new RedisServer({ bind: '127.0.0.1', port: redisPort, save: '""', appendonly: 'no' });
    await redisServer.open();
    // console.log(`Test redis server(:${redisPort}) started`, process.pid);
  }
};

export const stopRedisServer = async () => {
  if (redisServer) {
    // console.log('Test redis server is stopping...');
    try {
      await redisServer.close();
    } catch (e) {
      // console.error('Test redis server failed to stop', e);
    }
    redisServer = null;
    // console.log('Test redis server is stopped');
  }
};

export const createRedisClient = (config, options) => {
  const args = isTest
    ? [
        {
          ...options,
          host: '127.0.0.1',
          port: redisPort,
          retry_strategy: () => 3000
        }
      ]
    : config && typeof config.get === 'function'
      ? config.get('redis:url') ? [config.get('redis:url'), options] : [config.get('redis')]
      : [config, options];
  // console.log('createRedisClient', args);
  return redis.createClient(...args);
};
