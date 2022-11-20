/* jshint node: true */
'use strict';

const log = require('@fpm/logging').default;
const { dbUpdatedCount, dbNotUpdated, Profile, User } = require('@fpm/db');
const _ = require('underscore');
const async = require('async');
const tools = require('../lib/tools');

module.exports = function(app) {

  app.put('/1/user/info', tools.tokenRequired, function(req, res) {
    var tasks = [],
        userUpdate = {},
        user = req.user;

    if (req.body.aid !== undefined && req.body.aid !== null && req.body.aid) {
      userUpdate.$addToSet = {'aids': req.body.aid};
    }

    if (req.body.tz !== undefined && req.body.tz !== null && req.body.tz) {
      userUpdate.$set = {'tz': req.body.tz};

      var profiles = user.profiles && user.profiles.owner;
      if (profiles && profiles.length) {
        tasks.push(function(cb) {
          async.each(profiles, function(profileId, cb3) {
            var updated;

            async.doWhilst(
              function(cb2) {

                updated = 0;

                Profile.findOne({
                  '_id': profileId
                }, {
                  'accounts._id': 1,
                  'accounts':{$elemMatch: {'scheduling.tz':{$exists:false}}}
                }, function(err, profile) {

                  if (profile && profile.accounts.length) {

                    var accountId = profile.accounts[0]._id;

                    Profile.update({
                      '_id': profileId,
                      'accounts._id': accountId
                    }, {
                      $set: {'accounts.$.scheduling.tz': req.body.tz}
                    }, function(err, accountUpdated) {
                      if (err) {
                        log.error('Failed to update accounts with new timezone', {
                          userId: user._id.toString(),
                          profileId: profileId.toString(),
                          accountId: accountId.toString(),
                          body: req.body,
                          error: err
                        });
                      }
                      updated = dbUpdatedCount(accountUpdated);
                      cb2();
                    });
                  } else {
                    if (err) {
                      log.error('Failed find profile with accounts for timezone update', {
                        userId: user._id.toString(),
                        profileId: profileId.toString(),
                        body: req.body,
                        error: err
                      });
                    }
                    cb2();
                  }
                });
              },
              function () { return updated > 0; },
              cb3);
          }, cb);
        });
      }
    }

    if (_.size(userUpdate)) {
      tasks.push(function(cb) {
        User.update({_id: user._id}, userUpdate, function(err, updated) {
          if (err || dbNotUpdated(updated)) {
            log.error('Failed update user info', {
              userId: user._id.toString(),
              updated: updated && updated.result,
              body: req.body,
              error: err
            });
          }
          cb();
        });
      });
    }

    if (tasks.length) {
      async.parallel(tasks);
    }

    res.status(200).end();
  });
};
