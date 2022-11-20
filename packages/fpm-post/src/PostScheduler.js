const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { Types, States } = require('@fpm/constants');
const { createRedisClient } = require('@fpm/redis');
const { dbNotUpdated, ObjectId, Profile, Post } = require('@fpm/db');
const async = require('async');
const moment = require('moment-timezone');
const Warlock = require('node-redis-warlock');

class PostScheduler {
  constructor() {
    /* jshint -W106 */
    this.rclient = createRedisClient(config, { detect_buffers: true });
    this.warlock = new Warlock(this.rclient);
    this.lock = {
      ttl: config.get('lock:account:ttl') || 5000,
      maxAttempts: config.get('lock:account:maxAttempts') || 10,
      wait: config.get('lock:account:wait') || 250
    };
  }

  static initiateAccountScheduling(account, user) {
    var t,
      times = [],
      schedule = [];

    function genTm(base, maxPlus) {
      return base + Math.floor(Math.random() * (maxPlus + 1));
    }

    function addTime(startHour, startMinute, startDiff, nextOffs, nextDiff, nextCount) {
      t = genTm(startHour * 60 + startMinute, startDiff);
      times.push(t);
      while (nextCount-- > 0) {
        t = genTm(t + nextOffs, nextDiff);
        times.push(t);
      }
    }

    switch (account.network) {
      case Types.network.linkedin.code: // 4 reposty
        addTime(7, 20, 20, 40, 10, 1);
        addTime(17, 20, 20, 40, 10, 1);
        break;
      case Types.network.twitter.code: // 12 repostu
        addTime(7, 20, 20, 45, 10, 3);
        addTime(13, 30, 30, 60, 10, 4);
        addTime(19, 30, 30, 60, 10, 2);
        break;
      case Types.network.facebook.code: // 8 repostu
        addTime(6, 30, 30, 60, 10, 1);
        addTime(13, 30, 30, 60, 10, 5);
        break;
      case Types.network.appnet.code:
      case Types.network.tumblr.code: // 4 reposty
        addTime(7, 30, 30, 60, 10, 3);
        break;
      case Types.network.google.code: // 3 reposty
        addTime(9, 0, 60, 20, 15, 2);
        break;
      case Types.network.pinterest.code: // 8 repostu
        addTime(8, 30, 30, 60, 10, 1);
        addTime(16, 0, 30, 60, 10, 5);
        break;
      case Types.network.instagram.code: // every 15 minutes
        const minIntervalBetweenPosts = 15; // minutes
        const plusRandomInterval = 5; // minutes
        addTime(0, 0, 0, minIntervalBetweenPosts, plusRandomInterval, Math.floor((24 * 60) / (minIntervalBetweenPosts + plusRandomInterval)));
        break;
    }

    for (var i = 0; i < 7; i++) {
      for (var j = 0; j < times.length; j++) {
        schedule.push(i * 24 * 60 + times[j]);
      }
    }

    account.scheduling = account.scheduling || {};
    account.scheduling.schedules = [schedule];
    account.scheduling.offs = 0;
    account.scheduling.tz = account.scheduling.tz || user.tz || 'UTC';
    account.scheduling.week = moment
      .tz(account.scheduling.tz)
      .startOf('month')
      .isoWeekday(1)
      .startOf('day')
      .clone()
      .tz('UTC')
      .toDate();
  }

  // blokace publikovani na ucet do urciteho data
  block(accountId, blockedUntil, callback, testingNow) {
    accountId = new ObjectId(accountId.toString());

    var now = testingNow || moment.utc();

    Profile.update(
      {
        'accounts._id': accountId
      },
      {
        $set: {
          'accounts.$.blockedUntil': blockedUntil.toDate()
        }
      },
      function(err, updated) {
        if (err || dbNotUpdated(updated)) {
          return callback(
            err || { error: { message: 'Failed to block publishing for queue ' + accountId.toString() } }
          );
        }

        this._lockAndFetchAccount(
          accountId,
          function(err, profile, account, unlock) {
            if (err) {
              return callback(err);
            }
            this._rescheduleAll(
              profile,
              account,
              function(err, updatedPosts) {
                if (err) {
                  unlock();
                  return callback(err);
                }

                updatedPosts = updatedPosts || [];

                var foundPosts = 0;

                async.doWhilst(
                  function(cb) {
                    Post.find(
                      {
                        aid: accountId,
                        state: { $lt: States.post.publishing.code, $gt: States.post.scheduledByScheduler.code },
                        publishAt: { $lt: blockedUntil.toDate() },
                        blockedAt: null
                      },
                      '_id publishAt lockedUntil state',
                      { limit: 25 },
                      function(err, posts) {
                        foundPosts = (posts && posts.length) || 0;

                        if (err || !posts) {
                          return cb(err);
                        }

                        updatedPosts = updatedPosts.concat(posts);

                        async.eachLimit(
                          posts,
                          8,
                          function(post, cb2) {
                            var publishAt = post.publishAt && moment.utc(post.publishAt),
                              publishAtDiff = (publishAt && publishAt.diff(now, 'seconds')) || 0;

                            if (publishAtDiff < 0) {
                              publishAtDiff = Math.abs(publishAtDiff) % (24 * 60 * 60);
                            }
                            if (publishAt) {
                              publishAt = blockedUntil.clone().add(publishAtDiff, 'seconds').toDate();
                            } else {
                              publishAt = blockedUntil.toDate();
                            }

                            var $set = {
                              publishAt: publishAt
                            };
                            post.publishAt = $set.publishAt;
                            post.update({ $set: $set }, cb2);
                          },
                          cb
                        );
                      }.bind(this)
                    );
                  }.bind(this),
                  function() {
                    return foundPosts > 0;
                  },
                  function(err) {
                    unlock();
                    callback(err, account, updatedPosts);
                  }
                );
              },
              testingNow
            );
          }.bind(this)
        );
      }.bind(this)
    );
  }

