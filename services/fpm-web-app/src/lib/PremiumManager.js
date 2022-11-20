/* jshint node: true */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { Types, States } = require('@fpm/constants');
const { createRedisClient } = require('@fpm/redis');
const { dbNotUpdated, Profile, FetchAccount, Audit, Post, ProfileCosts, PremiumCode, Premium } = require('@fpm/db');
const _ = require('lodash');
const async = require('async');
const moment = require('moment');
const humanizeDuration = require('humanize-duration');
const Warlock = require('node-redis-warlock');

var PremiumManager = module.exports = function PremiumManager(postScheduler) {

  this.postScheduler = postScheduler;

  /* jshint -W106 */
  this.warlock = new Warlock(createRedisClient(config, { detect_buffers: true }));

  this.lock = {
    ttl: config.get('premium:lock:ttl') || 5000,
    maxAttempts: config.get('premium:lock:maxAttempts') || 10,
    wait: config.get('premium:lock:wait') || 250
  };

  return this;
};

// prices in credits (dolar_price*1000000)
PremiumManager.prototype.costs = function(profile, callback, overrideNow) {
  var now = overrideNow || moment.utc();

  var costs = new ProfileCosts({
    pid: profile._id,
    day: now.clone().startOf('day').subtract(1, 'days').toDate(),
    metrics: {
      profile: {
        ids: [],
        count: 0,
        unitPrice: profile.premium.metrics.profile*1000000
      },
      connectedAccount: {
        ids: [],
        count: 0,
        unitPrice: profile.premium.metrics.connectedAccount*1000000
      },
      sourceAccount: {
        ids: [],
        count: 0,
        unitPrice: profile.premium.metrics.sourceAccount*1000000
      },
      member: {
        ids: [],
        count: 0,
        unitPrice: profile.premium.metrics.member*1000000
      }
    }
  });

  costs.metrics.sourceAccount.count = _.reduce(profile.accounts, function(sum, a) {
    if ((a.dir === 0 || a.dir === 2) && profile.isActiveAccount(a) && profile.isAccountRoutable(a)) { // in direction and enabled
      sum++;
      costs.metrics.sourceAccount.ids.push(a._id.toString());
    }
    return sum;
  }, 0) || 0;

  costs.metrics.member.ids = _.chain(profile.members).omit('owner').values().flatten().map(function(id) {
    return id.toString();
  }).uniq().value();
  costs.metrics.member.count = costs.metrics.member.ids.length;

  var add;
  profile.profiles.forEach(function(p) {
    add = true;
    if (profile.plan.name === 'PAYWYUM' || profile.plan.name === 'TRIAL') {
      add = now.diff(moment.utc(p.connectedAt), 'days') >= 1;
    }
    if (add) {
      costs.metrics.profile.ids.push(p._id.toString());
    }
  });
  costs.metrics.profile.count = costs.metrics.profile.ids.length;

  profile.accounts.forEach(function(a) {
    if (!profile.isAccountBlocked(a)) {
      costs.metrics.connectedAccount.ids.push(a._id.toString());
    }
  });
  costs.metrics.connectedAccount.count = costs.metrics.connectedAccount.ids.length;

  costs.metrics = _.mapValues(costs.metrics.toObject(), function(c) {
    c.monthly = c.unitPrice * c.count;
    c.daily = Math.floor(c.monthly / (365/12));
    costs.monthly += c.monthly;
    costs.daily += c.daily;
    return c;
  });

  costs.minimumBalance = costs.daily * 7;

  callback(null, costs);
};

