/* jshint node: true */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { dbNotUpdated, Profile, User, FetchAccount, PricingPlan, Queue } = require('@fpm/db');
const _ = require('underscore');
const async = require('async');
const moment = require('moment');
const affiliate = require('./affiliate');
const { Invoice } = require('@fpm/events');

var PaymentGateway = module.exports = function PaymentGateway({ customerLifecycle, profile, user, owner, premiumManager, profileManager }) {
  this.customerLifecycle = customerLifecycle;
  this.premiumManager = premiumManager;
  this.profileManager = profileManager;
  this.user = user || null;
  this.userId = this.user ? this.user._id.toString() : null;
  this.owner = owner || null;
  this.tx = null;
  this.switchProfile(profile);
  return this;
};

PaymentGateway.prototype.switchProfile = function(profile) {
  this.braintreeClient = null;
  this.profile = profile;
  this.profileId = profile && profile._id.toString();
  this.isTrial = false;
  this.forcedUnsubscribe = (profile && profile.subscription ? profile.subscription.forcedUnsubscr : null) || false;
};

PaymentGateway.prototype.forceUnsubscribe = function(isTrial) {
  this.forcedUnsubscribe = true;
  this.isTrial = !!isTrial;
};

PaymentGateway.prototype.webhook = function(/*data, callback*/) {
  throw new Error('Not implemented');
};

PaymentGateway.prototype.subscribe = function(/*callback*/) {
  throw new Error('Not implemented');
};

PaymentGateway.prototype.unsubscribe = function(callback) {
  this._fetchOwner(function(err) {
    if (err) {
      callback(err);
    } else {
      this._unsubscribe(callback);
    }
  }.bind(this));
};

PaymentGateway.prototype._fetchOwner = function(callback) {
  if (this.owner) {
    callback(null, this.owner);
  } else {
    var ownerId = this.profile.ownerId;
    if (ownerId) {
      User.findById(ownerId, function(err, owner) {
        if (owner) {
          this.owner = owner;
          this.ownerId = owner._id.toString();
          callback(null, owner);
        } else {
          callback({
            code: 'PROFILE_OWNER_NOT_FOUND',
            message: 'Profile '+this.profileId+' owner not found',
            error: err});
        }
      }.bind(this));
    } else {
      callback({
        code: 'PROFILE_WITHOUT_OWNER',
        message: 'Profile '+this.profileId+' is without owner'});
    }
  }
};

PaymentGateway.prototype._trackAffiliate = function(callback) {
  if (this.profile.isAffiliateTrackable) {
    affiliate.payment(this.profile, this.owner, this.tx, this.premiumManager, callback);
  } else {
    callback();
  }
};

PaymentGateway.prototype._onPremiumUnsubscribe = function(callback) {
  this._fetchOwner(function() {
    if (this.customerLifecycle) {
      this.customerLifecycle.premiumUnsubscribe(this.owner, this.profile, callback, { isTrial: this.isTrial });
    } else {
      callback();
    }
  }.bind(this));
};

PaymentGateway.prototype._onChargeSuccess = function(callback) {
  this._fetchOwner(function() {
    async.parallel([
      async.apply(this._trackAffiliate.bind(this)),
      function(cb) {
        this.customerLifecycle.chargeSuccessfull(this.owner, this.profile, cb);
      }.bind(this)
    ], callback);
  }.bind(this));
};

PaymentGateway.prototype._onChargeFail = function(callback) {
  this._fetchOwner(function() {
    this.customerLifecycle.chargeFailed(this.owner, this.profile, callback);
  }.bind(this));
};

