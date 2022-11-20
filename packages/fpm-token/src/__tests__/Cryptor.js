/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import crypto from 'crypto';
import Cryptor from '../Cryptor';

const cryp = new Cryptor({
  key: crypto
    .createHash('sha256')
    .update('password')
    .digest(),
  iv: '004D9E4433221100'
});

test('should encrypt and decrypt', t => {
  const plain = 'test string';
  const encrypted = cryp.encrypt(plain);
  t.not(encrypted, plain);
  const decrypted = cryp.decrypt(encrypted);
  t.is(decrypted, plain);
});
