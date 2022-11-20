/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
import session from 'express-session';
import { promise as sleep } from 'es6-sleep';
import test from 'ava';
import Cache from '../Cache';
import { createStore } from '../index';

const memcache = {
  location: 'localhost:11211'
};

const crypto = {
  key: '1234567890',
  iv: '0123456789012345'
};

const cache = new Cache({ memcache, crypto });
const store = createStore(session, {
  cache,
  prefix: Math.random().toString(36),
  maxAge: 1 * 1000
});

test.cb('should set', t => {
  const key = Math.random().toString(36);
  const value = Math.random().toString(36);
  store.set(key, value, t.end);
});

test('should get empty', t => {
  const key = Math.random().toString(36);
  store.get(key, (err, storedValue) => {
    t.falsy(err);
    t.falsy(storedValue);
    t.pass();
  });
});

test('should set and get', t => {
  const key = Math.random().toString(36);
  const value = Math.random().toString(36);
  store.set(key, value, (err) => {
    t.falsy(err);

    store.get(key, (err2, storedValue) => {
      t.falsy(err2);
      t.true(value, storedValue);
      t.pass();
    });
  });
});

test('should set, get expired', async t => {
  const key = Math.random().toString(36);
  const value = Math.random().toString(36);
  store.set(key, value, async (err) => {
    t.falsy(err);

    store.get(key, async (err2, storedValue) => {
      t.falsy(err2);
      t.true(value, storedValue);

      await sleep(1100);

      store.get(key, (err3, storedValue2) => {
        t.falsy(err3);
        t.falsy(storedValue2);
        t.pass();
      });
    });
  });
});