PaymentGateway.prototype.removeSubscriptionFromProfile = function(callback) {
  var newSub = this._unsubscribedSubscriptionReduction(true);

  Profile.update({_id: this.profile._id}, {$set: {subscription: newSub}}, function(err, updated) {
    if(err || dbNotUpdated(updated)) {
      log.error('Failed to update profile '+this.profileId+' account after successfull PayPal unsubscribe', {
        profileId: this.profileId,
        error: err});
      callback(err);
    } else {

      // if (!this.forcedUnsubscribe) {
      //   /* jshint -W064 */
      //   Metric('user-events', {
      //     ev: 'cancel',
      //     uid: this.userId,
      //     pid: this.profileId,
      //     p: this.profile.subscription.plan,
      //     i: this.profile.subscription.interval});
      // }

      this.profile.subscription = newSub;

      this._onPremiumUnsubscribe(callback);
    }
  }.bind(this));
};

PaymentGateway.prototype._finish = function(change, callback) {
  var tasks = [];

  if (this.tx) {
    tasks.push(async.apply(this.tx.save.bind(this.tx)));
  }

  tasks.push(async.apply(this._finishAndSave.bind(this), change));

  async.series(tasks, callback);
};

PaymentGateway.prototype._finishAndSave = function(change, callback) {

  if (!this.profile.plan.validFrom || !change.isRecurring) {
    this.profile.plan.validFrom = moment.utc().toDate();
  }
  this.profile.plan.name = change.newPlanName;
  this.profile.plan.interval = change.newPlanPayInterval;
  this.profile.use = _.defaults(change.newPlan.use || {}, config.get('users:use'));

  var subAddons = this.profile.subscription ? this.profile.subscription.addons : null,
      useAddons = this.profile.use ? this.profile.use.addons : null;

  if (subAddons && useAddons) {
    if (subAddons.ACCOUNTS_ADDON && useAddons.ACCOUNTS_ADDON) {
      this.profile.use.maxAccounts = (this.profile.use.maxAccounts||0) + (subAddons.ACCOUNTS_ADDON.count||0)*(useAddons.ACCOUNTS_ADDON.accounts||0);
    }
    if (subAddons.MEMBERS_ADDON && useAddons.MEMBERS_ADDON) {
      this.profile.use.maxMembers = (this.profile.use.maxMembers||0) + (subAddons.MEMBERS_ADDON.count||0)*(useAddons.MEMBERS_ADDON.members||0);
    }
    this.profile.markModified('use');
  }

  const postsLimit = (change.newPlan && change.newPlan.use && change.newPlan.use.maxQueueSizePerAccount) || 5;
  Queue.update({ pid: this.profile._id }, { $set: { 'posts.limit': postsLimit } }, { multi: true }, (error, updated) => {
    if (error) {
      log.error(`Failed to update posts limit of queued of team ${this.profile._id.toString()}`, {
        profileId: this.profileId,
        planName: change.newPlanName,
        planInterval: change.newPlanPayInterval,
        updated,
        message: error.toString(),
        stack: error.stack
      });
    }
  });

  this.profileManager.updateAccountsByUseLimits(this.profile).then(() => {
    if (this.tx) {
      (new Invoice({ profile: this.profile, tx: this.tx })).send().then(() => {}, () => {});
    }
    FetchAccount.updatePlan(this.profile, () => {
      this._trackPlanChange(change, () => {
        callback(null, change.isRecurring);
      });
    });
  }).catch(error => {
    log.error('Failed to update accounts by limits for profile '+this.profileId+' account after successfull subscribe to plan with Braintree', {
      profileId: this.profileId,
      planName: change.newPlanName,
      planInterval: change.newPlanPayInterval,
      error});
    callback(error);
  });
};

PaymentGateway.prototype._loadPlan = function(planId, callback) {
  PricingPlan.findOne({id: planId}, function(err, plan) {
    if (err || !plan) {
      callback(err || {error:{message: 'Plan '+planId+' not found'}});
    } else {
      callback(null, plan);
    }
  }.bind(this));
};