// callback(err, {
//   isTrial: Boolean,
//   days: Number,
//   human: String
// })
PremiumManager.prototype.remainingDays = function(costs, balance, credits, callback, overrideNow) {

  credits = _.map(credits, function(c) {
    return {
      source: c.credit.source,
      available: c.credit.available,
      expiresAt: c.credit.expiresAt
    };
  });

  var trialsCount = _.reduce(credits, function(sum, c) {
    return sum + (c.source === 'trial' ? 1 : 0);
  }, 0) || 0;

  var fundsCount = _.reduce(credits, function(sum, c) {
    return sum + (c.source === 'tx' || c.source === 'affiliate' ? 1 : 0);
  }, 0) || 0;

  var isTrial = trialsCount > 0 && fundsCount === 0;
  var isFunded = fundsCount > 0 ? true : false;

  // setridit vzestupne, at se nejdrive vyuzije kredit s drive expirujicich kreditu
  credits.sort(function(a, b) {
    return moment.utc(a.expiresAt).unix() - moment.utc(b.expiresAt).unix();
  });

  var allocate, required;
  var day = overrideNow || moment.utc();
  var remainingDays = 0;
  var available = balance;
  var removeEmptyCredits = false;

  while(available > costs.daily) {
    required = costs.daily;
    removeEmptyCredits = false;

    for (var i = 0; i < credits.length; i++) {

      if (moment.utc(credits[i].expiresAt).isBefore(day)) {
        available -= credits[i].available;
        credits[i].available = 0;
      }

      allocate = Math.min(credits[i].available, required);

      available -= allocate;
      credits[i].available -= allocate;

      if (credits[i].available === 0) {
        removeEmptyCredits = true;
      }

      required -= allocate;
      if (required === 0) {
        remainingDays++;
        day = day.add(1, 'days');
        break;
      }
    }

    if (removeEmptyCredits) {
      credits = _.filter(credits, function(c) {
        return c.available > 0;
      });
    }
  }

  callback(null, {
    isTrial: isTrial,
    isFunded: isFunded,
    days: remainingDays,
    human: humanizeDuration(remainingDays*24*60*60*1000, {units: ['y', 'mo', 'w', 'd'], round: true})
  });
};

// callback(err, isOk)
PremiumManager.prototype.checkBalance = function(profile, metricName, callback, overrideNow) {

  if (profile.plan.name !== 'PAYWYU') {
    return callback(null, true);
  }

  var metrics = profile.premium && profile.premium.metrics;
  var costMonthly = metrics && metrics[metricName];
  if (costMonthly === undefined || costMonthly === null) {
    return callback(null, true);
  }

  var costDaily = Math.floor(costMonthly * 1000000 / (365/12));

  this.balance(profile._id, function(err, balance) {
    if (err) {
      return callback(err);
    }
    this.costs(profile, function(err, costs) {
      if (err || !costs) {
        return callback(err);
      }
      var newBalance = balance - costDaily;
      var isOk = newBalance > costs.minimumBalance;
      callback(null, isOk);
    }.bind(this), overrideNow);
  }.bind(this), overrideNow);
};

PremiumManager.prototype.reconcileDay = function(profile, profileCosts, callback, overrideNow) {
  this._lock(profile._id, function(err, unlock) {
    if (err) {
      unlock();
      return callback(err);
    }
    this._reconcileDay(profile, profileCosts, function(err, profileCosts, debits, balance, credits) {
      unlock();
      callback(err, profileCosts, debits, balance, credits);
    }.bind(this), overrideNow);
  }.bind(this));
};


PremiumManager.prototype.debit = function(profile, metric, metricIds, callback, overrideNow) {
  this._lock(profile._id, function(err, unlock) {
    if (err) {
      unlock();
      return callback(err);
    }
    Premium.debit(profile, metric, metricIds, function(err, premium) {
      unlock();
      callback(err, premium);
    }.bind(this), overrideNow);
  }.bind(this));
};

// callback(err, balance in credits, list of available credits)
PremiumManager.prototype.balance = function(profileId, callback, overrideNow) {
  var pid = profileId._id || profileId;
  this._lock(pid, function(err, unlock) {
    if (err) {
      unlock();
      return callback(err);
    }
    Premium.balance(pid, function(err, balance, credits) {
      unlock();
      callback(err, balance, credits);
    }.bind(this), overrideNow);
  }.bind(this));
};

// amount in dolars
PremiumManager.prototype.credit = function(profileId, amount, source, sourceId, expireInDays, callback, overrideNow) {
  var pid = profileId._id || profileId;
  this._lock(pid, function(err, unlock) {
    if (err) {
      unlock();
      return callback(err);
    }
    Premium.credit(pid, amount, source, sourceId, expireInDays, function(err, premium) {
      if (err) {
        unlock();
        return callback(err);
      }
      this._unblockProfileChecker(pid, function(err) {
        unlock();
        callback(err, premium);
      }.bind(this), overrideNow);
    }.bind(this), overrideNow);
  }.bind(this));
};

