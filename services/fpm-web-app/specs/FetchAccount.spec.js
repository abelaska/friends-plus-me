'use strict';

process.env.NODE_ENV = 'test';

var mongoose = require('mongoose'),
    moment = require('moment'),
    async = require('async'),
    expect = require('chai').expect,
    ObjectId = mongoose.Types.ObjectId,
    _ = require('underscore'),
    States = require('../src/lib/States'),
    config = require('../src/lib/config').config,
    FetchAccount = require(__dirname+'/../src/models/FetchAccount'),
    Profile = require(__dirname+'/../src/models/Profile').Profile,
    PricingPlan = require(__dirname+'/../src/models/PricingPlan');

describe('FetchAccount', function() {

  require('chai').config.includeStack = true;

  try { mongoose.connect(config.get('db:url'), config.get('db:options')); } catch(err) {}

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

  function preparePricingPlan(cb) {
    async.each([{
      "id": "PAYWYU",
      "available": true,
      "fetchInterval": 300,
      "fetchIntervals": [5,8,11,15],
      "level": 2,
      "intervals": {
        "MONTH": {
          "braintreePlanId": "STARTER_MONTH",
          "pricePerMonth": 500
        },
        "YEAR": {
          "braintreePlanId": "STARTER_YEAR",
          "pricePerMonth": 400,
          "pricePerYear": 4800,
          "savedPercent": 20
        }
      },
      "use": {
        "maxAccounts": 20,
        "rwgpage": true,
        "network": {
          "google": {
            "limit": 3
          }
        }
      }
    }, {
      "id": "STARTER",
      "available": true,
      "fetchInterval": 300,
      "fetchIntervals": [5,8,11,15],
      "level": 2,
      "intervals": {
        "MONTH": {
          "braintreePlanId": "STARTER_MONTH",
          "pricePerMonth": 500
        },
        "YEAR": {
          "braintreePlanId": "STARTER_YEAR",
          "pricePerMonth": 400,
          "pricePerYear": 4800,
          "savedPercent": 20
        }
      },
      "use": {
        "maxAccounts": 20,
        "rwgpage": true,
        "network": {
          "google": {
            "limit": 3
          }
        }
      }
    }, {
      "id": "BASIC",
      "available": true,
      "fetchInterval": 60,
      "fetchIntervals": [1,4,7,10],
      "level": 3,
      "intervals": {
        "MONTH": {
          "braintreePlanId": "BASIC_MONTH",
          "pricePerMonth": 1000
        },
        "YEAR": {
          "braintreePlanId": "BASIC_YEAR",
          "pricePerMonth": 800,
          "pricePerYear": 9600,
          "savedPercent": 20
        }
      },
      "use": {
        "maxAccounts": 50,
        "rwgpage": true,
        "maxMembers": 2,
        "network": {
          "google": {
            "limit": 20
          }
        }
      }
    }, {
      "id": "FREE",
      "available": true,
      "fetchInterval": 600,
      "fetchIntervals": [10,30,80,180],
      "level": 0,
      "intervals": {
        "MONTH": {
          "pricePerMonth": 0
        },
        "YEAR": {
          "pricePerMonth": 0,
          "pricePerYear": 0,
          "savedPercent": 0
        }
      },
      "use": {
        "maxAccounts": 5,
        "rwgpage": false
      }
    }], function(plan, cb2) {
      new PricingPlan(plan).save(cb2);
    }, cb);
  }

  beforeEach(function(done) {
    async.parallel([
      async.apply(removeAll, FetchAccount),
      async.apply(removeAll, PricingPlan)
    ], function(err) {
      if (err) {
        done(err);
      } else {
        async.series([
          async.apply(preparePricingPlan),
        ], done);
      }
    });
  });

  it('should create FetchAccount', function(done) {
    new Profile({
      accounts: [{pid: '1',network: 2,account: 3},{pid: '2',network: 3,account: 4}]
    }).save(function(err, profile) {

      expect(err).to.be.null;
      expect(profile).to.be.ok;

      var now = moment.utc();

      FetchAccount.register(profile, profile.accounts[0], false, function(err, faccount) {

        expect(err).to.be.null;
        expect(faccount).to.be.ok;

        expect(faccount._id.toString()).to.eq(profile.accounts[0]._id.toString());
        expect(faccount.pid.toString()).to.eq(profile._id.toString());
        expect(faccount.plan).to.eq('PAYWYU');
        expect(faccount.prio).to.eq(1);
        expect(faccount.interval).to.eq(300);
        expect(faccount.nextFetch.valueOf()).to.eq(now.clone().add(faccount.interval, 'seconds').valueOf());
        expect(faccount.lastFetch.valueOf()).to.eq(now.valueOf());
        expect(faccount.fetches).to.be.ok;
        expect(faccount.fetches.length).to.eq(0);

        done();
      }, now);
    });
  });

  it('should remove all profile FetchAccounts', function(done) {
    new Profile({
      accounts: [{pid: '1',network: 2,account: 3},{pid: '2',network: 3,account: 4}]
    }).save(function(err, profile) {

      expect(err).to.be.null;
      expect(profile).to.be.ok;

      var now = moment.utc();

      FetchAccount.register(profile, profile.accounts[0], false, function(err, faccount) {

        expect(err).to.be.null;
        expect(faccount).to.be.ok;

        FetchAccount.register(profile, profile.accounts[1], false, function(err, faccount) {

          expect(err).to.be.null;
          expect(faccount).to.be.ok;

          FetchAccount.count({pid: profile._id}, function(err, count) {

            expect(err).to.be.null;
            expect(count).to.eq(2);

            FetchAccount.removeProfileAccounts(profile, function(err, removed) {

              expect(err).to.be.null;
              expect(removed).to.be.ok;

              FetchAccount.count({pid: profile._id}, function(err, count) {

                expect(err).to.be.null;
                expect(count).to.eq(0);

                done();
              });
            });
          });
        }, now);
      }, now);
    });
  });

  it('should survive duplicit create FetchAccount', function(done) {
    new Profile({
      accounts: [{pid: '1',network: 2,account: 3},{pid: '2',network: 3,account: 4}]
    }).save(function(err, profile) {

      expect(err).to.be.null;
      expect(profile).to.be.ok;

      var now = moment.utc(),
          now2 = now.clone().add(1, 'days');

      FetchAccount.register(profile, profile.accounts[0], false, function(err, faccount) {

        expect(err).to.be.null;
        expect(faccount).to.be.ok;

        expect(faccount._id.toString()).to.eq(profile.accounts[0]._id.toString());
        expect(faccount.pid.toString()).to.eq(profile._id.toString());
        expect(faccount.plan).to.eq('PAYWYU');
        expect(faccount.prio).to.eq(1);
        expect(faccount.interval).to.eq(300);
        expect(faccount.nextFetch.valueOf()).to.eq(now.clone().add(faccount.interval, 'seconds').valueOf());
        expect(faccount.lastFetch.valueOf()).to.eq(now.valueOf());
        expect(faccount.fetches).to.be.ok;
        expect(faccount.fetches.length).to.eq(0);

        FetchAccount.register(profile, profile.accounts[0], true, function(err, faccount) {

          expect(err).to.be.null;
          expect(faccount).to.be.ok;

          expect(faccount._id.toString()).to.eq(profile.accounts[0]._id.toString());
          expect(faccount.pid.toString()).to.eq(profile._id.toString());
          expect(faccount.plan).to.eq('PAYWYU');
          expect(faccount.prio).to.eq(1);
          expect(faccount.interval).to.eq(300);
          expect(faccount.nextFetch.valueOf()).to.eq(now2.clone().add(faccount.interval, 'seconds').valueOf());
          expect(faccount.lastFetch.valueOf()).to.eq(now2.valueOf());
          expect(faccount.fetches).to.be.ok;
          expect(faccount.fetches.length).to.eq(0);

          done();
        }, now2);
      }, now);
    });
  });

  it('should update plan of enabled account', function(done) {
    new Profile({
      accounts: [{pid: '1',network: 2,account: 3},{pid: '2',network: 3,account: 4}]
    }).save(function(err, profile) {

      expect(err).to.be.null;
      expect(profile).to.be.ok;

      var now = moment.utc();

      FetchAccount.register(profile, profile.accounts[0], false, function(err, faccount) {

        expect(err).to.be.null;
        expect(faccount).to.be.ok;

        profile.plan.name = 'STARTER';

        FetchAccount.updatePlan(profile, function(err, updates) {

          expect(err).to.be.undefined;
          expect(updates).not.to.be.null;
          expect(updates.length).to.eq(2);
          expect(updates[0]).to.deep.eq({ok:1, n:1});
          expect(updates[1]).to.deep.eq({ok:1, n:1});

          FetchAccount.findById(profile.accounts[0]._id, function(err, faccount) {

            expect(err).to.be.null;
            expect(faccount).to.be.ok;

            expect(faccount._id.toString()).to.eq(profile.accounts[0]._id.toString());
            expect(faccount.pid.toString()).to.eq(profile._id.toString());
            expect(faccount.plan).to.eq('STARTER');
            expect(faccount.prio).to.eq(1);
            expect(faccount.interval).to.eq(300);
            expect(faccount.nextFetch.valueOf()).to.eq(now.clone().add(faccount.interval, 'seconds').valueOf());
            expect(faccount.lastFetch.valueOf()).to.eq(now.valueOf());
            expect(faccount.fetches).to.be.ok;
            expect(faccount.fetches.length).to.eq(0);

            done();
          });
        }, now);
      }, now);
    });
  });

  it('should update plan of disabled account', function(done) {
    new Profile({
      accounts: [{pid: '1',network: 2,account: 3, state:States.account.disabled.code},{pid: '2',network: 3,account: 4}]
    }).save(function(err, profile) {

      expect(err).to.be.null;
      expect(profile).to.be.ok;

      var now = moment.utc();

      FetchAccount.register(profile, profile.accounts[0], false, function(err, faccount) {

        expect(err).to.be.null;
        expect(faccount).to.be.ok;

        profile.plan.name = 'STARTER';

        FetchAccount.updatePlan(profile, function(err, updates) {

          expect(err).to.be.undefined;
          expect(updates).not.to.be.null;
          expect(updates.length).to.eq(2);
          expect(updates[0]).to.deep.eq({ok:1, n:1});
          expect(updates[1]).to.deep.eq({ok:1, n:0, upserted: []});

          FetchAccount.findById(profile.accounts[0]._id, function(err, faccount) {

            expect(err).to.be.null;
            expect(faccount).to.be.ok;

            expect(faccount._id.toString()).to.eq(profile.accounts[0]._id.toString());
            expect(faccount.pid.toString()).to.eq(profile._id.toString());
            expect(faccount.plan).to.eq('STARTER');
            expect(faccount.prio).to.eq(1);
            expect(faccount.interval).to.eq(300);
            expect(faccount.nextFetch).to.be.null;
            expect(faccount.lastFetch.valueOf()).to.eq(now.valueOf());
            expect(faccount.fetches).to.be.ok;
            expect(faccount.fetches.length).to.eq(0);

            done();
          });
        }, now);
      }, now);
    });
  });

  it('should enable and disable account', function(done) {
    new Profile({
      accounts: [{pid: '1',network: 2,account: 3, state:States.account.disabled.code},{pid: '2',network: 3,account: 4}]
    }).save(function(err, profile) {

      expect(err).to.be.null;
      expect(profile).to.be.ok;

      var now = moment.utc();

      FetchAccount.register(profile, profile.accounts[0], false, function(err, faccount) {

        expect(err).to.be.null;
        expect(faccount).to.be.ok;
        expect(faccount.nextFetch).to.be.null;

        FetchAccount.enable(profile.accounts[0], function(err, updated) {

          expect(err).to.be.null;
          expect(updated).to.deep.eq({ok:1, n:1});

          FetchAccount.findById(profile.accounts[0]._id, function(err, faccount) {

            expect(err).to.be.null;
            expect(faccount).to.be.ok;
            expect(faccount.nextFetch).not.to.be.null;
            expect(faccount.nextFetch.valueOf()).to.eq(now.clone().add(faccount.interval, 'seconds').valueOf());

            FetchAccount.disable(profile.accounts[0], function(err, updated) {

              expect(err).to.be.null;
              expect(updated).to.deep.eq({ok:1, n:1});

              FetchAccount.findById(profile.accounts[0]._id, function(err, faccount) {

                expect(err).to.be.null;
                expect(faccount).to.be.ok;
                expect(faccount.nextFetch).to.be.null;

                done();
              });
            }, now);
          });
        }, now);
      }, now);
    });
  });

  it('should update FetchAccount last fetch', function(done) {
    new Profile({
      accounts: [{pid: '1',network: 2,account: 3},{pid: '2',network: 3,account: 4}]
    }).save(function(err, profile) {

      expect(err).to.be.null;
      expect(profile).to.be.ok;

      FetchAccount.register(profile, profile.accounts[0], false, function(err, faccount) {

        expect(err).to.be.null;
        expect(faccount).to.be.ok;

        var now = moment.utc().add(1, 'days');

        FetchAccount.updateLastFetch(profile, profile.accounts[0], function(err, updated) {

          expect(err).to.be.null;
          expect(updated).to.deep.eq({ok:1, n:1});

          FetchAccount.findById(profile.accounts[0]._id, function(err, faccount) {

            expect(err).to.be.null;
            expect(faccount).to.be.ok;

            expect(faccount.lastFetch.valueOf()).to.eq(now.valueOf());

            done();
          });
        }, now);
      });
    });
  });
});
