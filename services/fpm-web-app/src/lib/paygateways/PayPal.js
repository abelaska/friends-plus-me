/* jshint node: true */
/* jshint -W106 */
'use strict';

const log = require('@fpm/logging').default;
const { Profile, Transaction, DiscountCampaign } = require('@fpm/db');
const util = require('util');
const moment = require('moment');
const PaymentGateway = require('../PaymentGateway');

var PayPal = module.exports = function PayPal({ customerLifecycle, profile, user, owner, profileManager }) {
  PaymentGateway.call(this, { customerLifecycle, profile, user, owner, profileManager });
  this.ipnData = null;
  this.couponCode = null;
  return this;
};
util.inherits(PayPal, PaymentGateway);

PayPal.prototype.webhookUnsubscribe = function(profile, ipnData, callback) {
  if (profile.subscription && profile.subscription.id === ipnData.subscr_id) {
    this.unsubscribe(callback);
  } else {
    callback({
      code: 'SUBSCRIPTION_NOT_FOUND',
      message: 'Profile '+profile._id.toString()+' PayPal subscription '+ipnData.subscr_id+' not found',
      ipnData: ipnData});
  }
};

PayPal.prototype.webhookSubscribe = function(profile, custom, ipnData, callback) {

  var txId = ipnData.txn_id,
      planName = custom.p || custom.d,
      planInterval = custom.i;

  this.couponCode = custom.code||null;

  if (profile.isSubscribed) {
    planName = planName || profile.subscription.plan;
    planInterval = planInterval || profile.subscription.interval;
  }

  Transaction.count({id: txId}, function(err, txExists) {
    if (err) {
      callback(err);
    } else
    if (txExists) {
      callback({
        code: 'DUPLICIT_PAYPAL_PAYMENT',
        message: 'Reveiced duplicit PayPal payment '+txId+' for profile '+profile._id.toString(),
        txExists: txExists,
        ipnData: ipnData,
        error: err});
    } else {
      this.subscribe(planName, planInterval, ipnData, function(err, isRecurring) {
        if (err) {
          callback({
            code: 'PAYPAL_SUBSCRIBE_IPN_FAIL',
            message: isRecurring ?
              'Failed to process recurring PayPal payment for profile '+profile._id.toString()+' and '+planName+' plan.' :
              'Failed to subscribe profile '+profile._id.toString()+' to '+planName+' plan with PayPal.',
            ipnData: ipnData,
            error: err});
        } else {

          log.info(isRecurring ?
            'Successfull recurring PayPal payment for profile '+profile._id.toString()+' and '+planName+' plan in '+planInterval+' interval' :
            'Successfull subscribe of profile '+profile._id.toString()+' to '+planName+' plan in '+planInterval+' interval with PayPal');

          callback();
        }
      }.bind(this));
    }
  }.bind(this));
};

PayPal.prototype.webhook = function(ipnData, callback) {

  this.ipnData = ipnData;

  log.info('Processing PayPal IPN webhook', {
    ipnData: ipnData});

  var custom = this._parseCustomIPN(ipnData.custom);

  Profile.findById(custom.u, function(err, profile) {
    if (err || !profile) {
      callback({
        code: 'PROFILE_NOT_FOUND',
        message: 'Failed to find profile '+custom.u+', cannot perform PayPal webhook.',
        ipnData: ipnData,
        error: err});
    } else {

      this.switchProfile(profile);

      switch (ipnData.txn_type) {
        case 'recurring_payment_outstanding_payment_failed':
        case 'recurring_payment_suspended_due_to_max_failed_payment':
        case 'recurring_payment_skipped':
        case 'recurring_payment_failed':
        case 'recurring_payment_suspended':
        case 'subscr_failed':
        this._onChargeFail(callback);
        break;
      case 'recurring_payment_outstanding_payment':
      case 'subscr_payment':
        if (ipnData.payment_status === 'Completed' || ipnData.payment_status === 'Pending') {
          log.info('Received subscription payment from PayPal.', ipnData, custom);
          this.webhookSubscribe(profile, custom, ipnData, callback);
        } else {
          log.warn('Ignoring received PayPal payment IPN with status '+ipnData.payment_status, ipnData);
          callback();
        }
        break;
      case 'subscr_cancel':
        log.info('Received subscription cancel from PayPal.', ipnData);
        this.webhookUnsubscribe(profile, ipnData, callback);
        break;
      case 'subscr_modify':
        log.info('Received subscription modification from PayPal.', ipnData);
        this.webhookSubscribe(profile, custom, ipnData, callback);
        break;
      // ignore those
      case 'subscr_signup':
        log.debug('Received subscription signup from PayPal.', ipnData);
        callback();
        break;
      case 'subscr_eot':
        log.warn('Received confirmation of PayPal subscription cancelation.', ipnData);
        callback();
        break;
      default:
        callback({
          code: 'UNKNOWN_IPN_TXN_TYPE',
          message: 'Received unknown PayPal IPN notification type '+ipnData.txn_type+' for subscription '+ipnData.subscr_id});
      }
    }
  }.bind(this));
};