PremiumManager.prototype.creditPromoCode = function(code, profile, callback, overrideNow) {
  this._lock(profile._id, function(err, unlock) {
    if (err) {
      unlock();
      return callback(err);
    }
    PremiumCode.applyToProfile(code, profile, function(err, premiumCode, premium) {
      if (err) {
        unlock();
        return callback(err);
      }
      this._unblockProfileChecker(profile._id, function(err) {
        unlock();
        callback(err, premium, premiumCode);
      }.bind(this), overrideNow);
    }.bind(this), overrideNow);
  }.bind(this));
};

// affiliateCommision = AffiliateCommision.commision[?]
PremiumManager.prototype.creditAffiliate = function(affiliateCommision, profile, callback, overrideNow) {
  this._creditTx('affiliate', affiliateCommision.commision, affiliateCommision.tx, profile, callback, overrideNow);
};

PremiumManager.prototype.creditTransaction = function(tx, profile, callback, overrideNow) {
  this._creditTx('tx', tx.net, tx._id, profile, callback, overrideNow);
};

PremiumManager.prototype.newTrial = function(profileId, callback, overrideNow) {
  this._newTrial(profileId, 'signup', callback, overrideNow);
};

PremiumManager.prototype.newFreeMigratedToTrial = function(profileId, callback, overrideNow) {
  this._newTrial(profileId, 'migrationfromfree', callback, overrideNow);
};

// callback(err, costs, debits)
PremiumManager.prototype._reconcileDay = function(profile, profileCosts, callback, overrideNow) {
  var now = overrideNow || moment.utc();
  Premium.balance(profile, function(err, balance, credits) {
    if (err) {
      return callback(err);
    }

    var debits = [];
    var metrics = _.pairs(profileCosts.metrics.toObject());
    var cost = profileCosts.daily;
    var createdFrom = profileCosts.day;
    var createdUntil = moment.utc(profileCosts.day).add(1, 'days').toDate();

    if (cost === 0) {
      return callback(null, profileCosts, debits, balance, credits);
    }

    async.eachLimit(metrics, 4, function(pair, cb) {
      if (pair[1].daily <= 0 || pair[1].ids.length === 0) {
        return cb();
      }

      // pokusit se najit debit za pripojeni uctu pro kazdy z nalezenych
      // uctu a provest debit pouze pro ty, pro nez jiz debit za dany den neexistuje
      var ids = [];

      async.eachLimit(pair[1].ids, 4, function(metricId, cb2) {
        Premium.findOne({
          pid: profile._id,
          createdAt: {$gte: createdFrom, $lt: createdUntil},
          'debit.metric': pair[0],
          'debit.metricIds': {$in: [metricId]}
        }, function(err, debit) {
          if (err || !debit) {
            ids.push(metricId);
            return cb2(err);
          }
          cost += debit.amount;
          debits.push(debit);
          cb2();
        }.bind(this));
      }.bind(this), function(err) {
        if (err) {
          return cb(err);
        }
        pair[1]._ids = ids;
        cb();
      }.bind(this));
    }.bind(this), function(err) {
      if (err) {
        return callback(err);
      }

      cost = Math.max(cost, 0);

      if (balance < cost) {
        return callback({
          code: 'INSUFFICIENT_FUNDS',
          amount: cost,
          balance: balance,
          message: 'Insufficient funds'});
      }

      async.eachSeries(metrics, function(pair, cb) {
        var ids = pair[1]._ids || [];
        delete pair[1]._ids;

        if (pair[1].daily <= 0 || ids.length === 0) {
          return cb();
        }

        Premium.debit(profile, pair[0], ids, function(err, debit) {
          if (debit) {
            debits.push(debit);
          }
          cb(err);
        }.bind(this), now);
      }.bind(this), function(err) {
        callback(err, profileCosts, debits, balance, credits);
      }.bind(this));
    }.bind(this));
  }.bind(this), now);
};

