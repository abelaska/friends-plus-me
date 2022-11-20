/* jshint node: true */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { Types } = require('@fpm/constants');
const { Profile, FetchAccount, Transaction, Audit, PricingPlan } = require('@fpm/db');
const { Invoice } = require('@fpm/events');
const util = require('util');
const async = require('async');
const moment = require('moment');
const _ = require('underscore');
const PaymentGateway = require('../PaymentGateway');
const { braintreeClientByProfile, braintreeConfigByMerchantId } = require('../braintree');

const prepayYearsDiscountedMonths = {
  1: 2,
  2: 6
};

var Braintree3 = module.exports = function Braintree3({ customerLifecycle, profile, user, owner, premiumManager, postScheduler, accountManager, profileManager }) {
  PaymentGateway.call(this, { customerLifecycle, profile, user, owner, premiumManager, postScheduler, accountManager, profileManager });
  this.ipAddress = null;
  this.paymentMethod = null;
  this.webhookNotification = null;
  this.premiumManager = premiumManager;
  this.accountManager = accountManager;
  this.postScheduler = postScheduler;
  return this;
};
util.inherits(Braintree3, PaymentGateway);

Braintree3.prototype.getClient = function() {
  if (!this.braintreeClient) {
    const defMerchantId = config.get('braintree:merchant:default:merchantId');
    const subMerchant = this.profile && this.profile.subscription && this.profile.subscription.merchant;
    const merchant = braintreeConfigByMerchantId((subMerchant && subMerchant.merchantId) || defMerchantId) ||
                     braintreeConfigByMerchantId(defMerchantId);

    this.merchantId =  merchant.merchantId;
    this.merchantAccountDefault = merchant.account.default;
    this.merchantAccountId =  (subMerchant && subMerchant.accountId) || this.merchantAccountDefault;

    this.braintreeClient = braintreeClientByProfile(this.profile);
  }
  return this.braintreeClient;
};

//  paymentMethod: {
//    details: {
//      last2:    string, // type(creditcard): last 2 card numbers
//      cardType: string, // type(creditcard): 'American Express','Carte Blanche','China UnionPay','Diners Club','Discover','JCB','Laser','Maestro','MasterCard','Solo','Switch','Visa','Unknown'
//      email: string, // type(paypal): paypal account email address in case type is paypal
//    },
//    nonce: string,
//    type: string, // creditcard, paypal
//  }
Braintree3.prototype.updatePaymentMethod = function(paymentMethod, callback) {
  var sub = this.profile.subscription,
      pm = paymentMethod,
      pmd = pm && pm.details,
      isCard = pm.type === 'creditcard',
      isPayPal = pm.type === 'paypal',
      paymentMethodName = isCard ? 'credit card' : isPayPal ? 'paypal' : pm.type,
      newMerchantAccountId = this.merchantAccountDefault;

  this.getClient().paymentMethod.create({
    customerId: sub.customer.id,
    paymentMethodNonce: pm.nonce,
    options: {
      verifyCard: true,
      makeDefault: true
    }
  }, function(err, result) {

    log.debug('Braintree '+paymentMethodName+' payment method update callback', result?JSON.stringify(result,null,2):result, err?JSON.stringify(err,null,2):err);

    if (result && result.success) {

      this.profile.subscription.method = pm.type;
      this.profile.subscription.merchant = this.profile.subscription.merchant || {};
      this.profile.subscription.merchant.merchantId = this.merchantId;
      this.profile.subscription.merchant.accountId = newMerchantAccountId;

      if (isPayPal && result.paypalAccount) {
        this.profile.subscription.paypal = {
          token: result.paypalAccount.token,
          email: result.paypalAccount.email
        };
      } else
      if (isCard && result.creditCard) {
        this.profile.subscription.card = {
          country: result.creditCard.countryOfIssuance,
          token: result.creditCard.token,
          last4: result.creditCard.last4,
          cardType: result.creditCard.cardType,
          expMonth: parseInt(result.creditCard.expirationMonth),
          expYear:  parseInt(result.creditCard.expirationYear)
        };
      }

      this._fetchOwner(function() {
        this.customerLifecycle.updateSubscription(this.owner, this.profile);
      }.bind(this));

      log.info('Successfully updated Braintree payment method to '+paymentMethodName+' for profile '+this.profileId, {
        merchantId: this.merchantId,
        customerId: this.profile.subscription.customer.id});

      this.getClient().subscription.update(sub.id, {
        paymentMethodToken: result.paymentMethod.token,
        merchantAccountId: newMerchantAccountId
      }, function (err/*, result*/) {

        if (err) {
          log.error('Failed to update Braintree subscription payment method to '+paymentMethodName+' for profile '+this.profileId, {
            customerId: this.profile.subscription.customer.id,
            error: err});
        }

        this._saveProfile(callback);
      }.bind(this));

    } else {

      log.error('Failed to update Braintree '+paymentMethodName+' for profile '+this.profileId, {
        error: err,
        result: result});

      callback(err || result);
    }
  }.bind(this));
};

Braintree3.prototype._saveProfile = function(callback) {
  this.profile.save(function(err/*, data*/) {
    if(err) {

      log.error('Failed to update profile '+this.profileId+' account for Braintree subscription', {
        error: err});

      callback(err, null);

    } else {
      callback(null, this.profile);
    }
  }.bind(this));
};

