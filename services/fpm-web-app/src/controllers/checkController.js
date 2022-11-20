const Promise = require('bluebird');
const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { ObjectId, User } = require('@fpm/db');
const { createRedisClient } = require('@fpm/redis');

const host = config.get('instance-id');
const redis = createRedisClient(config, { detect_buffers: true });

module.exports = () => async (req, res, next) => {
  if (['/1/check', '/2/check'].indexOf(req.path) > -1) {
    return res.json({ host });
  }
  if (['/1/ping', '/2/ping'].indexOf(req.path) > -1) {
    return Promise.all([
      User.findById(ObjectId(), '_id').exec().then(() => ({ mongodb: true })).catch(() => ({ mongodb: false })),
      new Promise(resolve => redis.set('ping', 'pong', err => resolve({ redis: !err })))
    ]).then(results => {
      const ready = Object.assign({}, ...results);
      const ok = Object.values(ready).reduce((r, v) => (r ? v : r), true);
      if (!ok) {
        log.warn('PING not ok', ready);
      }
      res.status(ok ? 200 : 500).json({ ok, host, message: 'pong', ready });
    });
  }
  return next();
};
