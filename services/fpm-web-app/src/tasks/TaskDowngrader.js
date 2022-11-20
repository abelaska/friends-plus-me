const log = require('@fpm/logging').default;
const { Profile } = require('@fpm/db');
const util = require('util');
const async = require('async');
const moment = require('moment');
const ScheduledTask = require('../lib/ScheduledTask');
const PaymentGateway = require('../lib/PaymentGateway');
const BraintreePG = require('../lib/paygateways/Braintree3');
const PayPalPG = require('../lib/paygateways/PayPal');

const TaskDowngrader = function TaskDowngrader({ customerLifecycle, profileManager }) {
  ScheduledTask.call(this, 'downgrader');
  this.customerLifecycle = customerLifecycle;
  this.profileManager = profileManager;
  return this;
};
util.inherits(TaskDowngrader, ScheduledTask);

TaskDowngrader.prototype.run = function run(callback) {
  this._findUsersWithNoLongerValidPlan(function (err, downgradeProfiles) {
    if (err || !downgradeProfiles || !downgradeProfiles.length) {
      return callback(err);
    }
    async.eachLimit(downgradeProfiles, 4, this._downgradeProfile.bind(this), callback);
  }.bind(this));
};

TaskDowngrader.prototype._findUsersWithNoLongerValidPlan = function _findUsersWithNoLongerValidPlan(callback) {
  let tm = new Date();
  Profile.find({ 'plan.validUntil': { $lt: moment.utc().toDate() }, 'subscription.id': { $exists: false } })
  .limit(25)
  .exec(function (err, profiles) {
    tm = new Date() - tm;
    if (err) {
      log.error('Failed to find accounts without valid plan', { time: tm, error: err });
      return callback(err);
    }

    profiles = profiles || [];

    if (profiles.length) {
      log.info('Found profiles with no longer valid plan', { count: profiles.length, time: tm });
    }

    return callback(null, profiles);
  }.bind(this));
};

TaskDowngrader.prototype._downgradeProfile = function _downgradeProfile(profile, callback) {
  const profileId = profile._id.toString();
  const isTrial = profile.plan.name === 'TRIAL' || profile.plan.name === 'FREEFOREVER';
  const isSubscribed = profile.isSubscribed;
  const PGClass = isSubscribed ? (profile.subscription.gw === 'PAYPAL' ? PayPalPG : BraintreePG) : PaymentGateway;
  const pg = new PGClass({
    profile,
    customerLifecycle: this.customerLifecycle,
    profileManager: this.profileManager
  });

  if (profile.subscription) {
    profile.subscription.forcedUnsubscr = true;
  }

  pg.forceUnsubscribe(isTrial);
  pg.unsubscribe(function(err) {
    if (isTrial) {
      if (err) {
        log.error('Failed to expire trial', {
          profileId,
          gw: profile.subscription ? profile.subscription.gw : undefined,
          plan: profile.subscription ? profile.subscription.plan : undefined,
          interval: profile.subscription ? profile.subscription.interval : undefined,
          error: err
        });
      }
      log.info('Successfully expired trial', { profileId });
      return callback(err);
    }
    
    if (err) {
      log.error('Failed to force subscription cancellation', {
        profileId,
        gw: profile.subscription ? profile.subscription.gw : undefined,
        plan: profile.subscription ? profile.subscription.plan : undefined,
        interval: profile.subscription ? profile.subscription.interval : undefined,
        error: err
      });
      return callback(err);
    }

    log.info('Successfully forced subscription cancellation', { profileId });

    if (isSubscribed) {
      this.customerLifecycle.chargeExpired(pg.owner, callback);
    } else {
      this.customerLifecycle.subscriptionExpired(pg.owner, callback);
    }
  }.bind(this));
};

module.exports = TaskDowngrader;
