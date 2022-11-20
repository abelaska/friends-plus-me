/* jshint node: true */
'use strict';

const config = require('@fpm/config');
const rp = require('request-promise');

function validate(token) {
  return rp({
    method: 'POST',
    url: 'https://www.google.com/recaptcha/api/siteverify',
    form: {
      secret: config.get('recaptcha:secret'),
      response: token
    },
    json: true
  });
}

module.exports = {
  validate: validate
};