PremiumManager.prototype._creditTx = function(configSection, fixedPrice, txId, profile, callback, overrideNow) {
  this._lock(profile._id, function(err, unlock) {
    if (err) {
      unlock();
      return callback(err);
    }
    var expireInDays = config.get('premium:'+configSection+':expireInDays');
    Premium.credit(profile._id, fixedPrice/100, configSection, txId.toString(), expireInDays, function(err, premium) {
      if (err) {
        unlock();
        return callback(err);
      }
      this._unblockProfileChecker(profile._id, function(err) {
        unlock();
        callback(err, premium);
      }.bind(this), overrideNow);
    }.bind(this), overrideNow);
  }.bind(this));
};

PremiumManager.prototype._newTrial = function(profileId, configSection, callback, overrideNow) {
  var expireInDays = config.get('premium:trial:'+configSection+':expireInDays');
  var amount = config.get('premium:trial:'+configSection+':credit');
  this.credit(profileId, amount, 'trial', configSection, expireInDays, callback, overrideNow);
};

PremiumManager.prototype._lock = function(profileId, callback) {
  this.warlock.optimistic('premium:'+profileId.toString(),
    this.lock.ttl, this.lock.maxAttempts, this.lock.wait, callback);
};

PremiumManager.prototype._unblockProfileChecker = function(profileId, callback, overrideNow) {
  var pid = profileId._id || profileId;
  Profile.findOne({_id: pid}, function(err, profile) {
    if (err || !profile) {
      return callback(err || {error:{message: 'Profile '+pid.toString()+' not found'}});
    }
    this.costs(profile, function(err, costs) {
      if (err || !costs) {
        return callback(err);
      }
      Premium.balance(pid, function(err, balance/*, credits*/) {
        if (err || !costs) {
          return callback(err);
        }
        if (costs.daily > balance) {
          return callback();
        }
        this._unblockProfile(profile, callback);
      }.bind(this), overrideNow);
    }.bind(this));
  }.bind(this));
};

PremiumManager.prototype._unblockProfile = function(profile, callback) {

  var tasks = [
    function(cb2) {
      Profile.update({
        _id: profile._id
      }, {
        $set: {
          'state': States.profile.enabled.code
        }
      }, function(err, updated) {
        if (err || dbNotUpdated(updated)) {
          return cb2(err || {error:{message:'Failed to enable profile '+profile._id.toString()}});
        }
        cb2();
      });
    }.bind(this)
  ];

  profile.accounts.forEach(function(account) {
    if (!profile.isAccountBlocked(account)) {
      return;
    }

    tasks.push(function(cb) {

      var subtasks = [];

      if (account.network === Types.network.google.code && (account.account === Types.account.profile.code || account.account === Types.account.page.code)) {
        subtasks.push(function(cb2) {
          FetchAccount.unblock(account, function(err) {
            if (err) {
              log.error('Failed to unblock FetchAccount', {
                profileId: profile._id.toString(),
                accountId: account._id.toString(),
                error: err});
            }
            cb2(err);
          });
        });
      }

      subtasks.push(function(cb2) {
        Profile.update({
          'accounts._id': account._id
        }, {
          $set: {
            'accounts.$.state': States.account.enabled.code,
            'accounts.$.stateUpdatedAt': moment.utc().toDate()
          }
        }, function(err, updated) {
          if (err || dbNotUpdated(updated)) {
            return cb2(err || {error:{message:'Failed to enable publishing for queue '+account._id.toString()}});
          }
          cb2();
        });
      }.bind(this));

      subtasks.push(function(cb2) {
        Post.unblockAll(account, function(err) {
          if (err) {
            return cb2(err);
          }
          this.postScheduler.rescheduleAll(account._id, function(err/*, acc, updatedPosts*/) {
            if (err) {
              log.error('Failed to reschedule posts after account unblock', {
                profileId: profile._id.toString(),
                accountId: account._id.toString(),
                error: err });
            }
            cb2();
          }.bind(this));
        }.bind(this));
      }.bind(this));

      async.parallel(subtasks, cb);
    }.bind(this));
  }.bind(this));

  if (!tasks.length) {
    return callback();
  }

  async.series(tasks, function(err) {
    if (err) {
      log.error('Failed to unblock profile', {
        profileId: profile._id.toString(),
        error: err
      });
    } else {
      log.info('Profile unblocked', {
        profileId: profile._id.toString()
      });

      Audit.profile('profile:unblocked', null, profile._id);
    }

    callback();
  }.bind(this));
};
