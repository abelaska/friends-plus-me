// @flow
import crypto from 'crypto';
import shortid from 'shortid';
import { createRedisClient } from '@fpm/redis';
import { SSOStoreError, SSOInvalidDataError, SSOInvalidSessionIdError, SSONotInitializedError } from './SSOError';

export type SSOConstructor = {
  hydra: Object,
  config?: ?Object,
  redisConfig?: ?Object,
  clientId: string,
  clientSecret: string,
  sessionTTL?: number, // session TTL in seconds, 0 = store forever
  storePrefix?: string, // store key prefix
  sessionKey: string // plain session key
};

export type SessionKey = {
  key: string,
  iv: string
};

export type SetOptions = {
  ttl?: number // in seconds
};

export type SSOSession = {
  accessToken: string,
  refreshToken: string,
  atExpiresAt: number // unix timestamp (ms) of time of expiration of access token
};

export default class SSOSessionManager {
  redis: Object;
  hydra: Object;
  clientId: string;
  clientSecret: string;
  sessionTTL: number;
  storePrefix: string;
  initialized: boolean;
  sessionKey: ?Buffer;

  constructor({
    hydra,
    config,
    redisConfig,
    clientId,
    clientSecret,
    sessionKey,
    storePrefix = 'sso:',
    sessionTTL = 31 * 24 * 60 * 60
  }: SSOConstructor) {
    if (!config && !redisConfig) {
      throw new SSOStoreError('Redis configuration not set');
    }
    if (!sessionKey) {
      throw new SSOStoreError('`sessionKey` property not set');
    }
    this.hydra = hydra;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.sessionTTL = sessionTTL;
    this.storePrefix = storePrefix;
    this.redis = createRedisClient(config || redisConfig);
    this.sessionKey = crypto.createHash('sha256').update(sessionKey).digest();
  }

  async init(): Promise<SSOSessionManager> {
    return this;
  }

  async accessToken(encryptedSessionId: string): Promise<?string> {
    // get session from store
    const session: ?SSOSession = await this.get(encryptedSessionId);
    if (!session) {
      return null;
    }

    if (session.atExpiresAt <= new Date().valueOf()) {
      // access token is expired
      const token = await this.hydra.createAccessToken({
        refresh_token: session.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      });
      session.accessToken = token.access_token;
      session.refreshToken = token.refresh_token || session.refreshToken;
      session.atExpiresAt = this.expiresIn(token.expires_in);

      await this.set(encryptedSessionId, session, { ttl: this.sessionTTL });
    }

    return session.accessToken;
  }

  async create(session: SSOSession, { ttl = 0 }: SetOptions = {}): Promise<string> {
    const encryptedSessionId = this.newSessionId();
    await this.set(encryptedSessionId, session, { ttl: ttl || this.sessionTTL });
    return encryptedSessionId;
  }

  async remove(encryptedSessionId: string) {
    return this.set(encryptedSessionId);
  }

  async set(encryptedSessionId: string, session: ?SSOSession, { ttl = 0 }: SetOptions = {}) {
    const key = `${this.storePrefix}${this.decryptSessionId(encryptedSessionId)}`;
    const encryptedSession = session && this.encryptSession(JSON.stringify(session));
    return new Promise((resolve, reject) => {
      const cb = (...okReplies) => (error, reply) => {
        if (okReplies.indexOf(reply) > -1) {
          resolve(reply);
        } else {
          reject(new SSOStoreError(error || reply));
        }
      };
      if (encryptedSession) {
        return ttl > 0
          ? this.redis.setex(key, ttl, encryptedSession, cb('OK'))
          : this.redis.set(key, encryptedSession, cb('OK'));
      }
      return this.redis.del(key, cb(0, 1));
    });
  }

  async get(encryptedSessionId: string): Promise<?SSOSession> {
    const key = `${this.storePrefix}${this.decryptSessionId(encryptedSessionId)}`;
    const encryptedSession = await new Promise((resolve, reject) => {
      this.redis.get(key, (error, reply) => {
        if (error) {
          return reject(new SSOStoreError(error));
        }
        return resolve(reply);
      });
    });
    const json = encryptedSession && (await this.decryptSession(encryptedSession));
    const session: SSOSession = json && JSON.parse(json);
    return session;
  }

  newSessionId(): string {
    const plainSessionId: string = this.generatePlainSessionId();
    return this.encryptSessionId(plainSessionId);
  }

  generatePlainSessionId(): string {
    return new Array(4)
      .fill(null)
      .map(() => shortid.generate())
      .join('');
  }

  expiresIn(expiresIn: number) {
    return new Date().valueOf() + (expiresIn || 0) * 1000;
  }

  encryptSessionId(plainSessionId: string): string {
    return this.encryptSession(plainSessionId);
  }

  decryptSessionId(encryptedSessionId: string): string {
    try {
      return this.decryptSession(encryptedSessionId);
    } catch (e) {
      if (e instanceof SSOInvalidDataError) {
        throw new SSOInvalidSessionIdError();
      } else {
        throw e;
      }
    }
  }

  encryptSession(plain: string): string {
    if (!this.sessionKey) throw new SSONotInitializedError();
    const key: Buffer = this.sessionKey;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted: Buffer = cipher.update(plain, 'utf8');
    try {
      const encryptedFinal: Buffer = cipher.final();
      const tag: Buffer = cipher.getAuthTag();
      return Buffer.concat([tag, iv, encrypted, encryptedFinal]).toString('base64');
    } catch (e) {
      if (e.message === 'Unsupported state or unable to authenticate data') {
        throw new SSOInvalidDataError();
      } else {
        throw e;
      }
    }
  }

  decryptSession(encrypted: string): string {
    if (!this.sessionKey) throw new SSONotInitializedError();
    const key: Buffer = this.sessionKey;
    const input = new Buffer(encrypted, 'base64');
    const tag = input.slice(0, 16);
    const iv = input.slice(16, 16 + 16);
    const ciphertext = input.slice(16 + 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    try {
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch (e) {
      if (e.message === 'Unsupported state or unable to authenticate data') {
        throw new SSOInvalidDataError();
      } else {
        throw e;
      }
    }
  }
}
