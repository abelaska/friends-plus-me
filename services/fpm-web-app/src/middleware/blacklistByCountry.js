/* jshint node: true */
'use strict';

const _ = require('lodash');
const config = require('@fpm/config');

const blacklistedCountries = (config.get('blacklist:countries') || []).filter(c => c).map(c => c.toLowerCase());

const signoutSession = (req, res, redirectUrl) => {
  if (req.session && _.size(req.session)) {
    _.chain(req.session).keys().without('cookie').each(function(key) {
      delete req.session[key];
    });
  }

  const finish = () => {
    res.header('Set-Cookie', config.get('session:key') + '=;');
    if (redirectUrl) {
      res.redirect(redirectUrl);
    }
  };

  if (req.session) {
    req.session.destroy(finish);
  } else {
    finish();
  }
};

module.exports = () => (req, res, next) => {
  const country = (req.headers['x-appengine-country'] || '').toLowerCase();
  const isNotBlacklisted = blacklistedCountries.indexOf(country) === -1;
  if (isNotBlacklisted) {
    return next();
  }
  signoutSession(req, res, 'https://friendsplus.me');
};