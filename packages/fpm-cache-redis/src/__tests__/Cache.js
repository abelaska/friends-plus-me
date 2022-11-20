/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
import { promise as sleep } from 'es6-sleep';
import test from 'ava';
import Cache from '../Cache';

const memcache = {
  location: 'localhost:11211'
};

const crypto = {
  key: '1234567890',
  iv: '0123456789012345'
};

test('should set and get locally unencrypted', async t => {
  const cache = new Cache();
  const key = Math.random().toString(36);
  const value = Math.random().toString(36);
  await cache.set(key, value);
  const stored = await cache.get(key);
  t.true(stored === value);
});

test('should set and get locally encrypted', async t => {
  const cache = new Cache({ crypto });
  const key = Math.random().toString(36);
  const value = Math.random().toString(36);
  await cache.set(key, value);
  const stored = await cache.get(key);
  t.true(stored === value);
});

test('should set and get memcache unencrypted', async t => {
  const cache = new Cache({ memcache });
  const key = Math.random().toString(36);
  const value = Math.random().toString(36);
  await cache.set(key, value, 1);
  const stored = await cache.get(key);
  t.true(stored === value);
});

test('should set and get memcache encrypted', async t => {
  const cache = new Cache({ memcache, crypto });
  const key = Math.random().toString(36);
  const value = Math.random().toString(36);
  await cache.set(key, value, 1);
  const stored = await cache.get(key);
  t.true(stored === value);
});

test('should set and get memcache unencrypted with expiration', async t => {
  const cache = new Cache({ memcache });
  const key = Math.random().toString(36);
  const value = Math.random().toString(36);
  await cache.set(key, value, 1);
  await sleep(1100);
  const stored = await cache.get(key);
  t.falsy(stored);
});

test('should set and get memcache encrypted with expiration', async t => {
  const cache = new Cache({ memcache, crypto });
  const key = Math.random().toString(36);
  const value = Math.random().toString(36);
  await cache.set(key, value, 1);
  await sleep(1100);
  const stored = await cache.get(key);
  t.falsy(stored);
});

test('should generate random key', async t => {
  const cache = new Cache({ memcache, crypto });
  const key = await cache.randomKey();
  t.truthy(key);
});

test('should get non-existing key from memcache', async t => {
  const cache = new Cache({ memcache, crypto });
  const key = Math.random().toString(36);
  const stored = await cache.get(key);
  t.falsy(stored);
});
