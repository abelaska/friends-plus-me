/* jshint node: true */
/* jshint -W064, -W106 */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { Profile } = require('@fpm/db');
const _ = require('lodash');
const tools = require('../lib/tools');
const auth = require('../lib/auth');
const BraintreePG = require('../lib/paygateways/Braintree3');
const { braintreeClientByProfile, braintreeClientByMerchantId } = require('../lib/braintree');

module.exports = ({ router, customerLifecycle, premiumManager, postScheduler, accountManager, profileManager }) => {
  const oldMerchantId = config.get('braintree:merchant:old:merchantId');
  const newMerchantId = config.get('braintree:merchant:default:merchantId');
  const oldGateway = braintreeClientByMerchantId(oldMerchantId || newMerchantId);
  const newGateway = braintreeClientByMerchantId(newMerchantId);

  router.get('/1/profile/:profile/braintree/client/token', tools.tokenRequired, function(req, res) {
    var profileId = req.params.profile,
        // body = req.body,
        user = req.user;

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {

      var sub = profile.subscription && profile.subscription.gw === 'BRAINTREE' && profile.subscription || null,
          gwReq = {};

      if (sub && sub.customer && sub.customer.id) {
        gwReq.customerId = sub.customer.id;
      }

      braintreeClientByProfile(profile).clientToken.generate(gwReq, function (err, response) {
        let clientToken = response && response.clientToken;
        if (err || !clientToken) {
          log.error('Failed to generate Braintree client token', {
            userId: user._id.toString(),
            profileId: profile._id.toString(),
            gwReq: gwReq,
            rsp: response && JSON.stringify(response),
            error: err});
          if (response && !response.success && response.message === 'Customer specified by customer_id does not exist') {
            clientToken = null;
          } else {
            return res.status(500).json({
              error: {
                message: 'Failed to generate Braintree client token'
              }
            });
          }
        }
        res.json({ clientToken });
      });
    });
  });

  router.get('/1/profile/:profile/braintree/balance', tools.tokenRequired, function(req, res) {
    var profileId = req.params.profile,
        // body = req.body,
        user = req.user;

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {
      if (profile.subscription && profile.subscription.gw === 'BRAINTREE' && profile.subscription.id) {
        var pg = new BraintreePG({ customerLifecycle, profile, user, premiumManager, postScheduler, accountManager, profileManager });

        pg.balance(function(err, balance/*, sub*/) {
          if (err) {
            log.error('Failed to get Braintree subscription balance', {
              userId: user._id.toString(),
              profileId: profile._id.toString(),
              error: err});
            res.status(400).json({
              error: {
                message: 'Failed to determine subscription balance'
              }
            });
          } else {
            res.json({
              balance: balance
            });
          }
        });
      } else {
        res.json({
          balance: 0
        });
      }
    });
  });

  router.post('/1/profile/:profileId/braintree/pay', tools.tokenRequired, auth.rest.middleware.onlyProfileManager, function(req, res) {
    var profile = req.profile,
        body = req.body,
        user = req.user,
        fixedAmount = body.amount,
        paymentMethod = body.paymentMethod;

    var r = {
          ok: true
        },
        status = 200,
        pg = new BraintreePG({ customerLifecycle, profile, user, premiumManager, postScheduler, accountManager, profileManager });

    pg.addFunds({
      amount: fixedAmount,
      paymentMethod: paymentMethod,
      ipAddress: req.userIp
    }, function(err, tx) {
      if (err) {
        log.error('Braintree payment failed', {
          userId: user._id.toString(),
          error: err});

        var code = err && err.verification && err.verification.status ? err.verification.status.toUpperCase() : null;

        status = 400;
        r = { error : { code : code } };

        switch (code) {
        case 'GATEWAY_REJECTED':
          r.error.message = 'Payment rejected by gateway, reason: ' + err.verification.gatewayRejectionReason;
        break;
        case 'PROCESSOR_DECLINED':
          r.error.message = 'Payment rejected by processor, reason: ' + err.verification.processorResponseText + ' ('+err.verification.processorResponseCode+')';
        break;
        default:
          status = 500;
          r = { error: {
            code: 'UNKNOWN',
            message: (err && err.message ? err.message : '') || 'Failed to complete payment'
          } };
        break;
        }
        return res.status(status).json(r);
      }

      Profile.findOne({_id: profile._id}, 'accounts._id accounts.state', function(err, profile) {

        r.accounts = profile && _.map(profile.accounts, function(a) {
          return _.pick(a, '_id', 'state');
        }) || [];

        r.tx = tx && _.pick(tx, '_id', 'amount', 'vat', 'affiliate');

        res.json(r);
      });
    });
  });


  router.post('/1/profile/:profile/braintree/subscribe', tools.tokenRequired, function(req, res) {
    var profileId = req.params.profile,
        body = req.body,
        user = req.user,
        planName = body.plan,
        planInterval = body.interval,
        prepayYears = body.prepayYears || 0,
        paymentMethod = body.paymentMethod;

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {
      var r, pg = new BraintreePG({ customerLifecycle, profile, user, premiumManager, postScheduler, accountManager, profileManager });

      function callback(err) {
        if (err) {

          log.error('Braintree subscription have failed', {
            userId: user._id.toString(),
            error: err});

          var status = 400,
              code = err && err.verification && err.verification.status ? err.verification.status.toUpperCase() : null;

          r = { error : { code : code } };

          switch (code) {
          case 'GATEWAY_REJECTED':
            r.error.message = 'Payment rejected by gateway, reason: ' + err.verification.gatewayRejectionReason;
          break;
          case 'PROCESSOR_DECLINED':
            r.error.message = 'Payment rejected by processor, reason: ' + err.verification.processorResponseText + ' ('+err.verification.processorResponseCode+')';
          break;
          default:
            status = 500;
            r = { error: {
              code: 'UNKNOWN',
              message: (err && err.message ? err.message : '') || 'Failed to complete payment'
            } };
          break;
          }

          res.status(status).json(r);
        } else {
          r = {
            use: pg.profile.use,
            plan: pg.profile.plan,
            accounts: pg.profile.accounts,
            subscription: pg.profile.subscription
          };

          if (r.subscription) {
            r.subscription.id = r.subscription.id ? true : '';
            r.subscription.customer.id = r.subscription.customer.id ? true : '';
            r.subscription.card.token = r.subscription.card.token ? true : '';
          }

          res.json(r);
        }
      }

      if (planName === 'FREE') {
        pg.unsubscribe(callback);
      } else {
        pg.subscribe({
          prepayYears,
          planName: planName,
          planInterval: planInterval,
          couponCode: body.couponCode,
          addons: body.addons||{},
          paymentMethod: paymentMethod,
          ipAddress: req.userIp
        }, callback);
      }
    });
  });

  router.post('/1/profile/:profile/braintree/card', tools.tokenRequired, function(req, res) {
    var profileId = req.params.profile,
        body = req.body,
        user = req.user,
        paymentMethod = body.paymentMethod;

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {
      var r, pg = new BraintreePG({ customerLifecycle, profile, user, premiumManager, postScheduler, accountManager, profileManager });

      function callback(err) {
        if (err) {

          log.error('Braintree credit card update have failed', {
            userId: user._id.toString(),
            error: err});

          var status = 400,
              code = err && err.verification && err.verification.status ? err.verification.status.toUpperCase() : null;

          r = { error : { code : code } };

          switch (code) {
          case 'GATEWAY_REJECTED':
            r.error.message = 'Payment rejected by gateway, reason: ' + err.verification.gatewayRejectionReason;
          break;
          case 'PROCESSOR_DECLINED':
            r.error.message = 'Payment rejected by processor, reason: ' + err.verification.processorResponseText + ' ('+err.verification.processorResponseCode+')';
          break;
          default:
            status = 500;
            r = { error: {
              code: 'UNKNOWN',
              message: (err && err.message ? err.message : '') || 'Failed to complete payment'
            } };
          break;
          }

          res.status(status).json(r);
        } else {
          r = {
            subscription: pg.profile.subscription
          };

          r.subscription.id = r.subscription.id ? true : false;
          r.subscription.customer.id = r.subscription.customer.id ? true : false;
          r.subscription.card.token = r.subscription.card.token ? true : false;

          res.json(r);
        }
      }

      pg.updatePaymentMethod(paymentMethod, callback);
    });
  });

  router.post('/1/profile/:profileId/braintree/prepay', tools.tokenRequired, function(req, res) {
    const { user, body: { years } = {}, params: { profileId } } = req;

    if (!years || years < 1 || years > 2) {
      return res.status(400).json({ error: { message: 'Only 1 or 2 year prepay is available' } });
    }

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {
      const pg = new BraintreePG({ customerLifecycle, profile, user, premiumManager, postScheduler, accountManager, profileManager });
      pg.prepay(years, error => {
        if (error) {
          log.error('Braintree prepay have failed', { userId: user._id.toString(), error: error.stack || error });

          const code = error && error.verification && error.verification.status ? error.verification.status.toUpperCase() : null;
          let status = 400;
          let r = { error : { code } };

          switch (code) {
          case 'GATEWAY_REJECTED':
            r.error.message = 'Payment rejected by gateway, reason: ' + error.verification.gatewayRejectionReason;
            break;
          case 'PROCESSOR_DECLINED':
            r.error.message = 'Payment rejected by processor, reason: ' + error.verification.processorResponseText + ' ('+error.verification.processorResponseCode+')';
            break;
          default:
            status = 500;
            r = { error: {
              code: 'UNKNOWN',
              message: (error && error.message ? error.message : '') || 'Failed to complete prepay'
            } };
            break;
          }

          return res.status(status).json(r);
        }

        res.json({ success: true });
      });
    });
  });

  router.get('/1/braintree/webhooks', (req, res) => {
    res.send(oldGateway.webhookNotification.verify(req.query.bt_challenge));
  });

  router.get('/2/braintree/webhooks', (req, res) => {
    res.send(newGateway.webhookNotification.verify(req.query.bt_challenge));
  });

  const webhook = gateway => (req, res) => {
    const merchantId = gateway.config.merchantId;

    const bd = req.body && _.cloneDeep(req.body);
    if (bd && bd.bt_payload) {
      bd.bt_payload = '_NOT_EMPTY_';
    }

    log.info('Braintree webhook received', { merchantId, body: bd, params: req.params});

    const signature = req.body && req.body.bt_signature;
    const payload = req.body && req.body.bt_payload;

    if (!signature || !payload) {
      log.warn('Empty Braintree webhook received', {
        merchantId,
        signature: signature && '_NOT_EMPTY_' || '_EMPTY_',
        payload: payload && '_NOT_EMPTY_' || '_EMPTY_',
        body: bd});
      return res.status(200).end();
    }

    gateway.webhookNotification.parse(
      signature,
      payload,
      (err, webhookNotification) => {
        if (err) {
          log.error('Failed to verify Braintree webhook notification.', { merchantId, error: err, webhookNotification });
          return res.status(400).end();
        }
        (new BraintreePG({ customerLifecycle, premiumManager, postScheduler, accountManager, profileManager })).webhook(webhookNotification, (error) => {
          if (error) {
            const firstSuccessfullPayment = webhookNotification.kind === 'subscription_charged_successfully' && webhookNotification.subject && webhookNotification.subject.subscription && webhookNotification.subject.subscription.currentBillingCycle === 1,
                ignoreError =
                  // subscription canceled manually from the f+m app
                  error.code === 'PROFILE_NOT_FOUND' && (webhookNotification.kind === 'subscription_expired' || webhookNotification.kind === 'subscription_canceled' || firstSuccessfullPayment);
            if (ignoreError) {
              log.warn('Ignoring failed Braintree webhook', { merchantId, error, webhookNotification });
            } else {
              log.error('Failed to process Braintree webhook', { merchantId, error, webhookNotification });
            }
            return res.status(ignoreError ? 200 : 500).end();
          }
          res.status(200).end();
        });
      });
  };

  router.post('/1/braintree/webhooks', webhook(oldGateway));
  router.post('/2/braintree/webhooks', webhook(newGateway));
};