PaymentGateway.prototype._planChange = function(newPlanName, newPlanPayInterval, callback/*, isAnnualPrepay*/) {

  var oldPlanName = this.profile.plan.name;

  async.parallel({
    oldPlan: async.apply(this._loadPlan.bind(this), oldPlanName),
    newPlan: async.apply(this._loadPlan.bind(this), newPlanName||oldPlanName)
  }, function(err, results) {
    if (err) {
      callback(err);
    } else {

      var sub = this.profile.subscription,
          oldPlanPayInterval = (sub ? sub.interval : null) || this.profile.plan.interval || 'MONTH';

      newPlanPayInterval = newPlanPayInterval || oldPlanPayInterval;

      var change, fixedRefundAmount, trialDays,
          now = moment.utc(),
          oldPlan = results.oldPlan,
          oldPlanSubscription = oldPlan.intervals[oldPlanPayInterval],
          newPlan = results.newPlan,
          newPlanSubscription = newPlan.intervals[newPlanPayInterval],
          newPlanSubscriptionFixedAmount = newPlanSubscription[newPlanPayInterval === 'MONTH' ? 'pricePerMonth' : 'pricePerYear'],
          payAmount = newPlanSubscriptionFixedAmount,
          isPlanChanged = oldPlanName !== newPlanName || oldPlanPayInterval !== newPlanPayInterval,
          isUpgrade = oldPlan.intervals.MONTH.pricePerMonth < newPlan.intervals.MONTH.pricePerMonth || (oldPlanPayInterval === 'MONTH' && newPlanPayInterval === 'YEAR') ? true : false,
          isDowngrade = isUpgrade ? false : true,
          isRecurring = this.profile.isSubscribed && oldPlanName === newPlanName && oldPlanPayInterval === newPlanPayInterval,
          description =
            isPlanChanged ?
              (isUpgrade ? 'Upgrade' : 'Downgrade')+' from '+
              (oldPlanName === 'FREE' || oldPlanName === 'FREEFOREVER' || oldPlanName === 'TRIAL' ? (oldPlan.name||oldPlan.id)+' plan' : (oldPlanPayInterval === 'MONTH' ? 'monthly' : 'annually')+' paid '+(oldPlan.name||oldPlan.id)+' plan')+
              ' to '+
              (newPlanName === 'FREE' || newPlanName === 'FREEFOREVER' || newPlanName === 'TRIAL' ? (newPlan.name||newPlan.id)+' plan' : (newPlanPayInterval === 'MONTH' ? 'monthly' : 'annually')+' paid '+(newPlan.name||newPlan.id)+' plan') :
              'Upgrade of '+(newPlanPayInterval === 'MONTH' ? 'monthly' : 'annually')+' paid '+(newPlan.name||newPlan.id)+' plan';

      if (!isRecurring && this.profile.pricesShouldContainVat) {
        payAmount = payAmount + 0;
      }

      if (sub.lastPay && sub.nextPay && sub.amount) {

        var lastPay = moment.utc(sub.lastPay),
            nextPay = moment.utc(sub.nextPay),
            plannedDays = nextPay.diff(lastPay, 'days'),
            usedDays = moment.utc().diff(lastPay, 'days'),
            paidDays = nextPay.diff(moment.utc(), 'days'),
            planDays = oldPlanPayInterval === 'YEAR' ? 365 : 31;

        fixedRefundAmount = plannedDays > usedDays ? Math.floor(((plannedDays - usedDays) * sub.amount) / planDays) : 0;
        trialDays = paidDays > 0 ? paidDays : null;
      }

      change = {
        now: now,
        oldPlan: oldPlan,
        oldPlanName: oldPlanName,
        oldPlanPayInterval: oldPlanPayInterval,
        oldPlanSubscription: oldPlanSubscription,
        newPlan: newPlan,
        newPlanName: newPlanName,
        newPlanPayInterval: newPlanPayInterval,
        newPlanSubscription: newPlanSubscription,
        newPlanSubscriptionFixedAmount: newPlanSubscriptionFixedAmount,
        isPlanChanged: isPlanChanged,
        isUpgrade: isUpgrade,
        isDowngrade: isDowngrade,
        isRecurring: isRecurring,
        isMigration: this.profile.subscriptionType === 'PAYMILL',
        description: description,
        payAmount: payAmount,
        fixedRefundAmount: fixedRefundAmount,
        trialDays: trialDays
      };

      callback(null, change);
    }
  }.bind(this));
};

