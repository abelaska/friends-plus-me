/* jshint node: true */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { User } = require('@fpm/db');
const crypto = require('crypto');

const tokenSecret = config.get('token:secret');

const stateStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';

function sign(data) {
  return crypto.createHmac('sha256', tokenSecret).update(data).digest('base64');
}

function encryptToken(data, maxAge) {
  var cipher = crypto.createCipher('aes-256-cbc', tokenSecret),
      d = JSON.stringify({
        s: new Date().valueOf(),
        e: new Date().valueOf()+maxAge,
        d: data
      }),
      ed = (cipher.update(d,'utf8','base64') + cipher.final('base64')),
      sed = sign(d);
  return encodeURIComponent(ed + '.' + sed);
}

function decryptToken(encryptedToken) {
  try {
    var parts = decodeURIComponent(encryptedToken).split('.'),
        decipher = crypto.createDecipher('aes-256-cbc', tokenSecret),
        d = decipher.update(parts[0],'base64','utf8') + decipher.final('utf8'),
        s = sign(d),
        token = JSON.parse(d);
    if (parts[1] === s && s.length > 0) {
      if (token.e > new Date().valueOf()) {
        return {
          issued: token.s,
          expires: token.e,
          data: token.d
        };
      } else {
        return {
          error: {
            code: 'TOKEN_EXPIRED'
          }
        };
      }
    } else {
      return {
        error: {
          code: 'INVALID_TOKEN_SIGN'
        }
      };
    }
  } catch (e) {
    return {
      error: {
        code: 'INVALID_TOKEN'
      }
    };
  }
}

function matchTokenData(encryptedToken, validData) {
  var token = decryptToken(encryptedToken);
  return token && !token.error ? (token.data === validData ? true : false) : false;
}

function stateMatches(req, stateSessionKey, encryptedState, clearSession) {
  var plainState = req.session[stateSessionKey];
  if (clearSession) {
    delete req.session[stateSessionKey];
  }
  return plainState && matchTokenData(encryptedState, plainState) ? true : false;
}

function randomNumberRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function generateState(stateLength) {
  var randomStr = '';
  for (var i = 0; i < stateLength; i++) {
    randomStr += stateStr[randomNumberRange(0, stateStr.length-1)];
  }
  return randomStr;
}

function state(req, stateSessionKey, stateLength, maxAge) {
  var plainState = generateState(stateLength || 32);
  req.session[stateSessionKey] = plainState;
  return encryptToken(plainState, maxAge || 1*60*60*1000);
}

function use(req, res, next){

  var headerToken = req.headers && req.headers['x-fpme-token'],
      queryToken = req.query && req.query.fpmetoken,
      sessionToken = req.session && req.session.fpmetoken,
      encryptedToken = headerToken || queryToken || sessionToken || null,
      token = encryptedToken ? decryptToken(encryptedToken) : null;

  if (token && token.error) {
    if (req.session) {
      req.session.fpmetoken = null;
    }
    token = null;
  }

  req.token = token;

  next();
}

function useInApp(app) {

  app.response.decryptToken = decryptToken;
  app.request.decryptToken = decryptToken;

  app.response.encryptToken = encryptToken;
  app.request.encryptToken = encryptToken;

  return use;
}

function clear(req, res, next) {
  if (req.session) {
    req.session.fpmetoken = null;
  }
  next();
}

function required(req, res, next, doNotReturnStatus) {
  var token = req.token;
  if (token && token.data && token.data.uid) {
    User.findById(token.data.uid, function(err, user) {
      if (err) {
        log.error('Failed to load user profile from database', {
          uid: token.data.uid,
          error: err
        });
        if (doNotReturnStatus) {
          next(new Error('Not authorized'));
        } else {
          res.status(401).end();
        }
      } else
      if (user) {
        req.user = user;
        next();
      } else {
        if (doNotReturnStatus) {
          next(new Error('Not authorized'));
        } else {
          res.status(401).send({
            error: {
              code: 'USER_NOT_FOUND'
            }
          });
        }
      }
    });
  } else {
    if (doNotReturnStatus) {
      next(new Error('Not authorized'));
    } else {
      res.status(401).send(token || {error: {code: 'TOKEN_MISSING'}});
    }
  }
}

module.exports = {
  use:      use,
  useInApp: useInApp,
  required: required,
  clear:    clear,
  state:    state,
  matches:  stateMatches,
  decrypt:  decryptToken,
  encrypt:  encryptToken,
};