  // preplanovani vsech schedulerem naplanovanych postu
  rescheduleAll(accountId, callback, testingNow) {
    this._lockAndFetchAccount(
      accountId,
      function(err, profile, account, unlock) {
        if (err) {
          return callback(err);
        }
        this._rescheduleAll(
          profile,
          account,
          function(err, updatedPosts) {
            unlock();
            callback(err, account, updatedPosts);
          },
          testingNow
        );
      }.bind(this)
    );
  }

  // ziskani nejblizsiho mozneho publikacniho casu
  firstTime(accountId, callback, testingNow) {
    this._lockAndFetchAccount(
      accountId,
      function(err, profile, account, unlock) {
        if (err) {
          return callback(err);
        }
        this._firstTime(
          profile,
          account,
          function(err, scheduledTime, updatedPosts) {
            unlock();
            callback(err, scheduledTime, account, updatedPosts);
          },
          testingNow
        );
      }.bind(this)
    );
  }

  // ziskani dalsiho volneho publikacniho casu
  nextTime(accountId, callback, testingNow) {
    this._lockAndFetchAccount(
      accountId,
      function(err, profile, account, unlock) {
        if (err) {
          return callback(err);
        }
        this._nextTime(
          account,
          function(err, scheduledTime) {
            unlock();
            callback(err, scheduledTime, account);
          },
          testingNow
        );
      }.bind(this)
    );
  }

  // ziskani dalsiho volneho publikacniho casu
  movePost(post, newIndex, callback) {
    this._lockAndFetchAccount(
      post.aid,
      function(err, profile, account, unlock) {
        if (err) {
          return callback(err);
        }
        this._movePost(post, newIndex, function(err, post, updatedPosts) {
          unlock();
          callback(err, post, account, updatedPosts);
        });
      }.bind(this)
    );
  }

  _fetchAccountScheduling(accountId, callback) {
    var aid = new ObjectId(accountId.toString());
    Profile.findOne(
      { 'accounts._id': aid },
      {
        _id: 1,
        scheduling: 1,
        blockedUntil: 1,
        accounts: {
          $elemMatch: { _id: aid }
        }
      },
      function(err, profile) {
        if (err || !profile) {
          return callback(err || { error: { message: 'Team with queue ' + accountId.toString() + ' not found' } });
        }
        var account;
        for (var i = 0; i < profile.accounts.length; i++) {
          if (profile.accounts[i]._id.toString() === accountId.toString()) {
            account = profile.accounts[i];
            break;
          }
        }
        callback(null, profile, account);
      }.bind(this)
    );
  }

  _lockAccount(accountId, callback) {
    this.warlock.optimistic(
      'account:' + accountId.toString(),
      this.lock.ttl,
      this.lock.maxAttempts,
      this.lock.wait,
      callback
    );
  }

  _fetchAccountPostsScheduledByScheduler(accountId, callback) {
    Post.find(
      { state: States.post.scheduledByScheduler.code, aid: accountId.toString() },
      '_id publishAt',
      { sort: { publishAt: 1 } },
      callback
    );
  }

  _scheduleReset(account, persistChanges, callback, testingNow) {
    account.scheduling.tz = account.scheduling.tz || 'UTC';
    account.scheduling.week = moment
      .tz(testingNow, account.scheduling.tz)
      .startOf('month')
      .isoWeekday(1)
      .startOf('day')
      .clone()
      .tz('UTC')
      .toDate();
    account.scheduling.offs = 0;

    if (persistChanges) {
      this._schedulePersist(account, callback);
    } else {
      if (callback) {
        callback();
      }
    }
  }