Braintree3.prototype.webhook = function(webhookNotification, callback) {

  const kind = webhookNotification.kind;
  const whSub = webhookNotification.subscription;
  const subId = whSub && whSub.id;
  const tx = (whSub && whSub.transactions && whSub.transactions.length && whSub.transactions[0]) || null;
  const txId = (tx && tx.id) || null;
  const planId = whSub && whSub.planId;
  const currentBillingCycle = whSub && whSub.currentBillingCycle;

  log.info('Processing Braintree webhook', { kind, subId, txId, planId, currentBillingCycle, webhookNotification: JSON.stringify(webhookNotification) });

  if (['subscription_expired', 'subscription_canceled', 'subscription_charged_successfully', 'subscription_charged_unsuccessfully'].indexOf(kind) === -1) {
    log.warn(`Skipping Braintree webhook of type ${kind}`);
    return callback();
  }

  Profile.findOne({'subscription.id': subId}, function(err, profile) {
    if (err || !profile) {
      callback({
        code: 'PROFILE_NOT_FOUND',
        message: 'Failed to find profile with Braintree subscription id '+subId+', cannot process Braintree webhook.',
        braintreeSubId: subId,
        error: err});
    } else {

      this.switchProfile(profile);

      switch (webhookNotification.kind) {
      case 'subscription_charged_unsuccessfully':
        this._onChargeFail(callback);
        break;
      case 'subscription_expired':
      case 'subscription_canceled':
        this.unsubscribe(callback);
        break;
      case 'subscription_charged_successfully':

        webhookNotification.success = true;

        Transaction.count({id: txId}, function(err, txExists) {
          if (err) {
            return callback(err);
          }
          if (txExists) {
            log.info('Skiping already processed Braintree payment', {
              merchantId: this.merchantId,
              profileId: profile._id.toString(),
              subId: subId,
              txId: txId,
              planId: planId});
            return callback();
          }
          this.subscribe({ webhookNotification }, function(err) {
            if (!err) {
              this.accountManager.updateBraintreeSubscription(this.profile);
            }
            if (callback) { callback(err); }
          }.bind(this));
        }.bind(this));
        break;
      }
    }
  }.bind(this));
};

Braintree3.prototype.unsubscribe = function(callback) {
  this._fetchOwner(function(err) {
    if (err) {
      callback(err);
    } else {
      this._cancelSubscription(function(err) {
        if (err && err.type !== 'notFoundError') {
          callback({
            code: 'BRAINTREE_SUBSCRIPTION_CANCELATION_FAILED',
            message: 'Failed to cancel Braintree subscription '+this.profile.subscription.id,
            error: err});
        } else {
          this._unsubscribe(callback);
        }
      }.bind(this));
    }
  }.bind(this));
};

Braintree3.prototype._cancelSubscription = function(callback) {

  this.getClient().subscription.cancel(this.profile.subscription.id, function (err, result) {

    try {
      log.debug('Braintree cancel customer subscription callback', result?JSON.stringify(result,null,2):result, err?JSON.stringify(err,null,2):err);
    } catch(ignore) { /**/ }

    var unsubscribed =
          (result && (
            result.success ||
            (!result.success && result.message === 'Subscription has already been canceled.'))) ||
          (err && err.type === 'notFoundError');

    if (unsubscribed) {

      log.info('Successfully canceled Braintree subscription for profile '+this.profileId, {
        merchantId: this.merchantId,
        customerId: this.profile.subscription.customer.id,
        subId: this.profile.subscription.id,
        plan: this.profile.subscription.plan,
        interval: this.profile.subscription.interval});

      callback();
    } else {

      log.error('Failed to cancel Braintree subscription for profile '+this.profileId, {
        customerId: this.profile.subscription.customer.id,
        subId: this.profile.subscription.id,
        plan: this.profile.subscription.plan,
        interval: this.profile.subscription.interval,
        error: err,
        result: result});

      callback(err || result);
    }
  }.bind(this));
};

//data: {
//  amount: number     // fixed price = price * 100
//  ipAddress: string, // user ip address
//  paymentMethod: {
//    details: {
//      last2:    string, // type(creditcard): last 2 card numbers
//      cardType: string, // type(creditcard): 'American Express','Carte Blanche','China UnionPay','Diners Club','Discover','JCB','Laser','Maestro','MasterCard','Solo','Switch','Visa','Unknown'
//      email: string, // type(paypal): paypal account email address in case type is paypal
//    },
//    nonce: string,
//    type: string, // creditcard, paypal
//  }
//}
Braintree3.prototype.addFunds = function(data, callback) {
  var pm = data.paymentMethod,
      pmd = pm && pm.details;

  this.ipAddress = data.ipAddress;
  this.paymentMethod = pm;
  this.merchantAccountId = this.merchantAccountDefault;

  async.series([
    this._fetchOwner.bind(this),
    this._registerOrUpdateCustomer.bind(this),
    async.apply(this._addFunds.bind(this), data)
  ], function(err) {
    if (err) {
      return callback(err);
    }
    callback(null, this.tx);
  }.bind(this));
};

