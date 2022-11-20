/* jshint ignore: start */
'use strict';

const log = require('@fpm/logging').default;
const { Profile, Transaction } = require('@fpm/db');
const { Invoice } = require('@fpm/events');
const tools = require('../lib/tools');

module.exports = app => {

  app.get('/1/profile/invoice/:txId', tools.tokenRequired, (req, res) => {
    const txId = req.params.txId;
    const user = req.user;
    const userId = user._id.toString();

    if (req.query.fpmetoken) {
      return res.redirect('/1/profile/invoice/'+txId);
    }

    Transaction.findById(txId, (error, tx) => {
      if (error) {
        log.error('Failed to find transaction', { txId, error, message: error.toString() });
        return res.status(500).end();
      }
      if (!tx) {
        log.warn('Transaction not found', { txId, userId });
        return res.status(404).end();
      }

      const profileId = tx.pid.toString();

      Profile.findById(tx.pid, (error, profile) => {
        if (error) {
          log.error('Failed to find profile', { txId, profileId, error, message: error.toString() });
          return res.status(500).end();
        }
        if (!profile) {
          log.warn('Profile not found', { txId, profileId, userId });
          return res.status(404).end();
        }

        if (!user.canManageProfile(profile)) {
          log.warn('Only team manager or owner is allowed to see the invoice', { profileId, userId, txId});
          return res.status(403).end();
        }

        new Invoice({ profile, tx }).render().then(html => {
          log.info('Rendered invoice', { txId, profileId, userId});
          res.send(html);
        }, error => {
          log.error('Failed to render invoice', { txId, profileId, userId, error });
          res.status(500).end();
        });
      });
    });
  });
};