  _schedulePersist(account, callback) {
    Profile.update(
      {
        'accounts._id': account._id
      },
      {
        $set: {
          'accounts.$.scheduling.tz': account.scheduling.tz,
          'accounts.$.scheduling.offs': account.scheduling.offs,
          'accounts.$.scheduling.week': account.scheduling.week
        }
      },
      function(err, updated) {
        if (err || dbNotUpdated(updated)) {
          return callback(
            err || { error: { message: 'Failed to persist queue ' + account._id.toString() + ' scheduling changes' } }
          );
        }
        callback();
      }
    );
  }

  // vyzaduje globalni zamek na account
  _scheduleNextTime(account, persistChanges, callback, testingNow) {
    account.scheduling.tz = account.scheduling.tz || 'UTC';
    account.scheduling.offs = account.scheduling.offs || 0;

    // pokud neni definovan week nebo week neni prvni pondeli v mesici tak proved opravu
    var weekDay =
        (account.scheduling.week && moment.tz(account.scheduling.week, account.scheduling.tz).isoWeekday()) || -1,
      isScheduleResetRequired = weekDay !== 1;

    log.debug('PostScheduler next time', {
      accountId: account._id.toString(),
      week: (account.scheduling.week && moment.utc(account.scheduling.week).format()) || null,
      tz: account.scheduling.tz,
      offs: account.scheduling.offs,
      weekDay: weekDay,
      isScheduleResetRequired: isScheduleResetRequired
    });

    if (isScheduleResetRequired) {
      log.debug('Reseting account schedule, week not monday', {
        accountId: account._id.toString(),
        week: account.scheduling.week,
        tz: account.scheduling.tz,
        offs: account.scheduling.offs,
        weekDay: weekDay
      });

      this._scheduleReset(account, false, null, testingNow);
    }

    var processAt,
      offs,
      tz = account.scheduling.tz,
      now = moment.tz(testingNow, tz),
      week = moment.tz(account.scheduling.week, tz),
      blockedUntil = (account.blockedUntil && moment.tz(account.blockedUntil, tz)) || null,
      times = account.scheduling.schedules.reduce((r, v) => r.concat(v), []).sort((a, b) => a - b);

    if (!times.length) {
      return callback();
    }

    if (week.isAfter(now)) {
      log.debug('Reseting account schedule, week in the future', {
        accountId: account._id.toString(),
        invalidWeek: week.format(),
        now: now.format(),
        week: account.scheduling.week,
        tz: account.scheduling.tz,
        offs: account.scheduling.offs
      });

      this._scheduleReset(account, false, null, testingNow);

      week = moment.tz(account.scheduling.week, tz);
    }

    week = week.add(Math.floor(account.scheduling.offs / times.length), 'weeks');

    do {
      offs = account.scheduling.offs++ % times.length;

      processAt = week.clone().add(times[offs], 'minutes');

      if (account.scheduling.offs % times.length === 0) {
        week = week.add(1, 'weeks');
      }
    } while (processAt.isBefore(now) || (blockedUntil && processAt.isBefore(blockedUntil)));

    processAt = processAt.clone().tz('UTC');

    if (!persistChanges) {
      return callback(null, processAt);
    }

    this._schedulePersist(account, function(err) {
      if (err) {
        return callback(err);
      }
      callback(null, processAt);
    });
  }

  // preplanovani vsech naplanovanych prispevku
  _rescheduleAll(profile, account, callback, testingNow) {
    this._scheduleReset(
      account,
      false,
      function(err) {
        if (err) {
          return callback(err);
        }

        this._fetchAccountPostsScheduledByScheduler(
          account._id,
          function(err, posts) {
            if (err) {
              return callback(err);
            }

            async.eachSeries(
              posts,
              function(post, cb) {
                this._scheduleNextTime(
                  account,
                  false,
                  function(err, scheduledTime) {
                    if (err) {
                      return cb(err);
                    }

                    if (scheduledTime) {
                      post.publishAt = scheduledTime.toDate();
                    }

                    cb();
                  }.bind(this),
                  testingNow
                );
              }.bind(this),
              function(err) {
                if (err) {
                  return callback(err);
                }

                async.eachLimit(
                  posts,
                  8,
                  function(post, cb) {
                    Post.update({ _id: post._id }, { $set: { publishAt: post.publishAt } }, cb);
                  },
                  function(err) {
                    if (err) {
                      return callback(err);
                    }

                    this._schedulePersist(
                      account,
                      function(err) {
                        if (err) {
                          return callback(err);
                        }

                        callback(null, posts);
                      }.bind(this)
                    );
                  }.bind(this)
                );
              }.bind(this)
            );
          }.bind(this)
        );
      }.bind(this),
      testingNow
    );
  }

