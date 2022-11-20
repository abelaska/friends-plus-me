/* jshint node: true */
'use strict';

const log = require('@fpm/logging').default;
const { DiscountCampaign } = require('@fpm/db');
const tools = require('../lib/tools');
const auth = require('../lib/auth');

module.exports = function(app) {

  app.post('/1/discount/calculate', tools.tokenRequired, function(req, res) {

    var plan = req.body.plan,
        interval = req.body.interval,
        code = req.body.code,
        profileId = req.body.profileId,
        user = req.user;

    if (!plan || !interval || !code || !profileId) {
      res.status(400).send({error: {message: 'Invalid request'}});
      return;
    }

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {

      DiscountCampaign.applyDummy(code, plan, interval, user, profile, function(err, data) {
        if (err) {
          log.warn('Failed to dummy apply discount', {
            plan: plan,
            interval: interval,
            profileId: profileId,
            code: code,
            error: err});
          var isOurError = err && err.error && err.error.code ? true : false;
          res.status(isOurError ? 400 : 500).send(isOurError ? err : null);
        } else {
          if (data) {
            data.campaignId = data.campaign._id.toString();
            data.discountId = data.discount._id.toString();
            delete data.campaign;
            delete data.discount;
          }
          res.json(data);
        }
      });
    });
  });
};
