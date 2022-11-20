/* jshint node: true */
'use strict';

const log = require('@fpm/logging').default;
const { States } = require('@fpm/constants');
const { dbUpdatedCount, dbNotUpdated, Profile, Post } = require('@fpm/db');
const { accountRequiresReconnect } = require('@fpm/events');
const util = require('util');
const async = require('async');
const moment = require('moment');
const _ = require('lodash');
const ScheduledTask = require('../lib/ScheduledTask');

var TaskCheckExpirations = module.exports = function TaskCheckExpirations() {
  ScheduledTask.call(this, 'checkExpirations');
  return this;
};
util.inherits(TaskCheckExpirations, ScheduledTask);

TaskCheckExpirations.prototype.run = function(callback) {
  var loaded = 0,
      limit = 500,
      skip = 0;

  async.doWhilst(function(cb) {
    this._findExpirations(skip, limit, function(err, expirations, profilesCount) {
      loaded = profilesCount;
      if (!err && expirations && expirations.length > 0) {
        async.eachLimit(expirations, 4, this._processExpiration.bind(this), cb);
      } else {
        cb(err);
      }
    }.bind(this));
  }.bind(this), function() {
    skip += limit;
    return loaded > 0;
  }, callback);
};

TaskCheckExpirations.prototype._findExpirations = function(skip, limit, callback) {

  var expirations = [],
      tm = new Date(),
      now = moment.utc(),
      lookupStates = [States.account.enabled.code, States.account.disabled.code, States.account.reconnectRequired.code];

  function isExpireNotificationRequired(account) {
    var exp = account.expire ? moment.utc(account.expire).unix() : null;
    return _.contains(lookupStates, account.state) && exp && exp < now.unix();
  }

  Profile.find({
    'accounts.state': {$in: lookupStates},
    'accounts.expire': {$lt: now.toDate()}
  }, null, {
    skip: skip,
    limit: limit
  }, function(err, profiles) {
    if (err) {
      log.error('Failed to find accounts with expired access token', {
        time: new Date() - tm,
        error: err});
    } else {
      profiles = profiles || [];

      log.info('Found profiles with accounts with expired access token', {
        count: profiles.length,
        time: new Date() - tm});

      profiles.forEach(function(p) {
        if (p.accounts && p.accounts.length > 0) {
          p.accounts.forEach(function(a) {
            if (isExpireNotificationRequired(a)) {
              expirations.push({
                profile: p,
                account: a
              });
            }
          });
        }
      });
    }

    log.info('Extracted accounts with access token expiration', {
      count: expirations.length,
      time: new Date() - tm});

    callback(null, expirations, profiles && profiles.length || 0);
  });
};

TaskCheckExpirations.prototype._processExpiration = function(expiration, callback) {
  this._disableAccount(expiration.profile, expiration.account, callback);
};

TaskCheckExpirations.prototype._disableAccount = function(profile, account, callback) {

  var profileId = profile._id.toString(),
      accountId = account._id.toString();

  Profile.update({'accounts._id': accountId}, {
    $set: {
      'accounts.$.token': null,
      'accounts.$.expire': null,
      'accounts.$.state': States.account.reconnectRequired.code,
      'accounts.$.stateUpdatedAt': moment.utc().toDate()
    }
  }, function(err, updated) {
    if (dbUpdatedCount(updated)) {

      Post.blockAll(account);

      accountRequiresReconnect({ profile, account }).then(() => {
        log.info('Account requires reconnect event queued', {
          profileId: profile._id.toString(),
          accountId: account._id.toString()
        });
      }, error => {
        log.error('Failed to queue Account requires reconnect event', {
          profileId: profile._id.toString(),
          accountId: account._id.toString(),
          message: error.toString(),
          error
        });
      });
    }
    if (err || dbNotUpdated(updated)) {
      log.error('Failed to disable expired account', {
        accountId: accountId,
        profileId: profileId,
        updated: updated,
        error: err});
    } else {
      log.info('Disabled expired account', {
        accountId: accountId,
        profileId: profileId,
        updated: updated
      });
    }

    callback();
  }.bind(this));
};