// const payPalDateTime = s => {
//   const parts = s.split(' ');
//   const tz = parts.pop();
//   const dt = parts.join(' ');
//   momentTz.
// }

// planName should never be FREE
PayPal.prototype.subscribe = function(planName, planInterval, ipnData, callback) {

  log.info('PAYPAL subscribe', {
    planName: planName,
    planInterval: planInterval,
    couponCode: this.couponCode});

  this._planChange(planName, planInterval, function(err, change) {
    if (err || !change) {
      callback(err);
    } else {
      var coupon,
          now = moment.utc(),
          isSubscrModify = ipnData.txn_type === 'subscr_modify',
          txTm = moment(new Date(ipnData.payment_date || ipnData.subscr_date)), // 04:41:59 Mar 03, 2018 PST
          lastPay = txTm.toDate(),
          nextPay = txTm.clone().add(1, (planInterval === 'MONTH' ? 'months' : 'years')).toDate(),
          isRecurring = ipnData.recurring || (change.newPlanName === change.oldPlanName && change.newPlanPayInterval === change.oldPlanPayInterval),
          fee = Math.ceil(parseFloat(ipnData.payment_fee || 0)*100),
          payAmount = Math.ceil(parseFloat(ipnData.payment_gross || 0) * 100),
          subAmount = Math.ceil(parseFloat(ipnData.payment_gross || ipnData.amount3) * 100),
          description = isRecurring && !isSubscrModify ?
                          (planInterval === 'MONTH' ? 'Monthly' : 'Annual')+' recurring PayPal payment ('+ipnData.payer_email+', '+ipnData.subscr_id+(ipnData.txn_id ? ', '+ipnData.txn_id : '')+') for '+planName+' plan' :
                          change.description;

      change.isRecurring = isRecurring;

      if (this.profile.subscription &&
          this.profile.subscription.coupon &&
          this.profile.subscription.coupon._id &&
          this.profile.subscription.coupon.recurring &&
          this.profile.subscription.coupon.planInterval === planName+':'+planInterval) {
        coupon = this.profile.subscription.coupon;
      }

      var modifyProfileCreateTxAndFinish = function() {
        this.profile.plan.validUntil = nextPay;
        this.profile.subscription = {
          id: ipnData.subscr_id,
          gw: 'PAYPAL',
          amount: subAmount,
          plan: planName,
          interval: planInterval,
          createdAt: now.toDate(),
          lastPay: lastPay,
          nextPay: nextPay,
          customer: {
            id: ipnData.payer_email
          },
          subject: this.profile.subject.toObject()
        };

        if (coupon) {
          this.profile.subscription.coupon = coupon.toObject ? coupon.toObject() : coupon;
        }

        if (ipnData.txn_id) {

          this.tx = new Transaction({
            tm: now.toDate(),
            type: 'CHARGE',
            updatedAt: now.toDate(),
            payedAt: txTm.toDate(),
            id: ipnData.txn_id,
            pid: this.profile._id,
            desc: description,
            amount: payAmount,
            vatInc: 0,
            subscr: this.profile.subscription.toObject(),
            subject: this.profile.subject.toObject(),
            fee: fee,
            recurring: isRecurring
          });
          this.tx.subscr.forcedUnsubscr = undefined;

          if (coupon) {
            this.tx.coupon = {
              id: coupon._id,
              discount: coupon.appliedDiscount
            };
          }

          change.payedAmount = payAmount;
        }

        this._finish(change, callback);
      }.bind(this);

      if (coupon) {
        DiscountCampaign.applyCoupon(coupon, function(err) {
          if (err) {
            log.error('Failed to apply recurring discount for PayPal payment', {
              couponId: coupon._id.toString()});
          }
          modifyProfileCreateTxAndFinish();
        }.bind(this));
      } else
      if (this.couponCode) {
        this._fetchOwner(function() {
          DiscountCampaign.apply(this.couponCode, planName, planInterval, this.user || this.owner, this.profile, function(err, appliedCoupon/*, campaign, discount*/) {
            coupon = appliedCoupon;
            if (err) {
              log.warn('Failed to apply discount coupon for PayPal payment', {
                profileId: this.profile._id.toString(),
                subscrId: ipnData.subscr_id});
            }
            modifyProfileCreateTxAndFinish();
          }.bind(this));
        }.bind(this));
      } else {
        modifyProfileCreateTxAndFinish();
      }
    }
  }.bind(this));
};

PayPal.prototype._parseCustomIPN = function(customStr) {
  var pp, custom = {};
  (customStr || '').split(';').forEach(function(p) {
    pp = p.split('=');
    custom[pp[0]] = pp[1];
  });
  return custom;
};