PaymentGateway.prototype._trackPlanChange = function(change, callback) {

  var tasks = [],
      oldPlanName = change.oldPlanName,
      // oldPlanPayInterval = change.oldPlanPayInterval,
      // newPlanPayInterval = change.newPlanPayInterval,
      newPlanName = change.newPlanName;
      // isPlanChanged = newPlanName !== oldPlanName || newPlanPayInterval !== oldPlanPayInterval;

  // if (isPlanChanged) {
  //   /* jshint -W064 */
  //   Metric('user-events', {
  //     ev: 'planchange',
  //     uid: this.user ? this.user._id.toString() : undefined,
  //     pid: this.profile._id.toString(),
  //     newp: newPlanName,
  //     newi: newPlanPayInterval,
  //     oldp: oldPlanName,
  //     oldi: oldPlanPayInterval});
  // }

  if (this.tx && this.tx.amount) {
    // /* jshint -W064 */
    // Metric('user-events', {
    //   ev: 'payment',
    //   uid: this.user ? this.user._id.toString() : undefined,
    //   pid: this.profile._id.toString(),
    //   amount: this.tx.amount,
    //   gw: this.tx.gw,
    //   country: this.tx.subject.billingCountry,
    //   recur: change.isRecurring,
    //   vat: this.tx.subject.vatId ? true : false,
    //   p: this.tx.subscr.plan,
    //   i: this.tx.subscr.interval});

    tasks.push(this._onChargeSuccess.bind(this));
  }

  if (oldPlanName !== 'FREE' && newPlanName === 'FREE') {

    // if (!this.forcedUnsubscribe) {
    //   /* jshint -W064 */
    //   Metric('user-events', {
    //     ev: 'cancel',
    //     uid: this.user ? this.user._id.toString() : undefined,
    //     pid: this.profile._id.toString(),
    //     p: oldPlanName,
    //     i: oldPlanPayInterval});
    // }

    tasks.push(this._onPremiumUnsubscribe.bind(this));
  }

  async.series(tasks, callback);
};

PaymentGateway.prototype._unsubscribedSubscriptionReduction = function(skipSet) {
  var newSubscription = {
    gw: this.profile.subscription.gw
  };
  if (this.profile.subscription.customer) {
    newSubscription.customer = this.profile.subscription.customer.toObject();
  }
  if (this.profile.subscription.card) {
    newSubscription.card = this.profile.subscription.card.toObject();
  }
  if (!skipSet) {
    this.profile.subscription = newSubscription;
  }
  return newSubscription;
};

PaymentGateway.prototype.switchToPlan = function(toPlan, callback) {
  this._planChange(toPlan, 'MONTH', function(err, change) {
    if (err || !change) {
      callback(err);
    } else {
      this._unsubscribedSubscriptionReduction();

      this.profile.plan.validUntil = null;
      this.profile.plan.validFrom = moment.utc().toDate();

      this._finish(change, callback);
    }
  }.bind(this));
};

PaymentGateway.prototype.switchToFreePlan = function(callback) {
  this.switchToPlan('FREE', callback);
};

PaymentGateway.prototype._unsubscribe = function(callback) {
  if (this.profile.isSubscribed) {
    var now = moment.utc(),
        nextPay = moment.utc(this.profile.subscription.nextPay);
    if (nextPay.isBefore(now) || this.profile.plan.name === 'PAYWYUM') {
      this.switchToFreePlan(callback);
    } else {
      this.removeSubscriptionFromProfile(callback);
    }
  } else {
    this.switchToFreePlan(callback);
  }
};
