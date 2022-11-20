import crypto from 'crypto';
import config from '@fpm/config';
import Cryptor from './Cryptor';

const isDev = config.get('isDev');
const isTest = config.get('isTest');
const isDisabled = config.get('oauth:tokens:store:crypto:disabled');

const key = () => {
  const k = config.get('oauth:tokens:store:crypto:key');
  if (!k && !isDev && !isTest && !isDisabled) {
    throw new Error('OAuth tokens crypto key not found');
  }
  return crypto
    .createHash('sha256')
    .update(k || '')
    .digest();
};

const iv = () => {
  const i = config.get('oauth:tokens:store:crypto:iv');
  if (!i && !isDev && !isTest && !isDisabled) {
    throw new Error('OAuth tokens crypto initial vector not found');
  }
  return i || '';
};

export default class OAuthTokenCryptor extends Cryptor {
  constructor() {
    super({
      key: key(),
      iv: iv()
    });
  }
}
