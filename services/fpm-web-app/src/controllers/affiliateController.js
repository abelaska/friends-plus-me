/*jshint node: true */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { dbNotUpdated, AffiliateClick, Profile } = require('@fpm/db');
const _ = require('lodash');
const moment = require('moment');
const tools = require('../lib/tools');
const auth = require('../lib/auth');
const affiliate = require('../lib/affiliate');

module.exports = function(app) {

  app.get('/partner/*', function(req, res) {
    var affiliateId = req.params && req.params[0] || null;
    if (affiliateId) {
      affiliateId = affiliateId.split('/')[0];
      Profile.findOne({'affiliate.partnerId': affiliateId}, function(err, profile) {
        if (err || !profile) {
          log.error('Failed to find profile by affiliate code', {
            affiliateId: affiliateId,
            error: err });
        } else {
          var cookie = req.signedCookies.arefferer,
              today = moment.utc().format('YYYYMMDD'),
              $inc = _.object([
                ['clicks.'+today, 1]
              ]);

          if (!cookie) {
            res.cookie('arefferer', {
              campaignId: profile.affiliate.campaignId || config.get('affiliate:campaign'),
              mbsy: affiliateId
            }, {signed: true, maxAge: 180*24*60*60*1000});

            $inc['leads.'+today] = 1;
          }

          AffiliateClick.update({mbsy: affiliateId}, {$inc: $inc}, {upsert: true}, function(err, updated) {
            if (err || dbNotUpdated(updated)) {
              log.warn('Failed to register affiliate click', {
                profileId: profile._id.toString(),
                updated: updated && updated.result,
                error: err});
            } else {
              log.info('Registered affiliate click', {
                profileId: profile._id.toString(),
                mbsy: affiliateId});
            }
          });
        }

        res.redirect(config.get('http:landingpage:url'));
      });
    } else {
      res.redirect(config.get('http:landingpage:url'));
    }
  });

  app.get('/1/affiliate/:profileId/signup', tools.tokenRequired, function(req, res) {

    var user = req.user,
        profileId = req.params.profileId;

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {

      if (profile.affiliate && profile.affiliate.partnerId) {
        return res.json(profile.affiliate);
      }

      affiliate.signup(profile, function(err, profile) {
        if (err) {
          res.status(500).json({});
        } else {
          res.json(profile.affiliate);
        }
      });
    });
  });
};
