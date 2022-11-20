'use strict';

process.env.NODE_ENV = 'test';

var mongoose = require('mongoose'),
    moment = require('moment-timezone'),
    async = require('async'),
    expect = require('chai').expect,
    ObjectId = mongoose.Types.ObjectId,
    _ = require('underscore'),
    States = require('../src/lib/States'),
    config = require('../src/lib/config').config,
    PostScheduler = require('../src/lib/PostScheduler'),
    Post = require(__dirname+'/../src/models/Post'),
    Profile = require(__dirname+'/../src/models/Profile').Profile;

describe('PostScheduler', function() {

  require('chai').config.includeStack = true;

  try { mongoose.connect(config.get('db:url'), config.get('db:options')); } catch(err) {}

  config.set('lock:account:ttl', 500);

  var postScheduler = new PostScheduler();

  function removeAll(model, done) {
    model.find({}, function(err, items) {
      if (items && items.length > 0) {
        async.forEach(items, function(item, callback) {
          item.remove(callback);
        }, function(err){
          done();
        });
      } else {
        done();
      }
    });    
  }

  beforeEach(function(done) {
    async.parallel([
      async.apply(removeAll, Post),
      async.apply(removeAll, Profile)
    ], done);
  });

  it('should convert non monday week to monday', function(done) {
    var tz = 'America/Los_Angeles',
        nowStr = '2015-04-02 14:00',
        now = moment.tz(nowStr, tz),
        p = new Profile({
          _id: new ObjectId(),
          accounts:[{
            _id: new ObjectId(),
            scheduling: {
              tz:         tz,
              week:       now,
              offs:       0,
              stype:      't',
              schedules:  [
                [429,529,629,720,820,920,1020,1120,1221,1869,1969,2069,2160,2260,2360,2460,2560,2661,3309,3409,3509,3600,3700,3800,3900,4000,4101,4749,4849,4949,5040,5140,5240,5340,5440,5541,9069,9169,9269,9360,9460,9560,9660,9760,9861], 
                [6181,6281,6381,6482,6582,6683],
                [7743,7844,7944,8046,8146], 
                []]
            }
          }]
        });

    function _next(expectedProcessAt, expectedOffs, expectedWeek, cb) {
      postScheduler._scheduleNextTime(p.accounts[0], false, function(err, processAt) {
        expect(err).to.be.null;
        expect(processAt).to.be.ok;
        expect(processAt.tz(tz).format()).to.eq(expectedProcessAt);
        expect(p.accounts[0].scheduling.offs).to.eq(expectedOffs);
        expect(moment.utc(p.accounts[0].scheduling.week).tz(tz).format()).to.eq(expectedWeek);
        cb();
      }, nowStr);
    }

    function next(expectedProcessAt, expectedOffs, expectedWeek) {
      return async.apply(_next, expectedProcessAt, expectedOffs, expectedWeek);
    }

    p.save(function(err, p) {
      expect(err).to.be.null;
      expect(p).to.be.ok;

      expect(p.accounts[0].scheduling.offs).to.eq(0);

      async.series([
        next('2015-04-02T15:20:00-07:00', 33, '2015-03-30T00:00:00-07:00'),
        next('2015-04-02T17:00:00-07:00', 34, '2015-03-30T00:00:00-07:00'),
        next('2015-04-02T18:40:00-07:00', 35, '2015-03-30T00:00:00-07:00'),
        next('2015-04-02T20:21:00-07:00', 36, '2015-03-30T00:00:00-07:00'),
        next('2015-04-03T07:01:00-07:00', 37, '2015-03-30T00:00:00-07:00'),
        next('2015-04-03T08:41:00-07:00', 38, '2015-03-30T00:00:00-07:00'),
        next('2015-04-03T10:21:00-07:00', 39, '2015-03-30T00:00:00-07:00'),
        next('2015-04-03T12:02:00-07:00', 40, '2015-03-30T00:00:00-07:00'),
        next('2015-04-03T13:42:00-07:00', 41, '2015-03-30T00:00:00-07:00')
      ], done);
    });
  });

  it('should schedule on sunday too', function(done) {
    var tz = 'America/Los_Angeles',
        nowStr = '2015-04-02 14:00',
        now = moment.tz(nowStr, tz),
        p = new Profile({
          _id: new ObjectId(),
          accounts:[{
            _id: new ObjectId(),
            scheduling: {
              tz:         tz,
              week:       null,
              offs:       0,
              stype:      't',
              schedules:  [
                [429,529,629,720,820,920,1020,1120,1221,1869,1969,2069,2160,2260,2360,2460,2560,2661,3309,3409,3509,3600,3700,3800,3900,4000,4101,4749,4849,4949,5040,5140,5240,5340,5440,5541,9069,9169,9269,9360,9460,9560,9660,9760,9861], 
                [6181,6281,6381,6482,6582,6683],
                [7743,7844,7944,8046,8146], 
                []]
            }
          }]
        });

    function _next(expectedProcessAt, expectedOffs, expectedWeek, cb) {
      postScheduler._scheduleNextTime(p.accounts[0], false, function(err, processAt) {
        expect(err).to.be.null;
        expect(processAt).to.be.ok;
        expect(processAt.tz(tz).format()).to.eq(expectedProcessAt);
        expect(p.accounts[0].scheduling.offs).to.eq(expectedOffs);
        expect(moment.utc(p.accounts[0].scheduling.week).tz(tz).format()).to.eq(expectedWeek);
        cb();
      }, nowStr);
    }

    function next(expectedProcessAt, expectedOffs, expectedWeek) {
      return async.apply(_next, expectedProcessAt, expectedOffs, expectedWeek);
    }

    p.save(function(err, p) {
      expect(err).to.be.null;
      expect(p).to.be.ok;

      expect(p.accounts[0].scheduling.offs).to.eq(0);

      async.series([
        next('2015-04-02T15:20:00-07:00', 33, '2015-03-30T00:00:00-07:00'),
        next('2015-04-02T17:00:00-07:00', 34, '2015-03-30T00:00:00-07:00'),
        next('2015-04-02T18:40:00-07:00', 35, '2015-03-30T00:00:00-07:00'),
        next('2015-04-02T20:21:00-07:00', 36, '2015-03-30T00:00:00-07:00'),
        next('2015-04-03T07:01:00-07:00', 37, '2015-03-30T00:00:00-07:00'),
        next('2015-04-03T08:41:00-07:00', 38, '2015-03-30T00:00:00-07:00'),
        next('2015-04-03T10:21:00-07:00', 39, '2015-03-30T00:00:00-07:00'),
        next('2015-04-03T12:02:00-07:00', 40, '2015-03-30T00:00:00-07:00'),
        next('2015-04-03T13:42:00-07:00', 41, '2015-03-30T00:00:00-07:00'),
        next('2015-04-03T15:23:00-07:00', 42, '2015-03-30T00:00:00-07:00'),
        next('2015-04-04T09:03:00-07:00', 43, '2015-03-30T00:00:00-07:00'),
        next('2015-04-04T10:44:00-07:00', 44, '2015-03-30T00:00:00-07:00'),
        next('2015-04-04T12:24:00-07:00', 45, '2015-03-30T00:00:00-07:00'),
        next('2015-04-04T14:06:00-07:00', 46, '2015-03-30T00:00:00-07:00'),
        next('2015-04-04T15:46:00-07:00', 47, '2015-03-30T00:00:00-07:00'),
        next('2015-04-05T07:09:00-07:00', 48, '2015-03-30T00:00:00-07:00'),
        next('2015-04-05T08:49:00-07:00', 49, '2015-03-30T00:00:00-07:00'),
        next('2015-04-05T10:29:00-07:00', 50, '2015-03-30T00:00:00-07:00'),
        next('2015-04-05T12:00:00-07:00', 51, '2015-03-30T00:00:00-07:00'),
        next('2015-04-05T13:40:00-07:00', 52, '2015-03-30T00:00:00-07:00'),
        next('2015-04-05T15:20:00-07:00', 53, '2015-03-30T00:00:00-07:00'),
        next('2015-04-05T17:00:00-07:00', 54, '2015-03-30T00:00:00-07:00'),
        next('2015-04-05T18:40:00-07:00', 55, '2015-03-30T00:00:00-07:00'),
        next('2015-04-05T20:21:00-07:00', 56, '2015-03-30T00:00:00-07:00'),
        next('2015-04-06T07:09:00-07:00', 57, '2015-03-30T00:00:00-07:00'),
        next('2015-04-06T08:49:00-07:00', 58, '2015-03-30T00:00:00-07:00'),
        next('2015-04-06T10:29:00-07:00', 59, '2015-03-30T00:00:00-07:00'),
        next('2015-04-06T12:00:00-07:00', 60, '2015-03-30T00:00:00-07:00'),
        next('2015-04-06T13:40:00-07:00', 61, '2015-03-30T00:00:00-07:00'),
        next('2015-04-06T15:20:00-07:00', 62, '2015-03-30T00:00:00-07:00'),
        next('2015-04-06T17:00:00-07:00', 63, '2015-03-30T00:00:00-07:00'),
        next('2015-04-06T18:40:00-07:00', 64, '2015-03-30T00:00:00-07:00'),
        next('2015-04-06T20:21:00-07:00', 65, '2015-03-30T00:00:00-07:00'),
        next('2015-04-07T07:09:00-07:00', 66, '2015-03-30T00:00:00-07:00')
      ], done);
    });
  });

  it('should schedule time', function(done) {
    var tz = 'America/New_York',
        nowStr = '2014-12-02 12:00',
        now = moment.tz(nowStr, tz),
        p = new Profile({
          _id: new ObjectId(),
          accounts:[{
            _id: new ObjectId(),
            scheduling: {
              tz:         tz,
              schedules:  [[2*60, 4*60],[60]],
              week:       null,
              offs:       0,
              enabled:    true,
              stype:      't'
            }
          }]
        });

    function _next(expectedProcessAt, expectedOffs, expectedWeek, cb) {
      postScheduler._scheduleNextTime(p.accounts[0], false, function(err, processAt) {
        expect(err).to.be.null;
        expect(processAt).to.be.ok;
        expect(processAt.format()).to.eq(expectedProcessAt);
        expect(p.accounts[0].scheduling.offs).to.eq(expectedOffs);
        expect(moment.utc(p.accounts[0].scheduling.week).tz(tz).format()).to.eq(expectedWeek);
        cb();
      }, nowStr);
    }

    function next(expectedProcessAt, expectedOffs, expectedWeek) {
      return async.apply(_next, expectedProcessAt, expectedOffs, expectedWeek);
    }

    p.save(function(err, p) {
      expect(err).to.be.null;
      expect(p).to.be.ok;

      expect(p.accounts[0].scheduling.week).to.be.null;
      expect(p.accounts[0].scheduling.offs).to.eq(0);

      async.series([
        next('2014-12-08T06:00:00+00:00',  4, '2014-12-01T00:00:00-05:00'),
        next('2014-12-08T07:00:00+00:00',  5, '2014-12-01T00:00:00-05:00'),
        next('2014-12-08T09:00:00+00:00',  6, '2014-12-01T00:00:00-05:00'),
        next('2014-12-15T06:00:00+00:00',  7, '2014-12-01T00:00:00-05:00'),
        next('2014-12-15T07:00:00+00:00',  8, '2014-12-01T00:00:00-05:00'),
        next('2014-12-15T09:00:00+00:00',  9, '2014-12-01T00:00:00-05:00'),
        next('2014-12-22T06:00:00+00:00', 10, '2014-12-01T00:00:00-05:00'),
        next('2014-12-22T07:00:00+00:00', 11, '2014-12-01T00:00:00-05:00'),
        next('2014-12-22T09:00:00+00:00', 12, '2014-12-01T00:00:00-05:00')
      ], done);
    });
  });

  it('should schedule next time with locking', function(done) {
    var tz = 'America/New_York',
        nowStr = '2014-12-02 12:00',
        now = moment.tz(nowStr, tz),
        p = new Profile({
          _id: new ObjectId(),
          accounts:[{
            _id: new ObjectId(),
            scheduling: {
              tz:         tz,
              schedules:  [[2*60, 4*60],[60]],
              week:       null,
              offs:       0,
              enabled:    true,
              stype:      't'
            }
          }]
        });

    p.save(function(err, p) {
      expect(err).to.be.null;
      expect(p).to.be.ok;

      expect(p.accounts[0].scheduling.offs).to.eq(0);

      postScheduler.nextTime(p.accounts[0]._id, function(err, processAt, account) {
        expect(err).to.be.null;
        expect(account).to.be.ok;
        expect(processAt).to.be.ok;
        expect(processAt.format()).to.eq('2014-12-08T06:00:00+00:00');
        expect(p.accounts[0]._id.toString()).to.eq(account._id.toString());
        expect(p.accounts[0].scheduling.offs).to.eq(0);
        expect(p.accounts[0].scheduling.week).to.eq(null);

        Profile.findOne({_id: p._id}, function(err, p2) {
          expect(err).to.be.null;
          expect(p2).to.be.ok;

          expect(p2.accounts[0]._id.toString()).to.eq(account._id.toString());
          expect(p2.accounts[0].scheduling.offs).to.eq(4);
          expect(moment.utc(p2.accounts[0].scheduling.week).format()).to.eq('2014-12-01T05:00:00+00:00');

          done();
        });
      }, nowStr);
    });
  });

  it('should persist account schedule', function(done) {
    var tz = 'America/New_York',
        nowStr = '2014-12-02 12:00',
        now = moment.tz(nowStr, tz),
        p = new Profile({
          //_id: new ObjectId(),
          accounts:[{
            //_id: new ObjectId(),
            scheduling: {
              tz:         tz,
              schedules:  [[2*60, 4*60],[60]],
              week:       null,
              offs:       0,
              enabled:    true,
              stype:      't'
            }
          }]
        });

    p.save(function(err, p) {
      expect(err).to.be.null;
      expect(p).to.be.ok;

      expect(p.accounts[0].scheduling.offs).to.eq(0);

      postScheduler._scheduleNextTime(p.accounts[0], true, function(err, processAt) {
        expect(err).to.be.null;
        expect(processAt).to.be.ok;
        expect(processAt.format()).to.eq('2014-12-08T06:00:00+00:00');
        expect(p.accounts[0].scheduling.offs).to.eq(4);
        expect(moment.utc(p.accounts[0].scheduling.week).format()).to.eq('2014-12-01T05:00:00+00:00');
        
        Profile.findOne({_id: p._id}, function(err, p2) {
          expect(err).to.be.null;
          expect(p2).to.be.ok;

          expect(p2.accounts[0].scheduling.offs).to.eq(4);
          expect(moment.utc(p2.accounts[0].scheduling.week).format()).to.eq('2014-12-01T05:00:00+00:00');

          postScheduler._scheduleNextTime(p.accounts[0], false, function(err, processAt) {
            expect(err).to.be.null;
            expect(processAt).to.be.ok;
            expect(p.accounts[0].scheduling.offs).to.eq(5);
            expect(processAt.format()).to.eq('2014-12-08T07:00:00+00:00');
            expect(moment.utc(p.accounts[0].scheduling.week).format()).to.eq('2014-12-01T05:00:00+00:00');

            Profile.findOne({_id: p._id}, function(err, p2) {
              expect(err).to.be.null;
              expect(p2).to.be.ok;

              expect(p2.accounts[0].scheduling.offs).to.eq(4);
              expect(moment.utc(p2.accounts[0].scheduling.week).format()).to.eq('2014-12-01T05:00:00+00:00');

              postScheduler._schedulePersist(p.accounts[0], function(err) {
                expect(err).to.be.undefined;

                Profile.findOne({_id: p._id}, function(err, p2) {
                  expect(err).to.be.null;
                  expect(p2).to.be.ok;

                  expect(p2.accounts[0].scheduling.offs).to.eq(5);
                  expect(moment.utc(p2.accounts[0].scheduling.week).format()).to.eq('2014-12-01T05:00:00+00:00');

                  done();
                });
              }, nowStr);
            });
          }, nowStr);
        });
      }, nowStr);
    });
  });

  it('should fetch account scheduling', function(done) {
    var tz = 'America/New_York',
        nowStr = '2014-12-02 12:00',
        now = moment.tz(nowStr, tz),
        p = new Profile({
          //_id: new ObjectId(),
          accounts:[{
            //_id: new ObjectId(),
            name: 'X',
            blockedUntil: now.toDate(),
            scheduling: {
              tz:         tz,
              schedules:  [[2*60, 4*60],[60]],
              week:       now.toDate(),
              offs:       2,
              enabled:    true,
              stype:      't'
            }
          }]
        });

    p.save(function(err, p) {
      expect(err).to.be.null;
      expect(p).to.be.ok;

      postScheduler._fetchAccountScheduling(p.accounts[0]._id, function(err, profile, account) {
        expect(err).to.be.null;
        expect(profile).to.be.ok;
        expect(account).to.be.ok;
        expect(account.scheduling).to.be.ok;
        expect(account.blockedUntil).to.be.ok;
        expect(account.name).to.be.undefined;

        expect(profile._id.toString()).to.eq(p._id.toString());
        expect(account._id.toString()).to.eq(p.accounts[0]._id.toString());

        done();
      });
    });
  });

  it('should lock account', function(done) {

    this.timeout(4 * config.get('lock:account:ttl'));

    var tm = new Date();

    postScheduler._lockAccount('0', function(err, unlock) {
      expect(err).to.be.null;
      expect(unlock).to.be.ok;

      setTimeout(function() {
        postScheduler._lockAccount('0', function(err, unlock) {
          expect(err).to.be.null;
          expect(unlock).to.be.ok;

          tm = new Date() - tm;

          expect(tm).to.be.gt(config.get('lock:account:ttl'));

          unlock();

          done();
        });
      }, config.get('lock:account:ttl')+200);
    });
  });

  it('should fetch scheduled posts', function(done) {

    var now = moment.utc(),
        account0 = new ObjectId(),
        account1 = new ObjectId(),
        posts = [
          new Post({aid: account0, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: account0, state: States.post.scheduledByUser.code, publishAt: now.clone().add(2, 'days')}),
          new Post({aid: account0, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(1, 'days')}),
          new Post({aid: account1, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: account1, state: States.post.retry.code, publishAt: now.clone().add(4, 'days')})];

    async.each(posts, function(post, cb) {
      post.save(cb);
    }, function(err) {
      expect(err).to.be.undefined;

      postScheduler._fetchAccountPostsScheduledByScheduler(account0, function(err, foundPosts) {
        expect(err).to.be.null;
        expect(foundPosts).to.be.ok;
        expect(foundPosts.length).to.eq(2);
        expect(foundPosts[0]._id.toString()).to.eq(posts[2]._id.toString());
        expect(foundPosts[1]._id.toString()).to.eq(posts[0]._id.toString());

        postScheduler._fetchAccountPostsScheduledByScheduler(account1, function(err, foundPosts) {
          expect(err).to.be.null;
          expect(foundPosts).to.be.ok;
          expect(foundPosts.length).to.eq(1);
          expect(foundPosts[0]._id.toString()).to.eq(posts[3]._id.toString());

          done();
        });
      });
    });
  });

  it('should reset account scheduling', function(done) {
    var tz = 'America/New_York',
        nowStr = '2014-12-02 12:00',
        now = moment.tz(nowStr, tz),
        p = new Profile({
          //_id: new ObjectId(),
          accounts:[{
            //_id: new ObjectId(),
            name: 'X',
            blockedUntil: now.toDate(),
            scheduling: {
              tz:         tz,
              schedules:  [[2*60, 4*60],[60]],
              week:       now.toDate(),
              offs:       2,
              enabled:    true,
              stype:      't'
            }
          }]
        });

    p.save(function(err, p) {
      expect(err).to.be.null;
      expect(p).to.be.ok;

      postScheduler._scheduleReset(p.accounts[0], false, function(err) {
        expect(err).to.be.undefined;

        expect(moment.utc(p.accounts[0].scheduling.week).format()).to.eq('2014-12-01T05:00:00+00:00');
        expect(p.accounts[0].scheduling.offs).to.eq(0);

        postScheduler._scheduleReset(p.accounts[0], true, function(err) {
          expect(err).to.be.undefined;

          Profile.findOne({_id: p._id}, function(err, p2) {
            expect(err).to.be.null;
            expect(p2).to.be.ok;

            expect(moment.utc(p2.accounts[0].scheduling.week).format()).to.eq('2014-12-01T05:00:00+00:00');
            expect(p2.accounts[0].scheduling.offs).to.eq(0);

            done();
          });
        }, nowStr);
      }, nowStr);
    });
  });

  it('should reschedule posts scheduled by scheduler without account.blockedUntil', function(done) {

    var tz = 'America/New_York',
        nowStr = '2014-12-02 12:00',
        now = moment.tz(nowStr, tz),
        p = new Profile({
          //_id: new ObjectId(),
          accounts:[{
            _id: new ObjectId(),
            //blockedUntil: now.toDate(),
            scheduling: {
              tz:         tz,
              schedules:  [[2*60, 4*60],[60]],
              week:       null,
              offs:       2,
              enabled:    true,
              stype:      't'
            }
          }]
        }),
        posts = [
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByUser.code, publishAt: now.clone().add(2, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(1, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.retry.code, publishAt: now.clone().add(4, 'days')})];

    async.each(posts, function(post, cb) {
      post.save(cb);
    }, function(err) {
      expect(err).to.be.undefined;

      p.save(function(err, p) {
        expect(err).to.be.null;
        expect(p).to.be.ok;

        postScheduler.rescheduleAll(p.accounts[0]._id, function(err, account, updatedPosts) {
          expect(err).to.be.null;
          expect(account).to.be.ok;
          expect(updatedPosts).to.be.ok;
          expect(updatedPosts.length).to.eq(2);

          expect(moment.utc(updatedPosts[0].publishAt).format()).to.eq('2014-12-08T06:00:00+00:00');
          expect(moment.utc(updatedPosts[1].publishAt).format()).to.eq('2014-12-08T07:00:00+00:00');

          done();
        }, nowStr);
      });
    });
  });

  it('should reschedule posts scheduled by scheduler with account.blockedUntil', function(done) {

    var tz = 'America/New_York',
        nowStr = '2014-12-02 12:00',
        now = moment.tz(nowStr, tz),
        p = new Profile({
          //_id: new ObjectId(),
          accounts:[{
            _id: new ObjectId(),
            blockedUntil: now.clone().add(1, 'month').add(3, 'days').toDate(),
            scheduling: {
              tz:         tz,
              schedules:  [[2*60, 4*60],[60]],
              week:       null,
              offs:       2,
              enabled:    true,
              stype:      't'
            }
          }]
        }),
        posts = [
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByUser.code, publishAt: now.clone().add(2, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(1, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.retry.code, publishAt: now.clone().add(4, 'days')})];

    async.each(posts, function(post, cb) {
      post.save(cb);
    }, function(err) {
      expect(err).to.be.undefined;

      p.save(function(err, p) {
        expect(err).to.be.null;
        expect(p).to.be.ok;

        postScheduler.rescheduleAll(p.accounts[0]._id, function(err, account, updatedPosts) {
          expect(err).to.be.null;
          expect(account).to.be.ok;
          expect(updatedPosts).to.be.ok;
          expect(updatedPosts.length).to.eq(2);

          expect(moment.utc(updatedPosts[0].publishAt).format()).to.eq('2015-01-12T06:00:00+00:00');
          expect(moment.utc(updatedPosts[1].publishAt).format()).to.eq('2015-01-12T07:00:00+00:00');

          done();
        }, nowStr);
      });
    });
  });

  it('should reschedule posts scheduled by scheduler with account.scheduling.week', function(done) {

    var tz = 'America/New_York',
        nowStr = '2014-12-02 12:00',
        now = moment.tz(nowStr, tz),
        p = new Profile({
          //_id: new ObjectId(),
          accounts:[{
            _id: new ObjectId(),
            scheduling: {
              tz:         tz,
              schedules:  [[2*60, 4*60],[60]],
              week:       now.clone().add(1, 'month').add(3, 'days').toDate(),
              offs:       2,
              enabled:    true,
              stype:      't'
            }
          }]
        }),
        posts = [
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByUser.code, publishAt: now.clone().add(2, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(1, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.retry.code, publishAt: now.clone().add(4, 'days')})];

    async.each(posts, function(post, cb) {
      post.save(cb);
    }, function(err) {
      expect(err).to.be.undefined;

      p.save(function(err, p) {
        expect(err).to.be.null;
        expect(p).to.be.ok;

        postScheduler.rescheduleAll(p.accounts[0]._id, function(err, account, updatedPosts) {
          expect(err).to.be.null;
          expect(account).to.be.ok;
          expect(updatedPosts).to.be.ok;
          expect(updatedPosts.length).to.eq(2);

          expect(moment.utc(updatedPosts[0].publishAt).format()).to.eq('2014-12-08T06:00:00+00:00');
          expect(moment.utc(updatedPosts[1].publishAt).format()).to.eq('2014-12-08T07:00:00+00:00');

          done();
        }, nowStr);
      });
    });
  });

  it('should schedule post as first one in the queue', function(done) {

    var tz = 'America/New_York',
        nowStr = '2014-12-02 12:00',
        now = moment.tz(nowStr, tz),
        p = new Profile({
          //_id: new ObjectId(),
          accounts:[{
            _id: new ObjectId(),
            scheduling: {
              tz:         tz,
              schedules:  [[2*60, 4*60],[60]],
              week:       null,
              offs:       2,
              enabled:    true,
              stype:      't'
            }
          }]
        }),
        posts = [
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByUser.code, publishAt: now.clone().add(2, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(1, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.retry.code, publishAt: now.clone().add(4, 'days')})];

    async.each(posts, function(post, cb) {
      post.save(cb);
    }, function(err) {
      expect(err).to.be.undefined;

      p.save(function(err, p) {
        expect(err).to.be.null;
        expect(p).to.be.ok;

        postScheduler.rescheduleAll(p.accounts[0]._id, function(err, account, updatedPosts) {
          expect(err).to.be.null;
          expect(account).to.be.ok;
          expect(updatedPosts).to.be.ok;
          expect(updatedPosts.length).to.eq(2);

          expect(moment.utc(updatedPosts[0].publishAt).format()).to.eq('2014-12-08T06:00:00+00:00');
          expect(moment.utc(updatedPosts[1].publishAt).format()).to.eq('2014-12-08T07:00:00+00:00');

          postScheduler.firstTime(p.accounts[0]._id, function(err, scheduledTime, account, updatedPosts) {

            expect(err).to.be.null;
            expect(account).to.be.ok;
            expect(p.accounts[0]._id.toString()).to.eq(account._id.toString());

            expect(scheduledTime).to.be.ok;
            expect(scheduledTime.format()).to.eq('2014-12-08T06:00:00+00:00');

            expect(updatedPosts).to.be.ok;
            expect(updatedPosts.length).to.eq(2);

            expect(moment.utc(updatedPosts[0].publishAt).format()).to.eq('2014-12-08T07:00:00+00:00');
            expect(moment.utc(updatedPosts[1].publishAt).format()).to.eq('2014-12-08T09:00:00+00:00');

            Profile.findOne({_id: p._id}, function(err, p2) {
              expect(err).to.be.null;
              expect(p2).to.be.ok;

              expect(p2.accounts[0].scheduling.offs).to.eq(6);
              expect(moment.utc(p2.accounts[0].scheduling.week).format()).to.eq('2014-12-01T05:00:00+00:00');

              postScheduler.nextTime(p.accounts[0]._id, function(err, scheduledTime, account) {

                expect(err).to.be.null;
                expect(account).to.be.ok;
                expect(p.accounts[0]._id.toString()).to.eq(account._id.toString());

                expect(scheduledTime).to.be.ok;
                expect(scheduledTime.format()).to.eq('2014-12-15T06:00:00+00:00');

                Profile.findOne({_id: p._id}, function(err, p2) {
                  expect(err).to.be.null;
                  expect(p2).to.be.ok;

                  expect(p2.accounts[0].scheduling.offs).to.eq(7);
                  expect(moment.utc(p2.accounts[0].scheduling.week).format()).to.eq('2014-12-01T05:00:00+00:00');
                  
                  done();
                });
              }, nowStr);
            });
          }, nowStr);
        }, nowStr);
      });
    });
  });

  it('should move scheduled post from position 0 to 3 with 4 posts scheduled', function(done) {

    var tz = 'America/New_York',
        nowStr = '2014-12-02 12:00',
        now = moment.tz(nowStr, tz),
        p = new Profile({
          //_id: new ObjectId(),
          accounts:[{
            _id: new ObjectId(),
            scheduling: {
              tz:         tz,
              schedules:  [[2*60, 4*60],[60]],
              week:       null,
              offs:       2,
              enabled:    true,
              stype:      't'
            }
          }]
        }),
        // past->future: 2,0,3,4
        posts = [
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByUser.code, publishAt: now.clone().add(2, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(1, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(4, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(6, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.retry.code, publishAt: now.clone().add(4, 'days')})];

    async.each(posts, function(post, cb) {
      post.save(cb);
    }, function(err) {
      expect(err).to.be.undefined;

      p.save(function(err, p) {
        expect(err).to.be.null;
        expect(p).to.be.ok;

        postScheduler.rescheduleAll(p.accounts[0]._id, function(err, account, updatedPosts) {
          expect(err).to.be.null;

          expect(account).to.be.ok;
          expect(p.accounts[0]._id.toString()).to.eq(account._id.toString());

          expect(updatedPosts).to.be.ok;
          expect(updatedPosts.length).to.eq(4);

          expect(moment.utc(updatedPosts[0].publishAt).format()).to.eq('2014-12-08T06:00:00+00:00');
          expect(moment.utc(updatedPosts[1].publishAt).format()).to.eq('2014-12-08T07:00:00+00:00');
          expect(moment.utc(updatedPosts[2].publishAt).format()).to.eq('2014-12-08T09:00:00+00:00');
          expect(moment.utc(updatedPosts[3].publishAt).format()).to.eq('2014-12-15T06:00:00+00:00');

          expect(updatedPosts[0]._id.toString()).to.eq(posts[2]._id.toString());
          expect(updatedPosts[1]._id.toString()).to.eq(posts[0]._id.toString());
          expect(updatedPosts[2]._id.toString()).to.eq(posts[3]._id.toString());
          expect(updatedPosts[3]._id.toString()).to.eq(posts[4]._id.toString());

          postScheduler.movePost(posts[2], 3, function(err, post, account, updatedPosts) {
            expect(err).to.be.null;

            expect(account).to.be.ok;
            expect(p.accounts[0]._id.toString()).to.eq(account._id.toString());

            expect(post).to.be.ok;
            expect(post._id.toString()).to.eq(posts[2]._id.toString());

            expect(updatedPosts).to.be.ok;
            expect(updatedPosts.length).to.eq(4);

            expect(moment.utc(updatedPosts[0].publishAt).format()).to.eq('2014-12-08T06:00:00+00:00');
            expect(moment.utc(updatedPosts[1].publishAt).format()).to.eq('2014-12-08T07:00:00+00:00');
            expect(moment.utc(updatedPosts[2].publishAt).format()).to.eq('2014-12-08T09:00:00+00:00');
            expect(moment.utc(updatedPosts[3].publishAt).format()).to.eq('2014-12-15T06:00:00+00:00');

            expect(updatedPosts[0]._id.toString()).to.eq(posts[0]._id.toString());
            expect(updatedPosts[1]._id.toString()).to.eq(posts[3]._id.toString());
            expect(updatedPosts[2]._id.toString()).to.eq(posts[4]._id.toString());
            expect(updatedPosts[3]._id.toString()).to.eq(posts[2]._id.toString());

            done();
          });
        }, nowStr);
      });
    });
  });

  it('should move scheduled post from position 0 to 2 with 4 posts scheduled', function(done) {

    var tz = 'America/New_York',
        nowStr = '2014-12-02 12:00',
        now = moment.tz(nowStr, tz),
        p = new Profile({
          //_id: new ObjectId(),
          accounts:[{
            _id: new ObjectId(),
            scheduling: {
              tz:         tz,
              schedules:  [[2*60, 4*60],[60]],
              week:       null,
              offs:       2,
              enabled:    true,
              stype:      't'
            }
          }]
        }),
        // past->future: 2,0,3,4
        posts = [
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByUser.code, publishAt: now.clone().add(2, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(1, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(4, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(6, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.retry.code, publishAt: now.clone().add(4, 'days')})];

    async.each(posts, function(post, cb) {
      post.save(cb);
    }, function(err) {
      expect(err).to.be.undefined;

      p.save(function(err, p) {
        expect(err).to.be.null;
        expect(p).to.be.ok;

        postScheduler.rescheduleAll(p.accounts[0]._id, function(err, account, updatedPosts) {
          expect(err).to.be.null;

          expect(account).to.be.ok;
          expect(p.accounts[0]._id.toString()).to.eq(account._id.toString());

          expect(updatedPosts).to.be.ok;
          expect(updatedPosts.length).to.eq(4);

          expect(moment.utc(updatedPosts[0].publishAt).format()).to.eq('2014-12-08T06:00:00+00:00');
          expect(moment.utc(updatedPosts[1].publishAt).format()).to.eq('2014-12-08T07:00:00+00:00');
          expect(moment.utc(updatedPosts[2].publishAt).format()).to.eq('2014-12-08T09:00:00+00:00');
          expect(moment.utc(updatedPosts[3].publishAt).format()).to.eq('2014-12-15T06:00:00+00:00');

          expect(updatedPosts[0]._id.toString()).to.eq(posts[2]._id.toString());
          expect(updatedPosts[1]._id.toString()).to.eq(posts[0]._id.toString());
          expect(updatedPosts[2]._id.toString()).to.eq(posts[3]._id.toString());
          expect(updatedPosts[3]._id.toString()).to.eq(posts[4]._id.toString());

          postScheduler.movePost(posts[2], 2, function(err, post, account, updatedPosts) {
            expect(err).to.be.null;

            expect(account).to.be.ok;
            expect(p.accounts[0]._id.toString()).to.eq(account._id.toString());

            expect(post).to.be.ok;
            expect(post._id.toString()).to.eq(posts[2]._id.toString());

            expect(updatedPosts).to.be.ok;
            expect(updatedPosts.length).to.eq(3);

            expect(moment.utc(updatedPosts[0].publishAt).format()).to.eq('2014-12-08T06:00:00+00:00');
            expect(moment.utc(updatedPosts[1].publishAt).format()).to.eq('2014-12-08T07:00:00+00:00');
            expect(moment.utc(updatedPosts[2].publishAt).format()).to.eq('2014-12-08T09:00:00+00:00');

            expect(updatedPosts[0]._id.toString()).to.eq(posts[0]._id.toString());
            expect(updatedPosts[1]._id.toString()).to.eq(posts[3]._id.toString());
            expect(updatedPosts[2]._id.toString()).to.eq(posts[2]._id.toString());

            done();
          });
        }, nowStr);
      });
    });
  });

  it('should move scheduled post from position 4 to 0 with 4 posts scheduled', function(done) {

    var tz = 'America/New_York',
        nowStr = '2014-12-02 12:00',
        now = moment.tz(nowStr, tz),
        p = new Profile({
          //_id: new ObjectId(),
          accounts:[{
            _id: new ObjectId(),
            scheduling: {
              tz:         tz,
              schedules:  [[2*60, 4*60],[60]],
              week:       null,
              offs:       2,
              enabled:    true,
              stype:      't'
            }
          }]
        }),
        // past->future: 2,0,3,4
        posts = [
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByUser.code, publishAt: now.clone().add(2, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(1, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(4, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(6, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.retry.code, publishAt: now.clone().add(4, 'days')})];

    async.each(posts, function(post, cb) {
      post.save(cb);
    }, function(err) {
      expect(err).to.be.undefined;

      p.save(function(err, p) {
        expect(err).to.be.null;
        expect(p).to.be.ok;

        postScheduler.rescheduleAll(p.accounts[0]._id, function(err, account, updatedPosts) {
          expect(err).to.be.null;

          expect(account).to.be.ok;
          expect(p.accounts[0]._id.toString()).to.eq(account._id.toString());

          expect(updatedPosts).to.be.ok;
          expect(updatedPosts.length).to.eq(4);

          expect(moment.utc(updatedPosts[0].publishAt).format()).to.eq('2014-12-08T06:00:00+00:00');
          expect(moment.utc(updatedPosts[1].publishAt).format()).to.eq('2014-12-08T07:00:00+00:00');
          expect(moment.utc(updatedPosts[2].publishAt).format()).to.eq('2014-12-08T09:00:00+00:00');
          expect(moment.utc(updatedPosts[3].publishAt).format()).to.eq('2014-12-15T06:00:00+00:00');

          expect(updatedPosts[0]._id.toString()).to.eq(posts[2]._id.toString());
          expect(updatedPosts[1]._id.toString()).to.eq(posts[0]._id.toString());
          expect(updatedPosts[2]._id.toString()).to.eq(posts[3]._id.toString());
          expect(updatedPosts[3]._id.toString()).to.eq(posts[4]._id.toString());

          postScheduler.movePost(posts[4], 0, function(err, post, account, updatedPosts) {
            expect(err).to.be.null;

            expect(account).to.be.ok;
            expect(p.accounts[0]._id.toString()).to.eq(account._id.toString());

            expect(post).to.be.ok;
            expect(post._id.toString()).to.eq(posts[4]._id.toString());

            expect(updatedPosts).to.be.ok;
            expect(updatedPosts.length).to.eq(4);

            expect(moment.utc(updatedPosts[0].publishAt).format()).to.eq('2014-12-08T06:00:00+00:00');
            expect(moment.utc(updatedPosts[1].publishAt).format()).to.eq('2014-12-08T07:00:00+00:00');
            expect(moment.utc(updatedPosts[2].publishAt).format()).to.eq('2014-12-08T09:00:00+00:00');
            expect(moment.utc(updatedPosts[3].publishAt).format()).to.eq('2014-12-15T06:00:00+00:00');

            expect(updatedPosts[0]._id.toString()).to.eq(posts[4]._id.toString());
            expect(updatedPosts[1]._id.toString()).to.eq(posts[2]._id.toString());
            expect(updatedPosts[2]._id.toString()).to.eq(posts[0]._id.toString());
            expect(updatedPosts[3]._id.toString()).to.eq(posts[3]._id.toString());

            done();
          });
        }, nowStr);
      });
    });
  });

  it('should move scheduled post from position 4 to 1 with 4 posts scheduled', function(done) {

    var tz = 'America/New_York',
        nowStr = '2014-12-02 12:00',
        now = moment.tz(nowStr, tz),
        p = new Profile({
          //_id: new ObjectId(),
          accounts:[{
            _id: new ObjectId(),
            scheduling: {
              tz:         tz,
              schedules:  [[2*60, 4*60],[60]],
              week:       null,
              offs:       2,
              enabled:    true,
              stype:      't'
            }
          }]
        }),
        // past->future: 2,0,3,4
        posts = [
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByUser.code, publishAt: now.clone().add(2, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(1, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(4, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(6, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.retry.code, publishAt: now.clone().add(4, 'days')})];

    async.each(posts, function(post, cb) {
      post.save(cb);
    }, function(err) {
      expect(err).to.be.undefined;

      p.save(function(err, p) {
        expect(err).to.be.null;
        expect(p).to.be.ok;

        postScheduler.rescheduleAll(p.accounts[0]._id, function(err, account, updatedPosts) {
          expect(err).to.be.null;

          expect(account).to.be.ok;
          expect(p.accounts[0]._id.toString()).to.eq(account._id.toString());

          expect(updatedPosts).to.be.ok;
          expect(updatedPosts.length).to.eq(4);

          expect(moment.utc(updatedPosts[0].publishAt).format()).to.eq('2014-12-08T06:00:00+00:00');
          expect(moment.utc(updatedPosts[1].publishAt).format()).to.eq('2014-12-08T07:00:00+00:00');
          expect(moment.utc(updatedPosts[2].publishAt).format()).to.eq('2014-12-08T09:00:00+00:00');
          expect(moment.utc(updatedPosts[3].publishAt).format()).to.eq('2014-12-15T06:00:00+00:00');

          expect(updatedPosts[0]._id.toString()).to.eq(posts[2]._id.toString());
          expect(updatedPosts[1]._id.toString()).to.eq(posts[0]._id.toString());
          expect(updatedPosts[2]._id.toString()).to.eq(posts[3]._id.toString());
          expect(updatedPosts[3]._id.toString()).to.eq(posts[4]._id.toString());

          postScheduler.movePost(posts[4], 1, function(err, post, account, updatedPosts) {
            expect(err).to.be.null;

            expect(account).to.be.ok;
            expect(p.accounts[0]._id.toString()).to.eq(account._id.toString());

            expect(post).to.be.ok;
            expect(post._id.toString()).to.eq(posts[4]._id.toString());

            expect(updatedPosts).to.be.ok;
            expect(updatedPosts.length).to.eq(3);

            //expect(moment.utc(updatedPosts[0].publishAt).format()).to.eq('2014-12-08T06:00:00+00:00');
            expect(moment.utc(updatedPosts[0].publishAt).format()).to.eq('2014-12-08T07:00:00+00:00');
            expect(moment.utc(updatedPosts[1].publishAt).format()).to.eq('2014-12-08T09:00:00+00:00');
            expect(moment.utc(updatedPosts[2].publishAt).format()).to.eq('2014-12-15T06:00:00+00:00');

            expect(updatedPosts[0]._id.toString()).to.eq(posts[4]._id.toString());
            expect(updatedPosts[1]._id.toString()).to.eq(posts[0]._id.toString());
            expect(updatedPosts[2]._id.toString()).to.eq(posts[3]._id.toString());

            done();
          });
        }, nowStr);
      });
    });
  });

  it('should block account publishing', function(done) {
    var tz = 'America/New_York',
        nowStr = '2014-12-02 12:00',
        now = moment.tz(nowStr, tz),
        blocked = moment.utc('2014-12-10T12:00:00Z'),
        p = new Profile({
          //_id: new ObjectId(),
          accounts:[{
            _id: new ObjectId(),
            scheduling: {
              tz:         tz,
              schedules:  [[2*60, 4*60],[60]],
              week:       null,
              offs:       2,
              enabled:    true,
              stype:      't'
            }
          }]
        }),
        // past->future: 2,0,3,4
        posts = [
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByUser.code, publishAt: now.clone().subtract(2, 'days').add(2, 'hours')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(1, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(4, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(6, 'days')}),
          new Post({aid: p.accounts[0]._id, state: States.post.retry.code, publishAt: now.clone().add(4, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.scheduledByScheduler.code, publishAt: now.clone().add(3, 'days')}),
          new Post({aid: new ObjectId(), state: States.post.retry.code, publishAt: now.clone().add(4, 'days')})];

    async.each(posts, function(post, cb) {
      post.save(cb);
    }, function(err) {
      expect(err).to.be.undefined;

      p.save(function(err, p) {
        expect(err).to.be.null;
        expect(p).to.be.ok;

        postScheduler.block(p.accounts[0]._id, blocked, function(err, account, updatedPosts) {
          expect(err).to.be.not.ok;

          expect(account).to.be.ok;
          expect(account.blockedUntil).to.be.ok;
          expect(moment.utc(account.blockedUntil).format()).to.eq(blocked.format());

          expect(updatedPosts).to.be.ok;
          expect(updatedPosts.length).to.eq(6);

          expect(updatedPosts[0]._id.toString()).to.eq(posts[2]._id.toString());
          expect(updatedPosts[1]._id.toString()).to.eq(posts[0]._id.toString());
          expect(updatedPosts[2]._id.toString()).to.eq(posts[3]._id.toString());
          expect(updatedPosts[3]._id.toString()).to.eq(posts[4]._id.toString());
          expect(updatedPosts[4]._id.toString()).to.eq(posts[1]._id.toString());
          expect(updatedPosts[5]._id.toString()).to.eq(posts[5]._id.toString());

          expect(moment.utc(updatedPosts[0].publishAt).format()).to.eq('2014-12-15T06:00:00+00:00');
          expect(moment.utc(updatedPosts[1].publishAt).format()).to.eq('2014-12-15T07:00:00+00:00');
          expect(moment.utc(updatedPosts[2].publishAt).format()).to.eq('2014-12-15T09:00:00+00:00');
          expect(moment.utc(updatedPosts[3].publishAt).format()).to.eq('2014-12-22T06:00:00+00:00');
          expect(moment.utc(updatedPosts[4].publishAt).format()).to.eq('2014-12-11T10:00:00+00:00');
          expect(moment.utc(updatedPosts[5].publishAt).format()).to.eq('2014-12-14T12:00:00+00:00');

          done();
        }, now);
      });
    });
  });
});