/* eslint no-unused-vars: "off", no-multi-assign: "off" */
const micro = require('micro');
const { send } = require('micro');
const { parse } = require('url');
const requestIp = require('request-ip');
const Promise = require('bluebird');
const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { findFunction } = require('./functions');
const { addValidation } = require('./validations');
const { unix } = require('./time');
const { scheduleTypes } = require('./scheduling');
const { sanitizeObj, isTrue } = require('./text');
const { createError } = require('./error');
const { rateLimit } = require('./rateLimit');

const RE_REPEAT_INTERVAL = /^([0-9]+)([hdwm])$/;

const defaultErrorStatusCode = (module.exports.defaultErrorStatusCode = 400);
const statusCodeErrors = (module.exports.statusCodeErrors = {
  400: ['invalid_body', 'invalid_json', 'invalid_request', 'missing_arg'], // Bad Request
  500: ['internal_error'], // Internal Server Error
  401: ['invalid_auth', 'not_authed'], // Unauthorized
  403: [
    'access_denied',
    'app_not_found',
    'draft_not_found',
    'invalid_client',
    'invalid_grant',
    'post_not_found',
    'team_not_found',
    'queue_blocked',
    'queue_not_found',
    'user_inactive',
    'user_not_found'
  ] // Forbidden
});

module.exports.rateLimit = rateLimit;

const sanitizeBody = (module.exports.sanitizeBody = (...ignoreKeys) => async (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObj(req.body, ...ignoreKeys);
  }
  next();
});

const executeMiddleware = (module.exports.executeMiddleware = async (req, res, middleware) => {
  let value;
  let next;
  for (let i = 0; i < middleware.length; i++) {
    next = false;
    // eslint-disable-next-line no-await-in-loop, no-loop-func, no-return-assign
    value = await middleware[i](req, res, () => (next = true));
    if (!next) {
      break;
    }
  }
  return value;
});

const oauthScopes = (module.exports.oauthScopes = res => {
  const { req } = res;
  if (!req) {
    return;
  }
  if (req.scopes !== undefined) {
    res.setHeader('X-OAuth-Scopes', (req.scopes && req.scopes.join(',')) || '');
  }
});

const responseTime = (module.exports.responseTime = res => {
  if (!res.req || !res.req.startAt) {
    return;
  }
  const diff = process.hrtime(res.req.startAt);
  // eslint-disable-next-line no-mixed-operators
  const time = diff[0] * 1e3 + diff[1] * 1e-6;
  res.setHeader('X-Response-Time', `${time.toFixed(3)}ms`);
});

const redirect = (module.exports.redirect = (res, status, url, headers) => {
  responseTime(res);
  res.writeHead(status, Object.assign({}, headers || {}, { Location: url }));
  res.end();
  res.sent = true;
});

const json = (module.exports.json = ({ limit, encoding } = {}) => async (req, res, next) => {
  try {
    req.body = await micro.json(req, { limit: limit || '1mb', encoding: encoding || 'utf8' });
  } catch (e) {
    if (e.statusCode === 413) {
      return createError('invalid_body', e.toString());
    }
    return createError('invalid_json', 'Invalid structure');
  }
  return next();
});

const method = (module.exports.method = (expectedMethod = 'GET') => {
  if (['GET', 'POST', 'DELETE', 'PATCH', 'HEAD'].indexOf(expectedMethod) === -1) {
    throw new Error(`Unsupported method: ${expectedMethod}`);
  }
  return async (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Max-Age', 60 * 60);
    res.setHeader('Access-Control-Allow-Methods', expectedMethod);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Headers',
      ['X-Requested-With', 'X-HTTP-Method-Override', 'Content-Type', 'Authorization', 'Accept'].join(',')
    );
    if (req.method === 'OPTIONS') {
      return '';
    }
    if (req.method === expectedMethod) {
      return next();
    }
    res.sent = true;
    return send(res, 405); // 405 Method Not Allowed
  };
});

const args = (module.exports.args = (...expectedArgs) => async (req, res, next) => {
  const reqArgs = Object.keys(req.query);
  if (expectedArgs.length === 0) {
    return next();
  }
  if (reqArgs.length === 0) {
    return createError('missing_arg', `Missing arguments: ${expectedArgs.join(', ')}`);
  }

  const missingArgs = expectedArgs.filter(arg => reqArgs.indexOf(arg) === -1);
  if (missingArgs.length) {
    return createError('missing_arg', `Missing arguments: ${missingArgs.join(', ')}`);
  }

  return next();
});

const sendValue = (req, res, value) => {
  if (value && (typeof value === 'object' || typeof value === 'number')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (req.query.pretty !== undefined) {
      value = JSON.stringify(value, null, 2);
    }
  }

  if (!res.sent) {
    responseTime(res);
    oauthScopes(res);
  }

  return value;
};

const useStatusCode = (module.exports.useStatusCode = req => (req.query && isTrue(req.query.use_status_code)) || false);

