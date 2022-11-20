/*jshint node: true */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const auth0 = require('../lib/auth0');
const mailgun = require('mailgun-js')({
  apiKey: config.get('email:transports:mailgun:auth:api_key'),
  domain: config.get('email:transports:mailgun:auth:domain')
});

module.exports = ({ router }) => {

  router.post('/1/mailgun/webhooks', upload.any(), (req, res) => {
    const { event, recipient, timestamp, token, signature } = req.body || {};

    log.info('Received mailgun webhook', { body: req.body && JSON.stringify(req.body) });

    if (!mailgun.validateWebhook(timestamp, token, signature)) {
      log.error('Received invalid mailgun webhook');
      return res.status(406).send({ error: { message: 'Invalid signature' } });
    }

    if (event !== 'bounced') {
      return res.send('ok');
    }

    auth0.manager.blockUserByEmail(recipient).then(list => {
      log.info('Blocked auth0 user because of bounced email', { recipient, accountsCount: list && list.length || 0 });
      return res.send('ok');
    }, error => {
      log.error('Failed to block auth0 user described in mailgun webhook', { recipient, message: error.toString(), error });
      return res.status(500).send('error');
    });
  });
};