/* eslint no-unused-vars: "off", no-multi-assign: "off" */
const jwt = require('jsonwebtoken');
const LRU = require('lru-cache');
const { ObjectId, User } = require('@fpm/db');
const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { createError } = require('./error');

const tokenCache = LRU({ max: 50000 });
const adminsByEmail = config.get('admin:emails') || [];

if (process.env.NODE_ENV !== 'test') {
  setInterval(() => tokenCache.prune(), 10 * 60 * 1000);
}

const bearerToken = req => {
  let token = (req.query && req.query.access_token) || (req.body && req.body.access_token);
  if (!token && req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }
  return token;
};

const jwtVerify = (token, secret, options) =>
  new Promise((resolve, reject) =>
    jwt.verify(token, secret, options, (error, decoded) => (error && reject(error)) || resolve(decoded))
  );

const decodeToken = (module.exports.decodeToken = async ({ token, skipCache, hydra }) => {
  let dtoken;
  if (!skipCache) {
    dtoken = tokenCache.get(token);
    if (dtoken !== undefined) {
      return dtoken;
    }
  }
  try {
    dtoken = await hydra.introspectToken(token);
    if (dtoken && !dtoken.active) {
      dtoken = null;
    }
  } catch (e) {
    const { error, response } = e;
    log.error('Failed to introspect access token', {
      response,
      stack: !error && e.stack,
      error: !error && e
    });
  }
  return dtoken;
});

const getTokenUserId = (module.exports.getTokenUserId = async ({ token, hydra }) => {
  const dtoken = await decodeToken({ token, hydra });
  return dtoken && dtoken.sub;
});

const oauthAcceptedScopes = (module.exports.oauthAcceptedScopes = (res, acceptedScopes) => {
  res.setHeader('X-Accepted-OAuth-Scopes', (acceptedScopes && acceptedScopes.join(',')) || '');
});

const scopes = (module.exports.scopes = (...expectedScopes) => async (req, res, next) => {
  if (expectedScopes.length === 0) {
    return next();
  }
  if (!req.scopes || req.scopes.length === 0) {
    return createError('access_denied');
  }
  const allowed = expectedScopes.some(scope => req.scopes.indexOf(scope) !== -1);
  oauthAcceptedScopes(res, expectedScopes);
  return allowed ? next() : createError('access_denied');
});

const scope = (module.exports.scope = (req, scopeName) => {
  return req.scopes.indexOf(scopeName) > -1;
});

const isEmailVisibleByScope = (module.exports.isEmailVisibleByScope = req => {
  return scope(req, 'users.read.email') || scope(req, 'admin');
});

const assignTokenToReq = ({ dtoken, req }) => {
  req.token = dtoken;
  req.clientId = dtoken.client_id;
  req.user = dtoken.user;
  req.isAdmin = (req.user && adminsByEmail.indexOf(req.user.email) > -1) || false;
  req.scopes = dtoken.scopes;
};

const oauth = (module.exports.oauth = ({ userExistenceRequired } = { userExistenceRequired: true }) => async (
  req,
  res,
  next
) => {
  const { deps: { hydra } } = req;
  const token = bearerToken(req);
  if (!token) {
    return createError('not_authed');
  }

  const dtoken = await decodeToken({ token, hydra });
  if (!dtoken) {
    return createError('invalid_auth');
  }

  if (dtoken.verified) {
    assignTokenToReq({ dtoken, req });
    return next();
  }

  if (userExistenceRequired) {
    const userId = ObjectId.isValid(dtoken.sub) ? dtoken.sub : null;
    const user = userId && (await User.findById(dtoken.sub, '_id state email profiles').exec());
    if (!user) {
      return createError('user_not_found');
    }
    if (!user.isEnabled) {
      return createError('user_inactive');
    }
    dtoken.user = user;
  }

  dtoken.scopes = (dtoken.scope || '')
    .split(' ')
    .map(s => s.toLowerCase().trim())
    .filter(s => s);
  dtoken.verified = true;

  const now = Math.floor(new Date().valueOf() / 1000);
  const maxAge = Math.min(Math.max(0, dtoken.exp - now), 3 * 60 * 60 * 1000);

  tokenCache.set(token, dtoken, maxAge);

  assignTokenToReq({ dtoken, req });

  return next();
});