const errorToStatusCode = (module.exports.errorToStatusCode = error => {
  const status = Object.keys(statusCodeErrors).find(s => statusCodeErrors[s].indexOf(error) > -1);
  return status ? (typeof status === 'string' ? parseInt(status, 10) : status) : defaultErrorStatusCode;
});

const enhanceStatusCode = (module.exports.enhanceStatusCode = requestProcessor => async (req, res) => {
  const reply = await requestProcessor(req, res);
  if (useStatusCode(req) && reply && !reply.ok) {
    return send(res, errorToStatusCode(reply.error), reply);
  }
  return reply;
});

const httpLogger = (module.exports.httpLogger = requestProcessor => (req, res) => {
  const skip = req.url && (req.url.indexOf('/_ah/') === 0 || req.url === '/health');
  if (!skip) {
    const tm = new Date();
    const end = res.end;
    req.ip = requestIp.getClientIp(req);
    res.end = (chunk, encoding, callback) => {
      res.end = end;
      console.log(`${req.ip} ${req.method} ${req.url} ${res.statusCode} - ${new Date() - tm} ms`);
      return res.end(chunk, encoding, callback);
    };
  }
  return requestProcessor(req, res);
});

const httpFunction = (module.exports.httpFunction = ({ deps, overrideFce, overrideName } = {}) => async (req, res) => {
  res.req = req;
  req.startAt = process.hrtime();

  const { pathname, query } = parse(req.url, true);
  const name = overrideName || pathname.substr(1);

  if (name === '') {
    return redirect(res, 301, 'https://developers.friendsplus.me');
  }

  req.query = query || {};
  req.function = { name };
  req.deps = deps;

  const fce = overrideFce || findFunction(name);
  if (!fce) {
    return send(res, 404);
  }

  if (!Array.isArray(fce)) {
    return sendValue(req, res, fce(req, res));
  }

  const middleware = fce.reduce((r, f) => {
    if (Array.isArray(f)) {
      r = r.concat(f);
    } else {
      r.push(f);
    }
    return r;
  }, []);

  let value;
  try {
    value = await executeMiddleware(req, res, middleware);
  } catch (error) {
    if (config.get('isTest')) {
      console.error(`Failed to process ${name} request`, {
        name,
        stack: error.stack
      });
    }
    log.error(`Failed to process ${name} request`, {
      name,
      stack: error.stack
    });
    return createError('internal_error');
  }

  return sendValue(req, res, value);
});

const testFunction = (module.exports.testFunction = (name, fce, validation, deps) => {
  if (validation) {
    addValidation(name, validation);
  }
  return micro(httpFunction({ deps, overrideFce: fce, overrideName: name }));
});

const extractScheduleArgs = (module.exports.extractScheduleArgs = ({ query }) => {
  const noChanneling = isTrue(query.no_channeling || 'true');

  const schedule = (query.schedule || 'now').toLowerCase();
  if (scheduleTypes.indexOf(schedule) === -1) {
    return {
      error: createError(
        'invalid_request',
        `Invalid parameter 'schedule' value '${schedule}', allowed values [${scheduleTypes.join(',')}].`
      )
    };
  }

  const publishAt = query.publish_at && !isNaN(query.publish_at) && parseInt(query.publish_at, 10);
  if (schedule === 'at') {
    if (!query.publish_at) {
      return { error: createError('missing_arg', 'Missing arguments: publish_at') };
    }
    if (!publishAt) {
      return { error: createError('invalid_request', `Parameter 'publish_at' invalid value '${query.publish_at}'`) };
    }
    if (publishAt < unix(new Date())) {
      return { error: createError('invalid_request', "Parameter 'publish_at' value must be set to the future") };
    }
  }

  const repeat = isTrue(query.repeat || 'false');
  let repeatInterval;
  let repeatIntervalUnit;
  let repeatCount;

  if (repeat) {
    if (!query.repeat_interval) {
      return { error: createError('missing_arg', 'Missing arguments: repeat_interval') };
    }
    if (!query.repeat_count) {
      return { error: createError('missing_arg', 'Missing arguments: repeat_count') };
    }
    if (isNaN(query.repeat_count)) {
      return {
        error: createError('invalid_request', `Parameter 'repeat_count' invalid value '${query.repeat_count}'`)
      };
    }

    const repeatIntervalExec = RE_REPEAT_INTERVAL.exec(query.repeat_interval);
    repeatInterval = repeatIntervalExec && parseInt(repeatIntervalExec[1], 10);
    if (!repeatIntervalExec || repeatInterval < 1) {
      return {
        error: createError('invalid_request', `Parameter 'repeat_interval' invalid value '${query.repeat_interval}'`)
      };
    }

    const iu = repeatIntervalExec[2];
    repeatIntervalUnit =
      iu === 'h' ? 'hours' : iu === 'd' ? 'days' : iu === 'w' ? 'weeks' : iu === 'm' ? 'months' : null;

    repeatCount = parseInt(query.repeat_count, 10);
  }

  return { noChanneling, schedule, publishAt, repeat, repeatCount, repeatInterval, repeatIntervalUnit };
});