  // ziskani nejblizsiho mozneho publikacniho casu
  _firstTime(profile, account, callback, testingNow) {
    this._scheduleReset(
      account,
      false,
      function(err) {
        if (err) {
          return callback(err);
        }

        async.parallel(
          {
            // ziskani schedulerem naplanovanych prispevku
            posts: async.apply(this._fetchAccountPostsScheduledByScheduler.bind(this), account._id),
            // ziskani volneho cashoveho slotu pro naplanovani noveho prispevku
            firstScheduledTime: function(cb) {
              this._scheduleNextTime(account, false, cb, testingNow);
            }.bind(this)
          },
          function(err, results) {
            if (err) {
              return callback(err);
            }

            var posts = results.posts,
              firstScheduledTime = results.firstScheduledTime;

            async.eachSeries(
              posts,
              function(post, cb) {
                this._scheduleNextTime(
                  account,
                  false,
                  function(err, scheduledTime) {
                    if (err) {
                      return cb(err);
                    }

                    if (scheduledTime) {
                      post.publishAt = scheduledTime.toDate();
                    }

                    cb();
                  }.bind(this),
                  testingNow
                );
              }.bind(this),
              function(err) {
                if (err) {
                  return callback(err);
                }

                async.eachLimit(
                  posts,
                  8,
                  function(post, cb) {
                    Post.update({ _id: post._id }, { $set: { publishAt: post.publishAt } }, cb);
                  },
                  function(err) {
                    if (err) {
                      return callback(err);
                    }

                    this._schedulePersist(
                      account,
                      function(err) {
                        if (err) {
                          return callback(err);
                        }
                        callback(null, firstScheduledTime, posts);
                      }.bind(this)
                    );
                  }.bind(this)
                );
              }.bind(this)
            );
          }.bind(this)
        );
      }.bind(this),
      testingNow
    );
  }

  // ziskani dalsiho volneho publikacniho casu
  _nextTime(account, callback, testingNow) {
    this._scheduleNextTime(account, true, callback, testingNow);
  }

  // ziskani dalsiho volneho publikacniho casu
  _movePost(post, newIndex, callback) {
    this._fetchAccountPostsScheduledByScheduler(
      post.aid,
      function(err, posts) {
        if (err) {
          return callback(err);
        }

        if (newIndex < 0 || newIndex >= posts.length) {
          return callback({ error: { message: 'Invalid queue position ' + newIndex } });
        }

        var i,
          oldIndex = -1;

        if (posts.length > 1) {
          for (i = 0; i < posts.length; i++) {
            if (posts[i]._id.toString() === post._id.toString()) {
              oldIndex = i;
              break;
            }
          }
        }

        if (oldIndex < 0) {
          return callback({ error: { message: 'Post ' + post._id.toString() + ' not found in queue' } });
        }

        if (oldIndex === newIndex) {
          return callback({
            error: { message: 'Post ' + post._id.toString() + ' is already at requested position in the queue' }
          });
        }

        var scheduledTimes = [];

        posts = posts.slice(Math.min(newIndex, oldIndex), Math.max(newIndex, oldIndex) + 1);

        for (i = 0; i < posts.length; i++) {
          scheduledTimes.push(posts[i].publishAt);
        }

        if (oldIndex < newIndex) {
          posts.push(posts.shift());
        } else {
          posts.unshift(posts.pop());
        }

        for (i = 0; i < posts.length; i++) {
          posts[i].publishAt = scheduledTimes[i];

          if (posts[i]._id.toString() === post._id.toString()) {
            post.publishAt = posts[i].publishAt;
          }
        }

        async.eachLimit(
          posts,
          8,
          function(post, cb) {
            Post.update({ _id: post._id }, { $set: { publishAt: post.publishAt } }, cb);
          },
          function(err) {
            if (err) {
              return callback(err);
            }

            callback(null, post, posts);
          }.bind(this)
        );
      }.bind(this)
    );
  }

  _lockAndFetchAccount(accountId, callback) {
    this._lockAccount(
      accountId,
      function(err, unlock) {
        if (err) {
          return callback(err);
        }
        this._fetchAccountScheduling(
          accountId,
          function(err, profile, account) {
            if (err) {
              unlock();
              return callback(err);
            }
            callback(null, profile, account, unlock);
          }.bind(this)
        );
      }.bind(this)
    );
  }
}

module.exports = PostScheduler;
