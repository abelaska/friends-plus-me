/* jshint node: true, esversion: 6 */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const _ = require('underscore');
const bluebird = require('bluebird');
const { createRedisClient } = require('@fpm/redis');

const db = createRedisClient(config);

let keyPrefix = '';
let keys = [];

function catchCallback(error) {
  log.error('Failed to update metric in database', { error: error });
}

var registerKey = (exports.registerKey = function registerKey(key) {
  key = keyPrefix ? keyPrefix + ':' + key : key;
  if (keys.indexOf(key) === -1) {
    keys.push(key);
  }
  return key;
});

var registerKeys = (exports.registerKeys = function registerKeys(keys) {
  if (!_.isArray(keys) && arguments.length > 0) {
    keys = _.values(arguments);
  }
  if (keys.length > 0) {
    for (var i = 0; i < keys.length; i++) {
      keys[i] = registerKey(keys[i]);
    }
  }
  return keys;
});

var clearKeys = (exports.clearKeys = function clearKeys() {
  keys = [];
});

var setKeys = (exports.setKeys = function setKeys(newKeys) {
  keys = newKeys || [];
});

var getKeys = (exports.getKeys = function getKeys() {
  return keys;
});

var setKeyPrefix = (exports.setKeyPrefix = function setKeyPrefix(newKeyPrefix) {
  keyPrefix = newKeyPrefix;
});

var set = (exports.set = function set(key, value) {
  return db.setAsync(registerKey(key), value).catch(catchCallback);
});

var setAll = (exports.setAll = function setAll(obj) {
  var saveObj = {},
    oldKeys = _.keys(obj),
    newKeys = registerKeys(oldKeys);
  for (var i = 0; i < oldKeys.length; i++) {
    saveObj[newKeys[i]] = obj[oldKeys[i]];
  }
  return db.msetAsync(saveObj).catch(catchCallback);
});

var inc = (exports.inc = function inc(key) {
  return db.incrAsync(registerKey(key)).catch(catchCallback);
});

var incby = (exports.incby = function incby(key, value) {
  return db.incrbyAsync(registerKey(key), value).catch(catchCallback);
});

var get = (exports.get = function get(key) {
  return db.getAsync(key).catch(catchCallback);
});

var getAll = (exports.getAll = function getAll(getKeys) {
  return db
    .sendAsync('mget', getKeys || keys)
    .then(function(values) {
      return bluebird.cast(_.object(getKeys || keys, values));
    })
    .catch(catchCallback);
});