// create payment
// data: {
//  amount: number     // fixed price = price * 100
//  ipAddress: string, // user ip address
//  paymentMethod: {
//    details: {
//      last2:    string, // type(creditcard): last 2 card numbers
//      cardType: string, // type(creditcard): 'American Express','Carte Blanche','China UnionPay','Diners Club','Discover','JCB','Laser','Maestro','MasterCard','Solo','Switch','Visa','Unknown'
//      email: string, // type(paypal): paypal account email address in case type is paypal
//    },
//    nonce: string,
//    type: string, // creditcard, paypal
//  }
//}
Braintree3.prototype._addFunds = function(data, callback) {
  var sub = this.profile.subscription,
      card = sub.card,
      paypal = sub.paypal,
      isCard = data.paymentMethod.type === 'creditcard',
      isPayPal = data.paymentMethod.type === 'paypal',
      token = (isCard && card && card.token) || (isPayPal && paypal && paypal.token) || (card && card.token) || null,
      minAmount = config.get('premium:funds:amounts')[0]*100 || 0,
      reqAmount = Math.max(data.amount || 0, minAmount),
      taxAmount = 0;
      payAmount = reqAmount+taxAmount,
      req = {
        paymentMethodToken: token,
        merchantAccountId: this.merchantAccountId,
        amount: (payAmount/100).toString(),
        taxAmount: (taxAmount/100).toString(),
        options: {
          submitForSettlement: true
        }
      };

  this.getClient().transaction.sale(req, function(err, result) {

    log.debug('Braintree customer payment callback', result?JSON.stringify(result,null,2):result, err?JSON.stringify(err,null,2):err);

    if (!result || !result.success) {
      log.error('Failed to create Braintree payment for profile '+this.profileId, {
        profileId: this.profileId,
        customerId: this.profile.subscription.customer.id,
        amount: data.amount,
        error: err,
        result: result
      });

      return callback(err || result);
    }

    var now = moment.utc(),
        tx = result.transaction,
        txId = tx ? tx.id : null,
        txTm = tx ? moment.utc(tx.createdAt) : null,
        fee = tx && tx.paypalAccount && tx.paypalAccount.transactionFeeAmount ? Math.floor(tx.paypalAccount.transactionFeeAmount*100) : 0,
        txAmount = tx ? Math.floor(tx.amount*100) : null;

    var newSubscription = {
          gw: 'BRAINTREE',
          plan: 'PAYWYU',
          method: (this.paymentMethod && this.paymentMethod.type) || this.profile.subscription.method,
          createdAt: now.toDate(),
          lastPay: txTm.toDate(),
          merchant: this.profile.subscription.merchant && this.profile.subscription.merchant.toObject() || { accountId: this.merchantAccountId, merchantId: this.merchantId },
          card: this.profile.subscription.card && this.profile.subscription.card.toObject() || {},
          paypal: this.profile.subscription.paypal && this.profile.subscription.paypal.toObject() || {},
          customer: this.profile.subscription.customer.toObject(),
          ipAddress: this.profile.subscription.ipAddress
        };

    if (this.profile.plan.name !== newSubscription.plan) {
      this.profile.plan.validFrom = now.toDate();
    }
    this.profile.plan.name = newSubscription.plan;
    this.profile.plan.interval = null;
    this.profile.plan.validUntil = null;
    this.profile.subscription = newSubscription;

    log.info('Successfully created Braintree payment for profile '+this.profileId, {
      profileId: this.profileId,
      merchantId: this.merchantId,
      customerId: this.profile.subscription.customer.id,
      plan: this.profile.plan.name,
      amount: tx.amount
    });

    async.parallel([
      function(cb) {
        if (!txAmount) {
          return cb();
        }
        Transaction.findOne({id: txId}, function(err, foundTx) {
          if (err || foundTx) {
            return cb(err);
          }

          var desc = '???',
              sub = this.profile.subscription;

          if (!sub.method) {
            desc = (sub.paypal && sub.paypal.email ? 'Paypal' : sub.card && sub.card.last4 ? 'Credit Card' : '???')+' payment';
          }
          if (!sub.method || sub.method === 'creditcard') {
            desc = 'Credit Card payment (x'+sub.card.last4+')';
          } else
          if (sub.method === 'paypal') {
            desc = 'PayPal payment ('+sub.paypal.email+', '+sub.customer.id+')';
          }

          desc = 'Add Funds - ' + desc;

          this.tx = new Transaction({
            tm: now.toDate(),
            type: 'ADD_FUNDS',
            updatedAt: now.toDate(),
            id: txId,
            paypalId: (tx.paypal && tx.paypal.authorizationId) || (tx.paypalAccount && tx.paypalAccount.authorizationId),
            fee: fee,
            payedAt: txTm.toDate(),
            pid: this.profile._id,
            desc: desc,
            amount: txAmount,
            vatInc: 0,
            subscr: this.profile.subscription.toObject(),
            subject: this.profile.subject.toObject(),
            recurring: false
          });
          this.tx.subscr.forcedUnsubscr = undefined;
          this.tx.save(function(err) {
            if (err) {
              return cb(err);
            }
            this.premiumManager.creditTransaction(this.tx, this.profile, cb);
          }.bind(this));
        }.bind(this));
      }.bind(this)
    ], function(err/*, results*/) {
      if (err) {
        return callback(err);
      }

      PricingPlan.findOne({id: this.profile.plan.name}, function(err, plan) {
        if (err || !plan) {
          return callback(err || {error:{message: 'Plan '+this.profile.plan.name+' not found'}});
        }

        this.profile.use = _.defaults(plan.use || {}, config.get('users:use'));

        this.profile.save(function(err/*, data*/) {
          if (err) {

            log.error('Failed to update profile '+this.profileId+' account after successfull Braintree add funds payment', {
              profileId: this.profileId,
              planName: plan.name,
              error: err});

            callback(err);

          } else {

            if (this.tx) {
              (new Invoice({ profile: this.profile, tx: this.tx })).send().then(() => {}, () => {});
            }

            FetchAccount.updatePlan(this.profile, callback);
          }
        }.bind(this));
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

//data: {
//  planName: string     // plan name
//  planInterval: string // MONTH || YEAR
//  addons: {'addonid': {cout of addons},...}
//  ipAddress: string, // user ip address
//  isAnnualPrepay: boolean,
//  webhookResult: {...}
//  paymentMethod: {
//    details: {
//      last2:    string, // type(creditcard): last 2 card numbers
//      cardType: string, // type(creditcard): 'American Express','Carte Blanche','China UnionPay','Diners Club','Discover','JCB','Laser','Maestro','MasterCard','Solo','Switch','Visa','Unknown'
//      email: string, // type(paypal): paypal account email address in case type is paypal
//    },
//    nonce: string,
//    type: string, // creditcard, paypal
//  }
//}
Braintree3.prototype.subscribe = function(data, callback) {

  // create subscription
  var planName = data.planName,
      planInterval = data.planInterval,
      pm = data.paymentMethod,
      pmd = pm && pm.details;

  data.planName = undefined;
  data.planInterval = undefined;

  if (this.profile.isSubscribed) {
    planName = planName || this.profile.subscription.plan;
    planInterval = planInterval || this.profile.subscription.interval;
  }

  this.addons = data.addons;
  this.ipAddress = data.ipAddress;
  this.webhookNotification = data.webhookNotification;
  this.isAnnualPrepay = data.isAnnualPrepay || (planInterval === 'YEAR' ? true : false);

  this.paymentMethod = pm;
  this.merchantAccountId = this.merchantAccountDefault;

  this._planChange(planName, planInterval, function(err, change) {
    if (err || !change) {
      callback(err);
    } else {
      if (change.newPlanName.indexOf('PAYWYUM_') === 0 && change.isPlanChanged) {
        const newPremiumMetrics = (change.newPlan.premium && change.newPlan.premium.metrics) || config.get('premium:trial:metrics');
        this.profile.premium = this.profile.premium || {};
        this.profile.premium.metrics = newPremiumMetrics;
      }
      this.profile.use = _.defaults(change.newPlan.use || {}, config.get('users:use'));

      change.isRecurring = this.webhookNotification ? true : false;
      var tasks = [
            this._fetchOwner.bind(this),
            this._registerOrUpdateCustomer.bind(this)];

      if (change.isRecurring) {
        tasks.push(function(cb) {
          this._createOrUpdateSubscriptionCallback(change, cb)(null, this.webhookNotification);
        }.bind(this));
      } else
      if (this.profile.isSubscribed) {
        tasks.push(async.apply(this.update.bind(this), data, change));
      } else {
        tasks.push(async.apply(this.create.bind(this), data, change));
      }

      async.series(tasks, function(err/*, results*/) {
        if (err) {
          callback(err);
        } else {
          this._finish(change, callback);
        }
      }.bind(this));
    }
  }.bind(this), this.isAnnualPrepay);
};

Braintree3.prototype._registerOrUpdateCustomer = function(callback) {
  var usr = this.user || this.owner,
      sub = this.profile.subscription,
      isBraintreeSub = sub && sub.gw === 'BRAINTREE',
      req = {
        firstName: usr.fname,
        lastName: usr.lname,
        company: this.profile.subject.org || '',
        customFields: {
          vatId: this.profile.subject.vatId || '',
          billingCountry: this.profile.subject.country || '',
          billTo: this.profile.subject.billTo || ''
        }
      };

  if (this.paymentMethod) {
    req.paymentMethodNonce = this.paymentMethod.nonce;

    if (isBraintreeSub && this.paymentMethod === 'creditcard' && sub.card && sub.card.token) {
      req.creditCard = {
        token: sub.card.token
      };
    }
  }

  if (isBraintreeSub && sub.customer && sub.customer.id) {
    this.getClient().customer.update(sub.customer.id, req,
      this._createRegisterOrUpdateCustomerCallback(true, callback));
  } else {

    req.email = usr.email;
    req.customFields.actorId = usr.actorId;
    req.customFields.userId = usr._id.toString();
    req.customFields.profileId = this.profile._id.toString();

    this.getClient().customer.create(req, this._createRegisterOrUpdateCustomerCallback(false, callback));
  }
};

Braintree3.prototype.balance = function(callback) {
  this.getClient().subscription.find(this.profile.subscription.id, function(err, sub) {
    if (err || !sub) {
      callback(err, 0);
    } else {
      callback(null, Math.floor(sub.balance*100), sub);
    }
  }.bind(this));
};

Braintree3.prototype._createRegisterOrUpdateCustomerCallback = function(isUpdate, callback) {
  return function(err, result) {

    log.debug('Braintree customer '+(isUpdate ? 'update' : 'registration')+' callback', result?JSON.stringify(result,null,2):result, err?JSON.stringify(err,null,2):err);

    if (result && result.success) {

      this.profile.subscription = this.profile.subscription || {};
      this.profile.subscription.gw = 'BRAINTREE';
      this.profile.subscription.method = this.paymentMethod && this.paymentMethod.type || this.profile.subscription.method;
      this.profile.subscription.ipAddress = this.ipAddress || this.profile.subscription.ipAddress;

      this.profile.subscription.merchant = this.profile.subscription.merchant || {};
      this.profile.subscription.merchant.merchantId = this.merchantId;
      this.profile.subscription.merchant.accountId = this.merchantAccountId;

      if (!isUpdate) {
        this.profile.subscription.customer = {
          id: result.customer.id
        };
      }

      var paypal = result.customer.paypalAccounts && result.customer.paypalAccounts.length && result.customer.paypalAccounts[0] || null;
      if (paypal) {
        this.profile.subscription.paypal = {
          token: paypal.token,
          email: paypal.email
        };
      } else {
        this.profile.subscription.paypal = {};
      }

      var cc = result.customer.creditCards && result.customer.creditCards.length && result.customer.creditCards[0] || null;
      if (cc) {
        this.profile.subscription.card = {
          token: cc.token,
          last4: cc.last4,
          cardType: cc.cardType,
          expMonth: parseInt(cc.expirationMonth),
          expYear:  parseInt(cc.expirationYear)
        };
      } else {
        this.profile.subscription.card = {};
      }

      log.info('Successfully '+(isUpdate ? 'updated' : 'registered')+' Braintree profile '+this.profileId, {
        merchantId: this.merchantId,
        customerId: this.profile.subscription.customer.id});

      this._saveProfile(callback);

    } else {

      log.error('Failed to '+(isUpdate ? 'update' : 'register')+' Braintree profile '+this.profileId, {
        error: err,
        result: result});

      callback(err || result);
    }
  }.bind(this);
};

Braintree3.prototype._prorateRequiredDiscountForAnnualPlan = function(lastBillingDate, nextBillingDate, monthlyPrice, freeMonths, now) {
now = now || moment.utc();
var daysInBillingCycle = moment.utc(nextBillingDate).diff(moment.utc(lastBillingDate),'days'),
    daysLeftInBillingCycle = moment.utc(nextBillingDate).diff(now,'days'),
    annualPrice = (12-freeMonths)*monthlyPrice,
    // requiredAnnualPrice = annualPrice-monthlyPrice*1,
    requiredDiscount = Math.ceil((annualPrice*daysInBillingCycle-annualPrice*daysLeftInBillingCycle+2*monthlyPrice*daysLeftInBillingCycle)/(2*daysLeftInBillingCycle)),
    proratedBalance = Math.ceil((annualPrice-monthlyPrice+requiredDiscount)*(daysLeftInBillingCycle/daysInBillingCycle));
  return {
    monthlyPrice: monthlyPrice,
    requiredDiscount: requiredDiscount,
    proratedBalance: proratedBalance
  };
};

// create subscription
// data: {
//  planName: string     // plan name
//  planInterval: string // MONTH || YEAR
//  addons: {'addonid': {cout of addons},...}
//  webhookResult: {...}
//  paymentMethod: {
//    details: {
//      last2:    string, // type(creditcard): last 2 card numbers
//      cardType: string, // type(creditcard): 'American Express','Carte Blanche','China UnionPay','Diners Club','Discover','JCB','Laser','Maestro','MasterCard','Solo','Switch','Visa','Unknown'
//      email: string, // type(paypal): paypal account email address in case type is paypal
//    },
//    nonce: string,
//    type: string, // creditcard, paypal
//  }
//}
Braintree3.prototype.create = function(data, change, callback) {
  var sub = this.profile.subscription,
      card = sub.card,
      paypal = sub.paypal,
      prepayYears = data.prepayYears || 0,
      isCard = data.paymentMethod.type === 'creditcard',
      isPayPal = data.paymentMethod.type === 'paypal',
      token = (isCard && card && card.token) || (isPayPal && paypal && paypal.token) || (card && card.token) || null,
      req = {
        paymentMethodToken: token,
        planId: change.newPlanSubscription.braintreePlanId,
        merchantAccountId: this.merchantAccountId,
        price: (change.payAmount/100).toString()
        //price: '2000.00', // TEST
      };

  if (prepayYears > 0) {
    req.trialDuration = 1;
    req.trialDurationUnit = 'month';
    req.trialPeriod = true;
  } else {
    req.options = req.options || {};
    req.options.startImmediately = true;
  }

  if (change.newPlanName === 'PAYWYUM') {
    var profilesCount = (this.profile.profiles && this.profile.profiles.length) || 0;
    if (profilesCount > 0) {
      var addon = { inheritedFromId: 'PAYWYUM_SOCIAL_PROFILE_ADDON', quantity: profilesCount };
      var unitPrice = this.profile.premium && this.profile.premium.metrics && this.profile.premium.metrics.profile;
      if (unitPrice !== null && unitPrice !== undefined) {
        var taxAmount = 0;
        var finalUnitPrice = unitPrice + taxAmount;
        addon.amount =  finalUnitPrice.toString();
      }
      req.addOns = {
        add: [addon]
      };
    }

    var now = moment.utc();
    var firstBillingDate = this.profile.created && moment.utc(this.profile.created) || now.clone();
    while (firstBillingDate.isBefore(now)) {
      firstBillingDate = firstBillingDate.add(1, 'months');
    }

    req.options.startImmediately = false;
    req.firstBillingDate = firstBillingDate.format('YYYY-MM-DD');
  } else
  if (change.newPlanName.indexOf('PAYWYUM_') === 0) {
    const freeQueues = (change.newPlan.use && change.newPlan.use.free && change.newPlan.use.free.accounts) || 0;
    req = this.accountManager.enhanceDiscountRequest(req, this.profile, null, 'QUEUE_DISCOUNT', Math.min(freeQueues, this.profile.accounts.length), 'connectedAccount');
    req = this.accountManager.enhanceAddOnRequest(req, this.profile, null, 'QUEUE_ADDON', this.profile.accounts.length, 'connectedAccount');
  }

  // instagram queues
  const connectedInstagramQueues = this.profile.accounts.filter(a => a.network === Types.network.instagram.code)
    .length;
  const freeInstagramQueues = (this.profile.use && this.profile.use.free && this.profile.use.free.instagramQueues) || 0;
  req = this.accountManager.enhanceDiscountRequest(
    req,
    this.profile,
    null,
    'INSTAGRAM_QUEUE_DISCOUNT',
    Math.min(freeInstagramQueues, connectedInstagramQueues),
    'instagramQueue'
  );
  req = this.accountManager.enhanceAddOnRequest(
    req,
    this.profile,
    null,
    'INSTAGRAM_QUEUE_ADDON',
    connectedInstagramQueues,
    'instagramQueue'
  );

  change.prepayYears = data.prepayYears || 0;

  this.getClient().subscription.create(req,
    this._createOrUpdateSubscriptionCallback(change, callback).bind(this));

  // var subCallback = this._createOrUpdateSubscriptionCallback(change, callback).bind(this);
  // this.getClient().subscription.create(req, function(err, result) {
  //
  //   var processorResponseCode = result && result.transaction ? result.transaction.processorResponseCode : null;
  //
  //   // processorResponseCode:
  //   // 2000 - Do Not Honor
  //
  //   if (processorResponseCode === '2000') {
  //     req.options.startImmediately = false;
  //     req.trialPeriod = true;
  //     req.trialDuration = 1;
  //     req.trialDurationUnit = 'day';
  //     //delete req.price; // TEST
  //
  //     change.isPostponedPayment = true;
  //
  //     this.getClient().subscription.create(req, subCallback);
  //   } else {
  //     subCallback(err, result);
  //   }
  // }.bind(this));
};

// create subscription
// data: {
//  planName: string     // plan name
//  planInterval: string // MONTH || YEAR
//  addons: {'addonid': {cout of addons},...}
//  webhookResult: {...}
//  paymentMethod: {
//    details: {
//      last2:    string, // type(creditcard): last 2 card numbers
//      cardType: string, // type(creditcard): 'American Express','Carte Blanche','China UnionPay','Diners Club','Discover','JCB','Laser','Maestro','MasterCard','Solo','Switch','Visa','Unknown'
//      email: string, // type(paypal): paypal account email address in case type is paypal
//    },
//    nonce: string,
//    type: string, // creditcard, paypal
//  }
//}
Braintree3.prototype.update = function(data, change, callback) {
  this.getClient().subscription.find(this.profile.subscription.id, function(err, btsub) {
    if (err) {
      return callback(err);
    }

    var sub = this.profile.subscription,
        card = sub.card,
        paypal = sub.paypal,
        isCard = data.paymentMethod.type === 'creditcard',
        isPayPal = data.paymentMethod.type === 'paypal',
        token = (isCard && card && card.token) || (isPayPal && paypal && paypal.token) || (card && card.token) || null,
        req = {
          paymentMethodToken: token,
          planId: change.newPlanSubscription.braintreePlanId,
          merchantAccountId: this.merchantAccountId,
          price: (change.payAmount/100).toString(),
          //price: '2000.00', // TEST
          options: {
            prorateCharges: true,
            startImmediately: true
          }
        };

    if (change.newPlanName === 'PAYWYUM') {
      var now = moment.utc();
      var firstBillingDate = this.profile.created && moment.utc(this.profile.created) || now.clone();
      while (firstBillingDate.isBefore(now)) {
        firstBillingDate = firstBillingDate.add(1, 'months');
      }

      req.options.startImmediately = false;
      req.firstBillingDate = firstBillingDate.format('YYYY-MM-DD');

      req = this.accountManager.enhanceDiscountRequest(req, this.profile, btsub, 'QUEUE_DISCOUNT', 0, 'connectedAccount');
      req = this.accountManager.enhanceAddOnRequest(req, this.profile, btsub, 'QUEUE_ADDON', 0, 'connectedAccount');
      req = this.accountManager.enhanceAddOnRequest(req, this.profile, btsub, 'PAYWYUM_SOCIAL_PROFILE_ADDON', this.profile.premiumProfilesCount, 'profile');
    } else
    if (change.newPlanName.indexOf('PAYWYUM_') === 0) {
      const freeQueues = (change.newPlan.use && change.newPlan.use.free && change.newPlan.use.free.accounts) || 0;
      req = this.accountManager.enhanceDiscountRequest(req, this.profile, btsub, 'QUEUE_DISCOUNT', Math.min(freeQueues, this.profile.accounts.length), 'connectedAccount');
      req = this.accountManager.enhanceAddOnRequest(req, this.profile, btsub, 'QUEUE_ADDON', this.profile.accounts.length, 'connectedAccount');
      req = this.accountManager.enhanceAddOnRequest(req, this.profile, btsub, 'PAYWYUM_SOCIAL_PROFILE_ADDON', 0, 'profile');
    }

    // instagram queues
    const connectedInstagramQueues = this.profile.accounts.filter(a => a.network === Types.network.instagram.code)
      .length;
    const freeInstagramQueues = (this.profile.use && this.profile.use.free && this.profile.use.free.instagramQueues) || 0;
    req = this.accountManager.enhanceDiscountRequest(
      req,
      this.profile,
      btsub,
      'INSTAGRAM_QUEUE_DISCOUNT',
      Math.min(freeInstagramQueues, connectedInstagramQueues),
      'instagramQueue'
    );
    req = this.accountManager.enhanceAddOnRequest(
      req,
      this.profile,
      btsub,
      'INSTAGRAM_QUEUE_ADDON',
      connectedInstagramQueues,
      'instagramQueue'
    );

    this.getClient().subscription.update(this.profile.subscription.id, req,
      this._createOrUpdateSubscriptionCallback(change, callback).bind(this));
  }.bind(this));
};

Braintree3.prototype.prepay = function(years, callback) {
  this.getClient().subscription.find(this.profile.subscription.id, function(err, btsub) {
    if (err) {
      return callback(err);
    }

    const sub = this.profile.subscription;
    const plan = sub && sub.plan;
    const isPaywyumBasedPlan = plan === 'PAYWYUM' || plan.indexOf('PAYWYUM_') === 0;
    if (!isPaywyumBasedPlan) {
      return callback({ message: 'Prepay is allowed only for PAYWYUM plans' });
    }

    const monthlyPayment = Math.floor(btsub.nextBillAmount * 100);
    const prepayAmount = (years * 12 - prepayYearsDiscountedMonths[years]) * monthlyPayment;
    const discountAmount = years * 12 * monthlyPayment;

    // create a sale
    this.getClient().transaction.sale({
      amount: (prepayAmount/100).toString(),
      customerId: sub.customer.id,
      options: {
        submitForSettlement: true
      }
    }, function (error, result) {
      if (error) {
        log.error('Prepay sale failed', { profileId: this.profile._id.toString(), error: error.stack || error });
        return callback(error);
      }
      if (!result.success) {
        log.error('Prepay sale unsuccesful', { profileId: this.profile._id.toString(), result });
        return callback(result);
      }

      log.info('Prepay sale created', { profileId: this.profile._id.toString(), result });

      // create transaction records
      const tx = result.transaction;
      const fee = tx && tx.paypalAccount && tx.paypalAccount.transactionFeeAmount ? Math.floor(tx.paypalAccount.transactionFeeAmount*100) : 0;
      const txId = tx && tx.id || null;
      const txTm = tx && moment.utc(tx.createdAt) || null;
      const txAmount = tx && Math.floor(tx.amount*100) || null;

      let desc = '';
      if (tx.paymentInstrumentType === 'credit_card' && tx.creditCard) {
        desc = `Credit Card (${tx.creditCard.cardType} x${tx.creditCard.last4})`;
      } else
      if (tx.paymentInstrumentType === 'paypal_account' && tx.paypalAccount) {
        desc = `PayPal (${tx.paypalAccount.payerEmail}, ${tx.paypalAccount.authorizationId}, ${tx.paypalAccount.captureId})`;
      }
      desc = `Prepayed for ${years === 1 ? 'a year': `${years} years`}${desc ? ` with ${desc}`: ''}`;

      Audit.profile('billing:prepayed', (this.user && this.user._id) || (this.owner && this.owner._id), this.profile._id, { plan, years, prepayAmount });

      this.tx = new Transaction({
        tm: new Date(),
        type: 'PREPAY',
        updatedAt: new Date(),
        id: txId,
        paypalId: (tx.paypalAccount && tx.paypalAccount.authorizationId),
        fee,
        desc,
        payedAt: txTm.toDate(),
        pid: this.profile._id,
        amount: txAmount,
        recurring: false,
        isAnnualPrepay: true,
        vatInc: 0,
        subscr: this.profile.subscription.toObject(),
        subject: this.profile.subject.toObject()
      });
      this.tx.save(function(error) {
        if (error) {
          log.error('Failed to save prepay transaction', { tx, error: error.stack || error });
          return callback(error);
        }
        log.info('Prepay transaction saved', { profileId: this.profile._id.toString(), txId: this.tx._id.toString() });

        // send invoice
        (new Invoice({ profile: this.profile, tx: this.tx })).send().then(() => {}, () => {});
      }.bind(this));

      // update subscription
      const subReq = {
        options: {
          prorateCharges: true,
          startImmediately: true
        }
      };

      const prepayDiscount = btsub.discounts && btsub.discounts.find(r => r.id === 'PREPAY');
      if (prepayDiscount) {
        const amount = ((Math.floor(prepayDiscount.amount * 100) + discountAmount) / 100).toFixed(2);
        subReq.discounts = { update: [{ existingId: 'PREPAY', amount }] };
      } else {
        subReq.discounts = { add: [{ inheritedFromId: 'PREPAY', amount: (discountAmount / 100).toFixed(2) }] };
      }

      this.getClient().subscription.update(this.profile.subscription.id, subReq, function(error, result) {
        if (error) {
          log.error('Prepay subscription update failed', { profileId: this.profile._id.toString(), error: error.stack || error });
          return callback(error);
        }
        if (!result.success) {
          log.error('Prepay subscription update unsuccesful', { profileId: this.profile._id.toString(), result })
          return callback(result);
        }
        log.info('Prepay subscription updated', { profileId: this.profile._id.toString(), result });
        callback(null, result);
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

Braintree3.prototype._createOrUpdateSubscriptionCallback = function(change, callback) {
  return function(err, result) {

    log.debug('Braintree register or update customer subscription callback', result?JSON.stringify(result,null,2):result, err?JSON.stringify(err,null,2):err);

    var detail, addons;

    if (result && result.success) {

      var tx = result.subscription.transactions && result.subscription.transactions.length > 0 ? result.subscription.transactions[0] : null,
          nextBillingPeriodAmount = Math.floor(result.subscription.nextBillingPeriodAmount*100),
          fee = tx && tx.paypalAccount && tx.paypalAccount.transactionFeeAmount ? Math.floor(tx.paypalAccount.transactionFeeAmount*100) : 0;

      if (change.isRecurring) {

        var desc = '???',
            sub = this.profile.subscription,
            subId = sub.id || '?';

        if (!sub.method) {
          desc = (sub.paypal && sub.paypal.email ? 'Paypal' : sub.card && sub.card.last4 ? 'Credit Card' : '???')+' payment';
        }
        if (!sub.method || sub.method === 'creditcard') {
          desc = 'Credit Card payment (x'+sub.card.last4+')';
        } else
        if (sub.method === 'paypal') {
          desc = 'PayPal payment ('+sub.paypal.email+', '+sub.customer.id+', '+subId+')';
        }

        change.description = (change.newPlanPayInterval === 'MONTH' ? 'Monthly' : 'Annual')+' recurring '+desc+' for ';

        if (change.newPlanName === 'PAYWYUM') {
          var profiles = 0;
          addons = this.webhookNotification && this.webhookNotification.subscription && this.webhookNotification.subscription.addOns;
          if (addons && addons.length) {
            addons.forEach(function(a) {
              if (a.id === 'PAYWYUM_SOCIAL_PROFILE_ADDON') {
                profiles += a.quantity || 1;
              }
            });
          }
          change.description += profiles+' connected social account'+(profiles === 1 ? '' : 's');
        } else
        if (change.newPlanName.indexOf('PAYWYUM_') === 0) {
          change.description += this.profile.accounts.length+' queue'+(this.profile.accounts.length === 1 ? '' : 's');
        } else {
          change.description += change.newPlanName+' plan';
        }

        const instagramQueues = this.profile.accounts.filter(a => a.network === Types.network.instagram.code).length;
        if (instagramQueues > 0) {
          change.description += ` and Instagram ${instagramQueues} queue${instagramQueues > 1 ? 's': ''}`;
        }

        Audit.profile('billing:charged', (this.user && this.user._id) || (this.owner && this.owner._id), this.profile._id, {
          plan: change.newPlanName,
          fee: fee,
          amount: tx && tx.amount || 0,
          balance: result.subscription.balance
        });

      } else {

        Audit.profile('billing:subscribed', (this.user && this.user._id) || (this.owner && this.owner._id), this.profile._id, {
          plan: change.newPlanName
        });

        change.description =
            change.isPlanChanged ?
              (change.isUpgrade ? 'Upgrade' : 'Downgrade')+
              ' from '+
              (change.oldPlanName === 'FREE' ?
                'FREE plan' :
                (change.oldPlanPayInterval === 'MONTH' ? 'monthly' : 'annually')+
                ' paid '+
                (change.oldPlan.name||change.oldPlan.id)+' plan')+
              ' to '+
              (change.newPlanName === 'FREE' ? 'FREE plan' :
                (this.isAnnualPrepay ? 'annually pre-paid' : 'monthly paid')+' '+
                (change.newPlan.name||change.newPlan.id)+' plan') :
              'Upgrade of '+(this.isAnnualPrepay ? 'annually pre-paid' : 'monthly paid')+' '+(change.newPlan.name||change.newPlan.id)+' plan';
      }

      addons = {};

      if (result.subscription.addOns && result.subscription.addOns.length) {
        result.subscription.addOns.forEach(function(addon) {
          addons[addon.id] = {
            count: addon.quantity,
            amount: Math.floor(addon.amount*100)*addon.quantity
          };
        });
      }

      var txId = tx ? tx.id : null,
          txTm = tx ? moment.utc(tx.createdAt) : null,
          subPrice = Math.floor(result.subscription.price*100),
          balance = Math.floor(result.subscription.balance*100),
          txAmount = tx ? Math.floor(tx.amount*100) : null,
          lastPay = txTm ? txTm.toDate() : this.profile.subscription.lastPay || null,
          nextPay = moment.utc(result.subscription.nextBillingDate);

      if (result.subscription.addOns && result.subscription.addOns.length) {
        result.subscription.addOns.forEach(function(addon) {
          if (addon.id === 'ACCOUNTS_ADDON' || addon.id === 'MEMBERS_ADDON' || addon.id === 'QUEUE_ADDON' || addon.id === 'PAYWYUM_SOCIAL_PROFILE_ADDON') {
            subPrice += Math.floor(addon.amount*addon.quantity*100);
          }
        });
      }

      if (balance < 0 && change.newPlanName !== 'PAYWYUM' ) {
        var paidMonths = Math.floor(Math.abs(balance) / subPrice);
        nextPay = nextPay.add(paidMonths, 'months');
      }

      var newSubscription = {
        id: result.subscription.id,
        gw: 'BRAINTREE',
        method: (this.paymentMethod && this.paymentMethod.type) || this.profile.subscription.method,
        amount: nextBillingPeriodAmount || txAmount || 0,
        plan: change.newPlanName,
        interval: change.newPlanPayInterval,
        createdAt: moment.utc().toDate(),
        lastPay,
        nextPay: nextPay.toDate(),
        merchant: this.profile.subscription.merchant && this.profile.subscription.merchant.toObject() || { accountId: this.merchantAccountId, merchantId: this.merchantId },
        card: this.profile.subscription.card && this.profile.subscription.card.toObject() || {},
        paypal: this.profile.subscription.paypal && this.profile.subscription.paypal.toObject() || {},
        customer: this.profile.subscription.customer.toObject(),
        ipAddress: this.profile.subscription.ipAddress,
        addons,
        balance
      };

      /*if (balance !== 0) {
        var daysOffs = Math.ceil((balance*(change.newPlanPayInterval === 'MONTH'? 31 : 365))/nextAmount);
        nextPay = nextPay.subtract(daysOffs, 'days');
        newSubscription.nextPay = nextPay.toDate();
      }*/

      this.profile.plan.validUntil = nextPay.toDate();
      this.profile.subscription = newSubscription;

      detail = {
        merchantId: this.merchantId,
        customerId: this.profile.subscription.customer.id,
        subId: this.profile.subscription.id,
        plan: change.newPlanName,
        interval: change.newPlanPayInterval
      };

      if (change.isRecurring) {
        log.info('Successfully processed Braintree recurring payment for profile '+this.profileId, detail);
      } else {
        log.info('Successfully created Braintree subscription for profile '+this.profileId, detail);
      }

      async.parallel([
        function(cb) {
          this._fetchOwner(function() {
            this.customerLifecycle.subscribed(this.owner, this.profile);
            cb();
          }.bind(this));
        }.bind(this),
        function(cb) {
          if (txAmount) {
            Transaction.findOne({id: txId}, function(err, foundTx) {
              if (foundTx) {
                change.payedAmount = 0;
              } else {
                change.payedAmount = txAmount;

                this.tx = new Transaction({
                  tm: change.now.toDate(),
                  type: 'CHARGE',
                  updatedAt: change.now.toDate(),
                  id: txId,
                  paypalId: (tx.paypal && tx.paypal.authorizationId) || (tx.paypalAccount && tx.paypalAccount.authorizationId),
                  fee: fee,
                  payedAt: txTm.toDate(),
                  pid: this.profile._id,
                  desc: change.description,
                  amount: txAmount,
                  isAnnualPrepay: this.isAnnualPrepay,
                  vatInc: 0,
                  subscr: this.profile.subscription.toObject(),
                  subject: this.profile.subject.toObject(),
                  recurring: change.isRecurring
                });
                this.tx.subscr.forcedUnsubscr = undefined;
              }
              cb(err);
            }.bind(this));
          } else {
            cb();
          }
        }.bind(this)
      ], function(/*err*/) {

        if (change.isPostponedPayment) {
          this.customerLifecycle.newSubscriptionWithPostponedPayment(this.user || this.owner, this.profile, change.posponedDiscount||0);
        }

        this._saveProfile(function(err, profile) {
          if (err) {
            return callback(err);
          }
          const prepayYears = change.prepayYears || 0;
          if (prepayYears < 1) {
            return callback(null, this.profile);
          }
          this.prepay(prepayYears, function(err) {
            if (err) {
              return callback(err);
            }
            return callback(null, this.profile);
          }.bind(this));
        }.bind(this));
      }.bind(this));
    } else {

      detail = {
        customerId: this.profile.subscription.customer.id,
        plan: change.newPlanName,
        interval: change.newPlanPayInterval,
        error: err,
        result: result
      };

      if (change.isRecurring) {
        log.error('Failed to process Braintree recurring payment for profile '+this.profileId, detail);
      } else {
        log.error('Failed to create Braintree subscription for profile '+this.profileId, detail);
      }

      callback(err || result);
    }
  }.bind(this);
};