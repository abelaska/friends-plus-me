// @flow
import Promise from 'bluebird';
import crypto from 'crypto';
import rp from 'request-promise';
import config from '@fpm/config';
import { createRedisClient } from '@fpm/redis';
import OAuthTokenCryptor from './OAuthTokenCryptor';

const redisGoogleAccessTokenKey = ({ uid, hash }: Object) =>
  uid && ((hash && `google:at:${uid}:${hash}`) || `google:at:${uid}`);

class GoogleTokens {
  oAuthTokenCryptor: Object;
  redis: Object;
  clientId: string;
  clientSecret: string;
  newAccessTokenTimeout: number;

  constructor() {
    this.oAuthTokenCryptor = new OAuthTokenCryptor();
    this.redis = createRedisClient(config);
    this.clientId = config.get('google:clientId');
    this.clientSecret = config.get('google:clientSecret');
    this.newAccessTokenTimeout = 30 * 1000;
  }

  async getPlainAccessTokenForAccount({ secret, uid, parentUid }: Object) {
    uid = isNaN(secret) ? parentUid || uid : secret;
    const encryptedAccessToken = uid && (await this.getCachedAccessToken({ uid }));
    const plainAccessToken = encryptedAccessToken && this.oAuthTokenCryptor.decrypt(encryptedAccessToken);
    return plainAccessToken;
  }

  async ttlCachedAccessToken({ uid, hash }: Object) {
    let ttl = await this.redis.ttlAsync(redisGoogleAccessTokenKey({ uid, hash }));
    if (isNaN(ttl)) {
      ttl = -2;
    } else {
      ttl = parseInt(ttl);
    }
    return ttl;
  }

  async getCachedAccessToken({ uid, hash }: Object) {
    let key = redisGoogleAccessTokenKey({ uid, hash });
    if (!hash) {
      key = await this.redis.getAsync(key);
    }
    return key && (await this.redis.getAsync(key));
  }

  async setCachedAccessToken({ uid, hash, plainAccessToken, expiresInSeconds = 0 }: Object) {
    const encryptedAccessToken = this.oAuthTokenCryptor.encrypt(plainAccessToken);
    const key = redisGoogleAccessTokenKey({ uid, hash });
    await this.redis.setexAsync(key, expiresInSeconds, encryptedAccessToken);
    await this.redis.setexAsync(redisGoogleAccessTokenKey({ uid }), expiresInSeconds, key);
    return { encryptedAccessToken };
  }

  async newAccessToken(plainRefreshToken: string) {
    let triesRemaning = 1;
    let lastError;
    while (triesRemaning--) {
      try {
        return await rp({
          method: 'POST',
          url: 'https://accounts.google.com/o/oauth2/token',
          timeout: this.newAccessTokenTimeout,
          form: {
            client_secret: this.clientSecret,
            client_id: this.clientId,
            refresh_token: plainRefreshToken,
            grant_type: 'refresh_token'
          },
          json: true
        });
      } catch (error) {
        const errorStr = error.toString();
        const message = (error.error && error.error.error_description) || errorStr;
        const code = error.error && error.error.error;
        const { statusCode } = error;
        const e = new Error(message);
        /* $FlowFixMe */
        e.statusCode = statusCode;
        /* $FlowFixMe */
        e.code = code;
        /* $FlowFixMe */
        e.isTimeout = errorStr.indexOf('ESOCKETTIMEDOUT') > -1 || errorStr.indexOf('ETIMEDOUT') > -1;
        /* $FlowFixMe */
        e.isENOTFOUND = errorStr.indexOf('getaddrinfo ENOTFOUND') > -1;
        /* $FlowFixMe */
        e.isBadRequest = errorStr.indexOf('Bad Request') > -1;
        /* $FlowFixMe */
        e.isInvalidGrant = code === 'invalid_grant' && statusCode === 400;
        /* $FlowFixMe */
        e.isExpiredOrRevoked = e.isInvalidGrant && message === 'Token has been expired or revoked.';
        /* $FlowFixMe */
        e.isAccountDeleted = errorStr.indexOf('Account has been deleted') > -1;
        if (e.isBadRequest || e.isInvalidGrant || e.isAccountDeleted) {
          throw e;
        }
        lastError = e;
      }
    }
    throw lastError;
  }

  async storeAccessToken({ uid, plainRefreshToken, plainAccessToken, expiresInSeconds }: Object) {
    const hash = this.createHash(plainRefreshToken);

    expiresInSeconds = expiresInSeconds || 0;

    const encryptedRefreshToken = this.oAuthTokenCryptor.encrypt(plainRefreshToken);
    const { encryptedAccessToken } = await this.setCachedAccessToken({ uid, hash, plainAccessToken, expiresInSeconds });

    return {
      hash,
      expiresInSeconds,
      encryptedRefreshToken,
      encryptedAccessToken
    };
  }

  async createAccessToken({ uid, encryptedRefreshToken }: Object) {
    const plainRefreshToken: string = this.oAuthTokenCryptor.decrypt(encryptedRefreshToken);
    const hash = this.createHash(plainRefreshToken);
    const token = await this.newAccessToken(plainRefreshToken);

    const plainAccessToken = token.access_token;
    const expiresInSeconds = token.expires_in || 0;

    const { encryptedAccessToken } = await this.setCachedAccessToken({ uid, hash, plainAccessToken, expiresInSeconds });

    return {
      plainAccessToken,
      encryptedAccessToken,
      expiresInSeconds
    };
  }

  encryptedRefreshTokenHash(encryptedRefreshToken: string) {
    return this.createHash(this.oAuthTokenCryptor.decrypt(encryptedRefreshToken));
  }

  createHash(value: string) {
    return crypto
      .createHash('sha1')
      .update(value)
      .digest('base64');
  }
}

export default GoogleTokens;
