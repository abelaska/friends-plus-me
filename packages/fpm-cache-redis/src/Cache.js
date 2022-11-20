// @flow
// import Promise from 'bluebird';
import crypto from 'crypto';
import { createRedisClient } from '@fpm/redis';

const cryptoPrefix = 'enc:';

// const randomBytes = Promise.promisify(crypto.randomBytes);

// const randomKey = async (length: number = 512) =>
//   randomBytes(512).then(buffer =>
//     crypto
//       .createHash('sha256')
//       .update(buffer)
//       .digest('hex')
//   );

export type Cryptor = {
  encrypt: (encrypted: string) => string,
  decrypt: (plan: string) => string
};

export type CacheOptions = {
  config: ?Object,
  cryptor: ?Cryptor,
  client: ?any
};

export default class Cache {
  cryptor: ?Cryptor;
  client: any;

  constructor({ client, config, cryptor }: CacheOptions = {}) {
    this.client = client || createRedisClient(config);
    this.cryptor = cryptor;
  }

  async decrypt(data: ?string) {
    if (this.cryptor && data && data.indexOf(cryptoPrefix) === 0) {
      const encrypted = data.split(':')[1];
      return (this.cryptor && this.cryptor.decrypt(encrypted)) || data;
    }
    return data;
  }

  async encrypt(data: string) {
    if (this.cryptor && data) {
      return `${cryptoPrefix}${this.cryptor.encrypt(data)}`;
    }
    return data;
  }

  static hash(key: string) {
    return `cache:${crypto
      .createHash('sha1')
      .update(key)
      .digest('base64')}`;
  }

  async set(key: string, value: string, expireInSeconds: ?number = 0) {
    const storeValue = await this.encrypt(value);
    if (expireInSeconds && expireInSeconds > 0) {
      return this.client.setexAsync(key, expireInSeconds, storeValue);
    }
    return this.client.setAsync(key, storeValue);
  }

  async get(key: string) {
    return this.decrypt(await this.client.getAsync(key));
  }

  async touch(key: string, expireInSeconds: ?number) {
    return this.client.expireAsync(key, expireInSeconds);
  }

  async del(key: string) {
    return this.client.delAsync(key);
  }

  // hash set
  async hset(key: string, value: string, expireInSeconds: ?number) {
    return this.set(Cache.hash(key), value, expireInSeconds);
  }

  // hash get
  async hget(key: string) {
    return this.get(Cache.hash(key));
  }

  // hash del
  async hdel(key: string) {
    return this.del(Cache.hash(key));
  }
}
