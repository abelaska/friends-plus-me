/* jshint node: true */
'use strict';

const _ = require('lodash');
const csrf = require('csurf');

module.exports = function () {
  let csrfCheck = csrf(),
    ignoreMethods = ['GET', 'HEAD', 'OPTIONS'],
    ignorePaths = [
      '/1/facebook/webhook',
      '/1/braintree/webhooks',
      '/2/braintree/webhooks',
      '/1/paypal/ipn/callback',
      '/1/share/format/google',
      '/1/mailgun/webhooks',
      '/1/upload/photo/sign',
      '/1/extension/ping',
      '/1/extension/posts/publish',
      '/1/extension/posts/publish/result'
    ];

  function isNotRequired(req) {
    if (_.contains(ignoreMethods, req.method) || _.contains(ignorePaths, req.path)) {
      return true;
    }
    return req.path.indexOf('/1/') !== 0;
  }

  return [
    csrfCheck,
    function (err, req, res, next) {
      if (isNotRequired(req)) {
        return next();
      }
      if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).send('session has expired or tampered with');
      }
      return next(err);
    },
    function (req, res, next) {
      let isApi = req.path.indexOf('/1/') === 0,
        isShare = req.path === '/share' || req.path === '/share.html';

      if (!isApi) {
        if (!isShare) {
          res.set('x-frame-options', 'SAMEORIGIN');
        }
        res.set('x-content-type-options', 'nosniff');
        res.set('x-xss-protection', '1; mode=block');
      }
      return next();
    }
  ];
};
