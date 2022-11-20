const Promise = require('bluebird');
const request = require('request');
const log = require('@fpm/logging').default;
const { send } = require('micro');
const { method } = require('../../../../utils/http');

module.exports = [
  method('POST'),
  async (req, res) => {
    const { statusCode } = await new Promise(resolve =>
      req.pipe(
        request('https://app.friendsplus.me/1/paypal/ipn/callback', (error, response, body) => {
          if (error) {
            log.error('Failed to reverse proxy paypal ipn callback', { stack: error.stack });
            return resolve({ statusCode: 500 });
          }
          return resolve({ body, statusCode: response.statusCode });
        })
      )
    );
    res.sent = true;
    send(res, statusCode);
  }
];
