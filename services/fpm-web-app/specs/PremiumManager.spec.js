'use strict';

process.env.NODE_ENV = 'test';

var mongoose = require('mongoose'),
    moment = require('moment'),
    async = require('async'),
    expect = require('chai').expect,
    ObjectId = mongoose.Types.ObjectId,
    _ = require('lodash'),
    States = require('../src/lib/States'),
    config = require('../src/lib/config').config,
    AffiliateCommision = require(__dirname+'/../src/models/AffiliateCommision'),
    Premium = require(__dirname+'/../src/models/Premium'),
    Transaction = require(__dirname+'/../src/models/Transaction'),
    PremiumCode = require(__dirname+'/../src/models/PremiumCode'),
    PremiumManager = require(__dirname+'/../src/lib/PremiumManager'),
    Profile = require(__dirname+'/../src/models/Profile').Profile;

describe('PremiumManager', function() {

  var premiumManager = new PremiumManager();

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

  beforeEach(function(done) {
    async.parallel([
      async.apply(removeAll, Premium),
      async.apply(removeAll, PremiumCode),
      async.apply(removeAll, AffiliateCommision),
      async.apply(removeAll, Profile)
    ], done);
  });

  it('should not reconcile day because of insufficient funds', function(done) {

    var profile = new Profile({
      _id: new ObjectId(),
      accounts: [{
        _id: new ObjectId(),
        dir: 0
      }, {
        _id: new ObjectId(),
        dir: 1
      }, {
        _id: new ObjectId(),
        dir: 2
      }],
      members:{
        manager: [new ObjectId(),new ObjectId()],
        owner: [new ObjectId()]
      },
      premium: {
        metrics: {
          member:            1,
          sourceAccount:     2,
          connectedAccount:  3
        }
      }
    });

    premiumManager.costs(profile, function(err, profileCosts) {
      expect(err).to.be.null;
      expect(profileCosts).to.be.ok;

      premiumManager.reconcileDay(profile, profileCosts, function(err, costs, debits) {
        expect(err).to.deep.eq(
         { code: 'INSUFFICIENT_FUNDS',
           amount: 361643,
           balance: 0,
           message: 'Insufficient funds'});
        expect(costs).to.be.undefined;
        expect(debits).to.be.undefined;
        done();
      });
    });
  });

  it('should calculate 14 remaining days', function(done) {

    var profile = new Profile({
      _id: new ObjectId(),
      accounts: [{
        _id: new ObjectId(),
        dir: 0
      }, {
        _id: new ObjectId(),
        dir: 1
      }, {
        _id: new ObjectId(),
        dir: 2
      }],
      members:{
        manager: [new ObjectId(),new ObjectId()],
        owner: [new ObjectId()]
      },
      premium: {
        metrics: {
          member:            1,
          sourceAccount:     2,
          connectedAccount:  3
        }
      }
    });

    var premium = new Premium({
      pid: profile._id,
      amount: 100*1000000,
      credit: {
        source: 'trial',
        expiresAt: moment.utc().add(14, 'days').toDate(),
        available: 100*1000000
      }
    });

    async.parallel({
      profile: async.apply(profile.save.bind(profile)),
      premium: async.apply(premium.save.bind(premium))
    }, function(err, results) {
      expect(err).to.be.undefined;
      expect(results).to.be.ok;

      premiumManager.balance(profile._id, function(err, balance, credits) {
        expect(err).to.be.null;
        expect(balance).to.eq(premium.amount);
        expect(credits).to.be.ok;

        premiumManager.costs(profile, function(err, profileCosts) {
          expect(err).to.be.null;
          expect(profileCosts).to.be.ok;

          premiumManager.remainingDays(profileCosts, balance, credits, function(err, remaining) {
            expect(err).to.be.null;
            expect(remaining).to.be.ok;
            expect(remaining.days).to.eq(14);
            expect(remaining.human).to.eq('2 weeks');
            expect(remaining.isTrial).to.eq(true);
            expect(remaining.isFunded).to.eq(false);
            done();
          });
        });
      });
    });
  });

  it('should calculate 7 remaining days', function(done) {

    var profile = new Profile({
      _id: new ObjectId(),
      accounts: [{
        _id: new ObjectId(),
        dir: 0
      }, {
        _id: new ObjectId(),
        dir: 1
      }, {
        _id: new ObjectId(),
        dir: 2
      }],
      members:{
        manager: [new ObjectId(),new ObjectId()],
        owner: [new ObjectId()]
      },
      premium: {
        metrics: {
          member:            1,
          sourceAccount:     2,
          connectedAccount:  3
        }
      }
    });

    var premium = new Premium({
      pid: profile._id,
      amount: 100*1000000,
      credit: {
        source: 'tx',
        expiresAt: moment.utc().add(7, 'days').toDate(),
        available: 100*1000000
      }
    });

    var premium2 = new Premium({
      pid: profile._id,
      amount: 200*1000000,
      credit: {
        expiresAt: moment.utc().subtract(7, 'days').toDate(),
        available: 200*1000000
      }
    });

    async.parallel({
      profile: async.apply(profile.save.bind(profile)),
      premium: async.apply(premium.save.bind(premium)),
      premium2: async.apply(premium2.save.bind(premium2))
    }, function(err, results) {
      expect(err).to.be.undefined;
      expect(results).to.be.ok;

      premiumManager.balance(profile._id, function(err, balance, credits) {
        expect(err).to.be.null;
        expect(balance).to.eq(premium.amount);
        expect(credits).to.be.ok;
        expect(credits.length).to.eq(1);
        expect(credits[0]._id.toString()).to.eq(premium._id.toString());

        premiumManager.costs(profile, function(err, profileCosts) {
          expect(err).to.be.null;
          expect(profileCosts).to.be.ok;

          premiumManager.remainingDays(profileCosts, balance, credits, function(err, remaining) {
            expect(err).to.be.null;
            expect(remaining).to.be.ok;
            expect(remaining.days).to.eq(7);
            expect(remaining.human).to.eq('1 week');
            expect(remaining.isTrial).to.eq(false);
            expect(remaining.isFunded).to.eq(true);

            done();
          });
        });
      });
    });
  });

  it('should calculate 7 remaining days', function(done) {

    var profile = new Profile({
      _id: new ObjectId(),
      accounts: [{
        _id: new ObjectId(),
        dir: 0
      }, {
        _id: new ObjectId(),
        dir: 1
      }, {
        _id: new ObjectId(),
        dir: 2
      }],
      members:{
        manager: [new ObjectId(),new ObjectId()],
        owner: [new ObjectId()]
      },
      premium: {
        metrics: {
          member:            1,
          sourceAccount:     2,
          connectedAccount:  40
        }
      }
    });

    var premium = new Premium({
      pid: profile._id,
      amount: 10*1000000,
      credit: {
        source: 'trial',
        expiresAt: moment.utc().add(7, 'days').toDate(),
        available: 10*1000000
      }
    });

    var premium2 = new Premium({
      pid: profile._id,
      amount: 200*1000000,
      credit: {
        expiresAt: moment.utc().subtract(7, 'days').toDate(),
        available: 200*1000000
      }
    });

    var premium3 = new Premium({
      pid: profile._id,
      amount: 50*1000000,
      credit: {
        source: 'tx',
        expiresAt: moment.utc().add(16, 'days').toDate(),
        available: 50*1000000
      }
    });

    async.parallel({
      profile: async.apply(profile.save.bind(profile)),
      premium: async.apply(premium.save.bind(premium)),
      premium2: async.apply(premium2.save.bind(premium2)),
      premium3: async.apply(premium3.save.bind(premium3))
    }, function(err, results) {
      expect(err).to.be.undefined;
      expect(results).to.be.ok;

      premiumManager.balance(profile._id, function(err, balance, credits) {
        expect(err).to.be.null;
        expect(balance).to.eq(premium.amount+premium3.amount);
        expect(credits).to.be.ok;
        expect(credits.length).to.eq(2);
        expect(credits[0]._id.toString()).to.eq(premium._id.toString());
        expect(credits[1]._id.toString()).to.eq(premium3._id.toString());

        premiumManager.costs(profile, function(err, profileCosts) {
          expect(err).to.be.null;
          expect(profileCosts).to.be.ok;

          premiumManager.remainingDays(profileCosts, balance, credits, function(err, remaining) {
            expect(err).to.be.null;
            expect(remaining).to.be.ok;
            expect(remaining.days).to.eq(14);
            expect(remaining.human).to.eq('2 weeks');
            expect(remaining.isTrial).to.eq(false);
            expect(remaining.isFunded).to.eq(true);

            done();
          });
        });
      });
    });
  });

  it('should reconcile day', function(done) {

    new Profile({
      _id: new ObjectId(),
      accounts: [{
        _id: new ObjectId(),
        dir: 0
      }, {
        _id: new ObjectId(),
        dir: 1
      }, {
        _id: new ObjectId(),
        dir: 2
      }],
      members:{
        manager: [new ObjectId(),new ObjectId()],
        owner: [new ObjectId()]
      },
      premium: {
        metrics: {
          member:            1,
          sourceAccount:     2,
          connectedAccount:  3
        }
      }
    }).save(function(err, profile) {
      premiumManager.creditTransaction(new Transaction({
        _id: new ObjectId(),
        amount: 10*100
      }), profile, function(err, credit) {
        expect(err).to.be.undefined;
        expect(credit).to.be.ok;

        premiumManager.costs(profile, function(err, profileCosts) {
          expect(err).to.be.null;
          expect(profileCosts).to.be.ok;

          premiumManager.reconcileDay(profile, profileCosts, function(err, costs, debits) {
            expect(err).to.be.undefined;

            expect(debits).to.be.ok;
            expect(debits).to.have.lengthOf(2);

            expect(debits[0].amount).to.eq(-65752);
            expect(debits[0].debit).to.deep.eq({
              reconciledBy: [ { creditId: credit._id, amount: 65752 } ],
              metric: 'member',
              metricIds: [profile.members.manager[0].toString(),profile.members.manager[1].toString()]});

            expect(debits[1].amount).to.eq(-295890);
            expect(debits[1].debit).to.deep.eq({
              reconciledBy: [ { creditId: credit._id, amount: 295890 } ],
              metric: 'connectedAccount',
              metricIds: [profile.accounts[0]._id.toString(),profile.accounts[1]._id.toString(),profile.accounts[2]._id.toString()]});

            expect(costs).to.be.ok;
            expect(costs.monthly).to.eq(costs.metrics.connectedAccount.monthly+costs.metrics.member.monthly+costs.metrics.sourceAccount.monthly);
            expect(costs.daily).to.eq(costs.metrics.connectedAccount.daily+costs.metrics.member.daily+costs.metrics.sourceAccount.daily);

            expect(costs.metrics.connectedAccount).to.be.ok;
            expect(costs.metrics.connectedAccount.unitPrice).to.eq(profile.premium.metrics.connectedAccount*1000000);
            expect(costs.metrics.connectedAccount.count).to.eq(profile.accounts.length);
            expect(costs.metrics.connectedAccount.monthly).to.eq(profile.premium.metrics.connectedAccount*1000000*profile.accounts.length);
            expect(costs.metrics.connectedAccount.daily).to.eq(Math.floor(profile.premium.metrics.connectedAccount*1000000*profile.accounts.length/(365/12)));
            expect(costs.metrics.connectedAccount.ids).to.deep.eq(_.map(profile.accounts, function(a) { return a._id.toString() }));

            expect(costs.metrics.member).to.be.ok;
            expect(costs.metrics.member.unitPrice).to.eq(profile.premium.metrics.member*1000000);
            expect(costs.metrics.member.monthly).to.eq(profile.premium.metrics.member*1000000*2);
            expect(costs.metrics.member.daily).to.eq(Math.floor(profile.premium.metrics.member*1000000*2/(365/12)));
            expect(costs.metrics.member.ids).to.have.lengthOf(2);
            expect(costs.metrics.member.ids).to.deep.eq(_.map(profile.members.manager, function(a) { return a.toString() }));

            expect(costs.metrics.sourceAccount).to.be.ok;
            expect(costs.metrics.sourceAccount.unitPrice).to.eq(profile.premium.metrics.sourceAccount*1000000);
            expect(costs.metrics.sourceAccount.monthly).to.eq(0);
            expect(costs.metrics.sourceAccount.daily).to.eq(0);
            expect(costs.metrics.sourceAccount.ids).to.have.lengthOf(0);
            expect(costs.metrics.sourceAccount.ids).to.deep.eq([]);

            Premium.findOne(credit._id, function(err, _credit) {
              expect(err).to.be.null;
              expect(_credit).to.be.ok;
              expect(_credit.credit.debited).to.eq(-(debits[0].amount+debits[1].amount));
              expect(_credit.credit.debits).to.eq(2);
              done();
            });
          });
        });
      });
    });
  });

  it('should reconcile day with one account already paid for', function(done) {

    new Profile({
      _id: new ObjectId(),
      accounts: [{
        _id: new ObjectId(),
        dir: 0
      }, {
        _id: new ObjectId(),
        dir: 1
      }, {
        _id: new ObjectId(),
        dir: 2
      }],
      members:{
        manager: [new ObjectId(),new ObjectId()],
        owner: [new ObjectId()]
      },
      premium: {
        metrics: {
          member:            1,
          sourceAccount:     2,
          connectedAccount:  3
        }
      }
    }).save(function(err, profile) {
      premiumManager.creditTransaction(new Transaction({
        _id: new ObjectId(),
        amount: 10*100
      }), profile, function(err, credit) {
        expect(err).to.be.undefined;
        expect(credit).to.be.ok;

        Premium.debit(profile, 'connectedAccount', [profile.accounts[0]._id.toString()], function(err, debit) {
          expect(err).to.be.null;
          expect(debit).to.be.ok;

          premiumManager.costs(profile, function(err, profileCosts) {
            expect(err).to.be.null;
            expect(profileCosts).to.be.ok;

            premiumManager.reconcileDay(profile, profileCosts, function(err, costs, debits) {
              expect(err).to.be.undefined;

              expect(debits).to.be.ok;
              expect(debits).to.have.lengthOf(3);

              expect(debits[0].amount).to.eq(-98630);
              expect(debits[0].debit).to.deep.eq({
                reconciledBy: [ { creditId: credit._id, amount: 98630 } ],
                metric: 'connectedAccount',
                metricIds: [profile.accounts[0]._id.toString()]});

              expect(debits[1].amount).to.eq(-65752);
              expect(debits[1].debit).to.deep.eq({
                reconciledBy: [ { creditId: credit._id, amount: 65752 } ],
                metric: 'member',
                metricIds: [profile.members.manager[0].toString(),profile.members.manager[1].toString()]});

              expect(debits[2].amount).to.eq(-197260);
              expect(debits[2].debit).to.deep.eq({
                reconciledBy: [ { creditId: credit._id, amount: 197260 } ],
                metric: 'connectedAccount',
                metricIds: [profile.accounts[1]._id.toString(),profile.accounts[2]._id.toString()]});

              expect(costs).to.be.ok;
              expect(costs.monthly).to.eq(costs.metrics.connectedAccount.monthly+costs.metrics.member.monthly+costs.metrics.sourceAccount.monthly);
              expect(costs.daily).to.eq(costs.metrics.connectedAccount.daily+costs.metrics.member.daily+costs.metrics.sourceAccount.daily);

              expect(costs.metrics.connectedAccount).to.be.ok;
              expect(costs.metrics.connectedAccount.unitPrice).to.eq(profile.premium.metrics.connectedAccount*1000000);
              expect(costs.metrics.connectedAccount.count).to.eq(profile.accounts.length);
              expect(costs.metrics.connectedAccount.monthly).to.eq(profile.premium.metrics.connectedAccount*1000000*profile.accounts.length);
              expect(costs.metrics.connectedAccount.daily).to.eq(Math.floor(profile.premium.metrics.connectedAccount*1000000*profile.accounts.length/(365/12)));
              expect(costs.metrics.connectedAccount.ids).to.deep.eq(_.map(profile.accounts, function(a) { return a._id.toString() }));

              expect(costs.metrics.member).to.be.ok;
              expect(costs.metrics.member.unitPrice).to.eq(profile.premium.metrics.member*1000000);
              expect(costs.metrics.member.monthly).to.eq(profile.premium.metrics.member*1000000*2);
              expect(costs.metrics.member.daily).to.eq(Math.floor(profile.premium.metrics.member*1000000*2/(365/12)));
              expect(costs.metrics.member.ids).to.have.lengthOf(2);
              expect(costs.metrics.member.ids).to.deep.eq(_.map(profile.members.manager, function(a) { return a.toString() }));

              expect(costs.metrics.sourceAccount).to.be.ok;
              expect(costs.metrics.sourceAccount.unitPrice).to.eq(profile.premium.metrics.sourceAccount*1000000);
              expect(costs.metrics.sourceAccount.monthly).to.eq(0);
              expect(costs.metrics.sourceAccount.daily).to.eq(0);
              expect(costs.metrics.sourceAccount.ids).to.have.lengthOf(0);
              expect(costs.metrics.sourceAccount.ids).to.deep.eq([]);

              Premium.findOne(credit._id, function(err, _credit) {
                expect(err).to.be.null;
                expect(_credit).to.be.ok;
                expect(_credit.credit.debited).to.eq(-(_.reduce(debits, function(sum, debit) { return sum + debit.amount; }, 0)));
                expect(_credit.credit.debits).to.eq(3);
                done();
              });
            });
          });
        }, moment.utc().subtract(1, 'days'));
      });
    });
  });

  it('should return profile costs with no source account', function(done) {

    var profile = new Profile({
      _id: new ObjectId(),
      accounts: [{
        _id: new ObjectId(),
        dir: 0
      }, {
        _id: new ObjectId(),
        dir: 1
      }, {
        _id: new ObjectId(),
        dir: 2
      }],
      members:{
        manager: [new ObjectId(),new ObjectId()],
        owner: [new ObjectId()]
      },
      premium: {
        metrics: {
          member:            1,
          sourceAccount:     2,
          connectedAccount:  3
        }
      }
    });

    premiumManager.costs(profile, function(err, costs) {
      expect(err).to.be.null;
      expect(costs).to.be.ok;

      expect(costs.monthly).to.eq(costs.metrics.connectedAccount.monthly+costs.metrics.member.monthly+costs.metrics.sourceAccount.monthly);
      expect(costs.daily).to.eq(costs.metrics.connectedAccount.daily+costs.metrics.member.daily+costs.metrics.sourceAccount.daily);

      expect(costs.metrics.connectedAccount).to.be.ok;
      expect(costs.metrics.connectedAccount.unitPrice).to.eq(profile.premium.metrics.connectedAccount*1000000);
      expect(costs.metrics.connectedAccount.count).to.eq(profile.accounts.length);
      expect(costs.metrics.connectedAccount.monthly).to.eq(profile.premium.metrics.connectedAccount*1000000*profile.accounts.length);
      expect(costs.metrics.connectedAccount.daily).to.eq(Math.floor(profile.premium.metrics.connectedAccount*1000000*profile.accounts.length/(365/12)));
      expect(costs.metrics.connectedAccount.ids).to.deep.eq(_.map(profile.accounts, function(a) { return a._id.toString() }));

      expect(costs.metrics.member).to.be.ok;
      expect(costs.metrics.member.unitPrice).to.eq(profile.premium.metrics.member*1000000);
      expect(costs.metrics.member.monthly).to.eq(profile.premium.metrics.member*1000000*2);
      expect(costs.metrics.member.daily).to.eq(Math.floor(profile.premium.metrics.member*1000000*2/(365/12)));
      expect(costs.metrics.member.ids).to.have.lengthOf(2);
      expect(costs.metrics.member.ids).to.deep.eq(_.map(profile.members.manager, function(a) { return a.toString() }));

      expect(costs.metrics.sourceAccount).to.be.ok;
      expect(costs.metrics.sourceAccount.unitPrice).to.eq(profile.premium.metrics.sourceAccount*1000000);
      expect(costs.metrics.sourceAccount.monthly).to.eq(0);
      expect(costs.metrics.sourceAccount.daily).to.eq(0);
      expect(costs.metrics.sourceAccount.ids).to.have.lengthOf(0);
      expect(costs.metrics.sourceAccount.ids).to.deep.eq([]);

      done();
    });
  });

  it('should return profile costs with one source account', function(done) {

    var a0 = new ObjectId();
    var a1 = new ObjectId();
    var profile = new Profile({
      _id: new ObjectId(),
      accounts: [{
        _id: a0,
        state: 0,
        dir: 0,
        token: 'token'
      }, {
        _id: new ObjectId(),
        state: 1,
        dir: 0
      },{
        _id: a1,
        state: 0,
        dir: 1
      },{
        _id: new ObjectId(),
        state: 1,
        dir: 1
      }, {
        _id: new ObjectId(),
        state: 0,
        dir: 2
      }, {
        _id: new ObjectId(),
        state: 1,
        dir: 2
      }],
      routes:[{
        src: a0.toString(),
        ddg:[a1.toString()]
      }],
      members:{
        manager: [new ObjectId(),new ObjectId()],
        owner: [new ObjectId()]
      },
      premium: {
        metrics: {
          member:            1,
          sourceAccount:     2,
          connectedAccount:  3
        }
      }
    });

    premiumManager.costs(profile, function(err, costs) {
      expect(err).to.be.null;
      expect(costs).to.be.ok;

      expect(costs.monthly).to.eq(costs.metrics.connectedAccount.monthly+costs.metrics.member.monthly+costs.metrics.sourceAccount.monthly);
      expect(costs.daily).to.eq(costs.metrics.connectedAccount.daily+costs.metrics.member.daily+costs.metrics.sourceAccount.daily);

      expect(costs.metrics.sourceAccount).to.be.ok;
      expect(costs.metrics.sourceAccount.unitPrice).to.eq(profile.premium.metrics.sourceAccount*1000000);
      expect(costs.metrics.sourceAccount.monthly).to.eq(profile.premium.metrics.sourceAccount*1000000*1);
      expect(costs.metrics.sourceAccount.daily).to.eq(Math.floor(profile.premium.metrics.sourceAccount*1000000*1/(365/12)));
      expect(costs.metrics.sourceAccount.ids).to.have.lengthOf(1);
      expect(costs.metrics.sourceAccount.ids).to.deep.eq([profile.accounts[0]._id.toString()]);

      done();
    });
  });

  it('should return profile costs with two source account', function(done) {

    var a0 = new ObjectId();
    var a1 = new ObjectId();
    var a2 = new ObjectId();
    var profile = new Profile({
      _id: new ObjectId(),
      accounts: [{
        _id: a0,
        state: 0,
        dir: 0,
        token: 'token'
      }, {
        _id: new ObjectId(),
        state: 1,
        dir: 0
      },{
        _id: a1,
        state: 0,
        dir: 1
      },{
        _id: new ObjectId(),
        state: 1,
        dir: 1
      }, {
        _id: a2,
        state: 0,
        dir: 2,
        token: 'token'
      }, {
        _id: new ObjectId(),
        state: 1,
        dir: 2
      }],
      routes:[{
        src: a0.toString(),
        ddg:[a1.toString()]
      },{
        src: a2.toString(),
        ddg:[a1.toString()]
      }],
      members:{
        manager: [new ObjectId(),new ObjectId()],
        owner: [new ObjectId()]
      },
      premium: {
        metrics: {
          member:            1,
          sourceAccount:     2,
          connectedAccount:  3
        }
      }
    });

    premiumManager.costs(profile, function(err, costs) {
      expect(err).to.be.null;
      expect(costs).to.be.ok;

      expect(costs.monthly).to.eq(costs.metrics.connectedAccount.monthly+costs.metrics.member.monthly+costs.metrics.sourceAccount.monthly);
      expect(costs.daily).to.eq(costs.metrics.connectedAccount.daily+costs.metrics.member.daily+costs.metrics.sourceAccount.daily);

      expect(costs.metrics.sourceAccount).to.be.ok;
      expect(costs.metrics.sourceAccount.unitPrice).to.eq(profile.premium.metrics.sourceAccount*1000000);
      expect(costs.metrics.sourceAccount.monthly).to.eq(profile.premium.metrics.sourceAccount*1000000*2);
      expect(costs.metrics.sourceAccount.daily).to.eq(Math.floor(profile.premium.metrics.sourceAccount*1000000*2/(365/12)));
      expect(costs.metrics.sourceAccount.ids).to.have.lengthOf(2);
      expect(costs.metrics.sourceAccount.ids).to.deep.eq([a0.toString(),a2.toString()]);

      done();
    });
  });

  it('should credit using transaction', function(done) {

    var expireInDays = 100;

    config.set('premium:tx:expireInDays', expireInDays);

    var now = moment.utc();

    var tx = new Transaction({
          _id: new ObjectId(),
          amount: 100 // $1
        }),
        amountFixed = Math.floor(tx.amount*1000000/100);

    new Profile({
      _id: new ObjectId(),
      premium: {
        metrics: {
          member:            1,
          sourceAccount:     2,
          connectedAccount:  3
        }
      }
    }).save(function(err, profile) {
      premiumManager.creditTransaction(tx, profile, function(err, premium) {
        expect(err).to.be.undefined;
        expect(premium).to.be.ok;
        expect(premium.amount).to.eq(amountFixed);
        expect(premium.debit).to.be.undefined;
        expect(premium.credit.source).to.eq('tx');
        expect(premium.credit.sourceId).to.eq(tx._id.toString());
        expect(premium.credit.available).to.eq(amountFixed);
        expect(premium.credit.debited).to.eq(0);
        expect(moment.utc(premium.credit.expiresAt).format()).to.eq(now.clone().add(expireInDays, 'days').format());

        done();
      }, now);
    });
  });

  it('should credit using affiliate commision', function(done) {

    var expireInDays = 100;

    config.set('premium:affiliate:expireInDays', expireInDays);

    var now = moment.utc();

    var affiliateCommision = {
          tx: (new ObjectId()).toString(),
          commision: 500 // $5
        },
        amountFixed = Math.floor(affiliateCommision.commision*1000000/100);

    new Profile({
      _id: new ObjectId(),
      premium: {
        metrics: {
          member:            1,
          sourceAccount:     2,
          connectedAccount:  3
        }
      }
    }).save(function(err, profile) {
      premiumManager.creditAffiliate(affiliateCommision, profile, function(err, premium) {
        expect(err).to.be.undefined;
        expect(premium).to.be.ok;
        expect(premium.amount).to.eq(amountFixed);
        expect(premium.debit).to.be.undefined;
        expect(premium.credit.source).to.eq('affiliate');
        expect(premium.credit.sourceId).to.eq(affiliateCommision.tx);
        expect(premium.credit.available).to.eq(amountFixed);
        expect(premium.credit.debited).to.eq(0);
        expect(moment.utc(premium.credit.expiresAt).format()).to.eq(now.clone().add(expireInDays, 'days').format());

        done();
      }, now);
    });
  });

  it('should credit using promo code', function(done) {

    var now = moment.utc();

    new Profile({
      _id: new ObjectId(),
      premium: {
        metrics: {
          member:            1,
          sourceAccount:     2,
          connectedAccount:  3
        }
      }
    }).save(function(err, profile) {
      PremiumCode.create({
        amount: 2, // $2
        code: 'code',
        expireInDays: 100,
        validFrom: now.clone().subtract(10, 'days').toDate(),
        validUntil: now.clone().add(10, 'days').toDate()
      }, function(err, code) {
        expect(err).to.be.null;
        expect(code).to.be.ok;

        var amountFixed = Math.floor(code.amount*1000000);

        premiumManager.creditPromoCode(code.code, profile, function(err, premium, appliedCode) {
          expect(err).to.be.undefined;

          expect(appliedCode).to.be.ok;
          expect(appliedCode._id.toString()).to.eq(code._id.toString());

          expect(premium).to.be.ok;
          expect(premium.amount).to.eq(amountFixed);
          expect(premium.debit).to.be.undefined;
          expect(premium.credit.source).to.eq('promocode');
          expect(premium.credit.sourceId).to.eq(code._id.toString());
          expect(premium.credit.available).to.eq(amountFixed);
          expect(premium.credit.debited).to.eq(0);
          expect(moment.utc(premium.credit.expiresAt).format()).to.eq(now.clone().add(code.expireInDays, 'days').format());

          done();
        }, now);
      });
    });
  });
});
