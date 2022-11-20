/* jshint node: true */
'use strict';

const log = require('@fpm/logging').default;
const { User } = require('@fpm/db');
const S = require('string');

var tokenRequired = exports.tokenRequired = function tokenRequired(req, res, next) {

  var token = req.token;

  if (token && token.data && token.data.uid) {

    User.findById(token.data.uid, function(err, user) {

      if (err) {

        log.error('Failed to load user profile from database', {
          uid: token.data.uid,
          error: err
        });
        res.status(500).json({error: {code: 'SERVER_ERROR'}}).end();

      } else
      if (user) {
        req.user = user;
        next();
      } else {
        res.status(401).json({error: {code: 'USER_NOT_FOUND'}}).end();
      }
    });

  } else {
    res.status(401).json(token && token.error ? token : {error: {code: 'TOKEN_NOT_SET'}}).end();
  }
};

exports.adminRequired = function adminRequired(req, res, next) {
  tokenRequired(req, res, function() {
    if (req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({}).end();
    }
  });
};

exports.adminRequiredWithRedirect = function adminRequiredWithRedirect(req, res, next) {
  tokenRequired(req, res, function() {
    if (req.user.role === 'admin') {
      next();
    } else {
      res.redirect('/');
    }
  });
};

exports.tokenOptional = function tokenOptional(req, res, next) {

  var token = req.token;

  if (token && token.data && token.data.uid) {
    User.findById(token.data.uid, function(err, user) {
      if (err) {
        log.error('Failed to load user profile from database', {
          uid: token.data.uid,
          error: err
        });
      }
      req.user = user;
      next();
    });
  } else {
    next();
  }
};

exports.prepareText = function prepareText(text) {
  if (text === undefined) {
    return undefined;
  }
  if (text === null) {
    return null;
  }
  /*jshint -W044*/
  text = S(text).decodeHtmlEntities().replaceAll(/<\s*br[^>]*\/?\s*>/,'\n').stripTags().s.replace(/[ \t]+/g, ' ').replace(/^[ \t]+|[ \t]+$/g, '')
  .replace(/&([#][x]*[0-9]+);/g, function(m, n) {
    var code;
    if (n.substr(0, 1) === '#') {
      if (n.substr(1, 1) === 'x') {
        code = parseInt(n.substr(2), 16);
      } else {
        code = parseInt(n.substr(1), 10);
      }
    }
    return (code === undefined || isNaN(code)) ?
      '&' + n + ';' : String.fromCharCode(code);
  });
  text = S(text).trim().s;
  return text;
};
