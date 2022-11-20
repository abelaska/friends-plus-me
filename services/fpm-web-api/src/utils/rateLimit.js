const Promise = require('bluebird');
const ms = require('ms');
const { send } = require('micro');
const Limiter = require('ratelimiter');
const requestIp = require('request-ip');
const { createRedisClient } = require('@fpm/redis');
const config = require('@fpm/config');

const WAIT_FOR_REDIS_MS = 10000;

let rtRedis;

const getLimit = async ({ id, max, duration }) => {
  if (!id) {
    return null;
  }

  if (!rtRedis) {
    rtRedis = createRedisClient(config.get('redis'), { enable_offline_queue: false });

    let ready = false;
    const tryUntil = new Date().valueOf() + WAIT_FOR_REDIS_MS;
    while (!ready && tryUntil > new Date().valueOf()) {
      try {
        // eslint-disable-next-line no-await-in-loop
        ready = (await rtRedis.setAsync('test', '')) === 'OK';
        // eslint-disable-next-line no-empty
      } catch (ignore) {}
    }
  }

  return new Promise((resolve, reject) => {
    const lim = new Limiter({ id, max, duration, db: rtRedis });
    lim.get((error, limit) => {
      if (error) {
        return reject(error);
      }
      return resolve(limit);
    });
  });
};

const isRateLimited = async ({ res, name, id, max, duration }) => {
  const limit = id && (await getLimit({ id, max, duration }));
  if (limit) {
    res.setHeader('X-RateLimit-Limit', limit.total);
    res.setHeader('X-RateLimit-Remaining', limit.remaining - 1);
    res.setHeader('X-RateLimit-Reset', limit.reset);
  }

  if (!limit || limit.remaining) {
    return false;
  }
  // eslint-disable-next-line no-mixed-operators
  const delta = limit.reset * 1000 - Date.now();
  const after = limit.reset - Math.floor(Date.now() / 1000);

  res.setHeader('Retry-After', after);

  send(res, 429, {
    ok: false,
    error: 'rate_limit',
    error_description: `Rate limit "${name}" exceeded, retry in ${ms(delta, { long: true })}}`
  });
  res.sent = true;
  return true;
};

const rateLimit = () => async (req, res, next) => {
  const uid = req.user && req.user._id.toString();
  if (uid) {
    if (await isRateLimited({ res, name: 'user', id: uid, max: 200, duration: 100 * 1000 })) {
      return;
    }
  } else {
    // const cid = (req.token && req.token.client_id) || req.query.client_id;
    // if (cid) {
    //   if (await isRateLimited({ res, name: 'client', id: cid, max: 1000, duration: 100 * 1000 })) {
    //     return;
    //   }
    // } else {
    const ip = requestIp.getClientIp(req) || 'default';
    if (await isRateLimited({ res, name: `ip-${ip}`, id: ip, max: 1000, duration: 100 * 1000 })) {
      return;
    }
    // }
  }
  next();
};
module.exports.rateLimit = rateLimit;
