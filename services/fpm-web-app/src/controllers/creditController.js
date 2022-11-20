/* jshint node: true */
'use strict';

const log = require('@fpm/logging').default;
const { ProfileCosts, Premium } = require('@fpm/db');
const async = require('async');
const _ = require('lodash');
const tools = require('../lib/tools');
const auth = require('../lib/auth');

module.exports = function(router, premiumManager/*, accountManager*/) {

  function creditInfo(profile, callback) {
    async.parallel({
      costs: async.apply(premiumManager.costs.bind(premiumManager), profile),
      balance: async.apply(Premium.balance.bind(Premium), profile)
    }, function(err, results) {
      if (err || !results) {
        log.error('Failed to fetch profile credit info', {
          profileId: profile._id.toString(),
          error: err
        });
        return callback(err);
      }

      var costs = _.pick(results.costs, 'metrics', 'daily', 'monthly', 'minimumBalance');
      var balance = results.balance[0];
      var credits = results.balance[1];

      var exposeCredits = [];
      credits.forEach(function(c) {
        exposeCredits.push(_.cloneDeep(_.pick(c, 'createdAt', 'credit', 'amount')));
      });

      premiumManager.remainingDays(costs, balance, credits, function(err, remaining) {
        if (err || !remaining) {
          log.error('Failed to calculate remaing days', {
            profileId: profile._id.toString(),
            error: err
          });
          return callback(err);
        }

        callback(null, {
          costs: costs,
          balance: balance,
          credits: exposeCredits,
          remainingDays: remaining.days,
          remainingDaysHuman: remaining.human
        });
      });
    });
  }

  router.post('/1/profile/:profileId/credit/promo', tools.tokenRequired, auth.rest.middleware.onlyProfileManager, function(req, res) {

    // var user = req.user;
    var profile = req.profile;
    var promoCode = req.body.code;

    premiumManager.creditPromoCode(promoCode, profile, function(err, premium/*, premiumCode*/) {
      if (err) {
        log.error('Failed to apply promo code', {
          promoCode: promoCode,
          profileId: profile._id.toString(),
          error: err
        });
        return res.status(err.error && err.error.code ? 400 : 500).json({error: {message: 'Failed to apply promo code', error: err && err.error}});
      }
      creditInfo(profile, function(err, data) {
        if (err || !data) {
          return res.status(500).json({error: {message: 'Failed to fetch profile credit info'}});
        }
        res.json({
          premium: {
            amount: premium.amount,
            expiresAt: premium.credit.expiresAt
          },
          info: data
        });
      });
    });
  });

  router.get('/1/profile/:profileId/credit/info', tools.tokenRequired, auth.rest.middleware.onlyProfileManager, function(req, res) {
    // var user = req.user;
    var profile = req.profile;

    creditInfo(profile, function(err, data) {
      if (err || !data) {
        return res.status(500).json({error: {message: 'Failed to fetch profile credit info'}});
      }
      res.json(data);
    });
  });

  router.get('/1/profile/:profileId/credit/costs', tools.tokenRequired, auth.rest.middleware.onlyProfileManager, function(req, res) {
    // var user = req.user;
    var profile = req.profile;

    ProfileCosts.find({
      pid: profile._id
    }, null, {sort: {day: -1}}, function(err, costs) {
      if (err) {
        log.error('Failed to fetch profile costs', {
          profileId: profile._id.toString(),
          error: err
        });
        return res.status(500).json({error: {message: 'Failed to fetch profile costs'}});
      }
      res.json({
        costs: costs
      });
    });
  });

  router.get('/1/profile/:profileId/credit/debits', tools.tokenRequired, auth.rest.middleware.onlyProfileManager, function(req, res) {
    // var user = req.user;
    var profile = req.profile;

    Premium.find({
      pid: profile._id,
      amount: {$lt: 0}
    }, null, {sort: {createdAt: 1}}, function(err, debits) {
      if (err) {
        log.error('Failed to fetch profile debits', {
          profileId: profile._id.toString(),
          error: err
        });
        return res.status(500).json({error: {message: 'Failed to fetch profile debits'}});
      }
      res.json({
        debits: debits
      });
    });
  });

  router.get('/1/profile/:profileId/credit/balance', tools.tokenRequired, auth.rest.middleware.onlyProfileManager, function(req, res) {
    // var user = req.user;
    var profile = req.profile;

    Premium.balance(profile, function(err, balance/*, credits*/) {
      if (err) {
        log.error('Failed to fetch profile credit balance', {
          profileId: profile._id.toString(),
          error: err
        });
        return res.status(500).json({error: {message: 'Failed to fetch profile credit balance'}});
      }
      res.json({
        balance: balance
      });
    });
  });
};
