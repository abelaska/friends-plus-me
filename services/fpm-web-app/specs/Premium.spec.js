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
    Premium = require(__dirname+'/../src/models/Premium'),
    Profile = require(__dirname+'/../src/models/Profile').Profile;

describe('Premium', function() {

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
      async.apply(removeAll, Profile)
    ], done);
  });

  it('should check un/expired credit', function() {
    expect((new Premium({
      credit: {
        expiresAt: moment.utc().subtract(1, 'days').toDate()
      }
    })).isCreditExpired).to.be.true;
    expect((new Premium({
      credit: {
        expiresAt: moment.utc().add(1, 'days').toDate()
      }
    })).isCreditExpired).to.be.false;
  });

  it('should credit trial', function(done) {
    var profileId = new ObjectId();
    var amount = 1.23;
    var source = 'trial';
    var sourceId = 'signup';
    var expireInDays = 20;
    var now = moment.utc();
    Premium.credit(profileId, amount, source, sourceId, expireInDays, function(err, premium) {
      expect(err).to.be.null;
      expect(premium).to.be.ok;
      expect(premium.pid).to.be.ok;
      expect(premium.pid.valueOf()).to.eq(profileId.valueOf());
      expect(premium.amount).to.eq(Math.floor(amount*1000000));
      expect(premium.debit).to.be.undefined;
      expect(premium.credit).to.be.ok;
      expect(premium.credit.available).to.eq(Math.floor(amount*1000000));
      expect(premium.credit.debited).to.eq(0);
      expect(premium.credit.source).to.eq(source);
      expect(premium.credit.sourceId).to.eq(sourceId);
      expect(premium.credit.expiresAt).to.be.ok;
      expect(moment.utc(premium.credit.expiresAt).format()).to.eq(now.clone().add(expireInDays, 'days').format());
      done();
    }, now);
  });

  it('should return zero balance', function(done) {
    var profileId = new ObjectId();
    Premium.balance(profileId, function(err, balance, premiums) {
      expect(err).to.be.null;
      expect(premiums).to.be.ok;
      expect(premiums).to.be.empty;
      expect(balance).to.eq(0);
      done();
    });
  });

  it('should return balance', function(done) {
    var profileId = new ObjectId();
    var amounts = [1,2,3,4];
    Premium.credit(profileId, amounts[0], 'source', 'sourceId', -10, function(err, premium) {
      expect(err).to.be.null;
      expect(premium).to.be.ok;

      Premium.credit(profileId, amounts[1], 'source', 'sourceId', 0, function(err, premium) {
        expect(err).to.be.null;
        expect(premium).to.be.ok;

        Premium.credit(profileId, amounts[2], 'source', 'sourceId', 1, function(err, premium) {
          expect(err).to.be.null;
          expect(premium).to.be.ok;

          Premium.credit(profileId, amounts[3], 'source', 'sourceId', 2, function(err, premium) {
            expect(err).to.be.null;
            expect(premium).to.be.ok;

            Premium.balance(profileId, function(err, balance, premiums) {
              expect(err).to.be.null;
              expect(premiums).to.be.ok;
              expect(premiums).to.have.lengthOf(2);
              expect(balance).to.eq(Math.floor((amounts[2]+amounts[3])*1000000));
              done();
            });
          });
        });
      });
    });
  });

  it('should credit trial with extended other premium', function(done) {
    var profileId = new ObjectId();
    var amount = 1.23;
    var source = 'tx';
    var sourceId = 'signup';
    var expireInDays = 20;
    var now = moment.utc();

    config.set('premium:'+source+':expireInDays', expireInDays);

    Premium.credit(profileId, amount, source, sourceId, expireInDays-4, function(err, premium) {
      expect(err).to.be.null;
      expect(premium).to.be.ok;
      expect(moment.utc(premium.credit.expiresAt).format()).to.eq(now.clone().add(expireInDays-4, 'days').format());

      var amount2 = 10.23;
      var source2 = 'tx';
      var sourceId2 = 'signup2';
      var expireInDays2 = 40;

      Premium.credit(profileId, amount2, source2, sourceId2, expireInDays2, function(err, premium2) {
        expect(err).to.be.null;
        expect(premium2).to.be.ok;
        expect(premium2.pid).to.be.ok;
        expect(premium2.pid.toString()).to.eq(profileId.toString());
        expect(premium2.amount).to.eq(Math.floor(amount2*1000000));
        expect(premium2.debit).to.be.undefined;
        expect(premium2.credit).to.be.ok;
        expect(premium2.credit.available).to.eq(Math.floor(amount2*1000000));
        expect(premium2.credit.debited).to.eq(0);
        expect(premium2.credit.source).to.eq(source2);
        expect(premium2.credit.sourceId).to.eq(sourceId2);
        expect(premium2.credit.expiresAt).to.be.ok;
        expect(moment.utc(premium2.credit.expiresAt).format()).to.eq(now.clone().add(expireInDays2, 'days').format());

        Premium.findOne({_id: premium._id}, function(err, extendedPremium) {
          expect(err).to.be.null;
          expect(extendedPremium).to.be.ok;
          expect(extendedPremium.pid).to.be.ok;
          expect(extendedPremium.pid.toString()).to.eq(profileId.toString());
          expect(extendedPremium.amount).to.eq(Math.floor(amount*1000000));
          expect(extendedPremium.debit).to.be.undefined;
          expect(extendedPremium.credit).to.be.ok;
          expect(extendedPremium.credit.available).to.eq(Math.floor(amount*1000000));
          expect(extendedPremium.credit.debited).to.eq(0);
          expect(extendedPremium.credit.source).to.eq(source);
          expect(extendedPremium.credit.sourceId).to.eq(sourceId);
          expect(extendedPremium.credit.expiresAt).to.be.ok;
          expect(moment.utc(extendedPremium.credit.expiresAt).format()).to.eq(now.clone().add(expireInDays, 'days').format());

          var profileId2 = new ObjectId();

          Premium.credit(profileId2, amount2, source2, sourceId2, expireInDays2, function(err, premium2) {
            expect(err).to.be.null;
            expect(premium2).to.be.ok;

            Premium.findOne({_id: premium._id}, function(err, notExtendedPremium) {
              expect(err).to.be.null;
              expect(notExtendedPremium).to.be.ok;
              expect(moment.utc(notExtendedPremium.credit.expiresAt).format()).to.eq(now.clone().add(expireInDays, 'days').format());
              done();
            });
          });
        });
      }, now);
    }, now);
  });

  it('should fail debit on insufficient funds', function(done) {
    var profileId = new ObjectId();
    var now = moment.utc();
    var userIds = [new ObjectId().toString(), new ObjectId().toString()];
    var profile = new Profile({
      _id: new ObjectId(),
      premium: {
        metrics: {
          member:            1,
          sourceAccount:     2,
          connectedAccount:  3
        }
      }
    });

    Premium.debit(profile, 'member', userIds, function(err, premium) {
      expect(premium).to.be.undefined;
      expect(err).to.be.ok;
      expect(err).to.deep.eq({
        code: 'INSUFFICIENT_FUNDS',
        amount: userIds.length * Math.floor((profile.premium.metrics.member * 1000000) / (365 / 12)),
        balance: 0,
        message: 'Insufficient funds'
      });
      done();
    }, now);
  });

  it('should fail debit because of insufficient funds', function(done) {
    var profileId = new ObjectId();
    var now = moment.utc();
    var userIds = [new ObjectId().toString(), new ObjectId().toString()];
    var profile = new Profile({
      _id: new ObjectId(),
      premium: {
        metrics: {
          member:            1,
          sourceAccount:     2,
          connectedAccount:  3
        }
      }
    });

    Premium.debit(profile, 'member', userIds, function(err, premium) {
      expect(premium).to.be.undefined;
      expect(err).to.be.ok;
      expect(err).to.deep.eq({
        code: 'INSUFFICIENT_FUNDS',
        amount: userIds.length * Math.floor((profile.premium.metrics.member * 1000000) / (365 / 12)),
        balance: 0,
        message: 'Insufficient funds'
      });
      done();
    }, now);
  });

  it('should debit from one credit', function(done) {
    var profileId = new ObjectId();
    var now = moment.utc();
    var userIds = [new ObjectId().toString(), new ObjectId().toString(), new ObjectId().toString()];
    var profile = new Profile({
      _id: new ObjectId(),
      premium: {
        metrics: {
          member:            1,
          sourceAccount:     2,
          connectedAccount:  3
        }
      }
    });

    Premium.credit(profile._id, 10, 'source', 'sourceId', -1, function(err, expiredPremium) {
      expect(expiredPremium).to.be.ok;
      expect(err).to.be.null;

      Premium.credit(profile._id, 1, 'source', 'sourceId', 1, function(err, credit1) {
        expect(credit1).to.be.ok;
        expect(err).to.be.null;

        Premium.credit(profile._id, 4, 'source', 'sourceId', 2, function(err, credit2) {
          expect(credit1).to.be.ok;
          expect(err).to.be.null;

          Premium.debit(profile, 'member', userIds, function(err, premium) {
            expect(premium).to.be.ok;
            expect(err).to.be.null;
            expect(premium.pid.toString()).to.eq(profile._id.toString());
            expect(premium.amount).to.eq(-Math.floor(profile.premium.metrics.member*1000000/ (365 / 12))*userIds.length);
            expect(premium.debit).to.be.ok;
            expect(premium.debit.metric).to.eq('member');
            expect(premium.debit.metricIds).to.be.ok;
            expect(premium.debit.metricIds).to.have.lengthOf(3);
            expect(premium.debit.metricIds).to.deep.eq([userIds[0].toString(),userIds[1].toString(),userIds[2].toString()]);
            expect(premium.debit.reconciledBy).to.be.ok;
            expect(premium.debit.reconciledBy).to.have.lengthOf(1);
            expect(premium.debit.reconciledBy[0]).to.deep.eq({creditId: credit1._id, amount: -premium.amount});

            Premium.findOne(credit1._id, function(err, _credit1) {
              expect(err).to.be.null;
              expect(_credit1.credit.available).to.eq(credit1.amount-premium.debit.reconciledBy[0].amount);

              done();
            });
          }, now);
        }, now);
      }, now);
    }, now);
  });

  it('should debit from two credits', function(done) {
    var profileId = new ObjectId();
    var now = moment.utc();
    var userIds = [new ObjectId().toString(), new ObjectId().toString(), new ObjectId().toString()];
    var profile = new Profile({
      _id: new ObjectId(),
      premium: {
        metrics: {
          member:            1,
          sourceAccount:     2,
          connectedAccount:  3
        }
      }
    });

    Premium.credit(profile._id, 10, 'source', 'sourceId', -1, function(err, expiredPremium) {
      expect(expiredPremium).to.be.ok;
      expect(err).to.be.null;

      Premium.credit(profile._id, 0.05, 'source', 'sourceId', 1, function(err, credit1) {
        expect(credit1).to.be.ok;
        expect(err).to.be.null;

        Premium.credit(profile._id, 4, 'source', 'sourceId', 2, function(err, credit2) {
          expect(credit1).to.be.ok;
          expect(err).to.be.null;

          Premium.debit(profile, 'member', userIds, function(err, premium) {
            expect(premium).to.be.ok;
            expect(err).to.be.null;
            expect(premium.pid.toString()).to.eq(profile._id.toString());
            expect(premium.amount).to.eq(-Math.floor(profile.premium.metrics.member*1000000/ (365 / 12))*userIds.length);
            expect(premium.debit).to.be.ok;
            expect(premium.debit.metric).to.eq('member');
            expect(premium.debit.metricIds).to.be.ok;
            expect(premium.debit.metricIds).to.have.lengthOf(3);
            expect(premium.debit.metricIds).to.deep.eq([userIds[0].toString(),userIds[1].toString(),userIds[2].toString()]);
            expect(premium.debit.reconciledBy).to.be.ok;
            expect(premium.debit.reconciledBy).to.have.lengthOf(2);
            expect(premium.debit.reconciledBy[0]).to.deep.eq({creditId: credit1._id, amount: credit1.amount});
            expect(premium.debit.reconciledBy[1]).to.deep.eq({creditId: credit2._id, amount: Math.abs(premium.amount+credit1.amount)});

            Premium.findOne(credit1._id, function(err, _credit1) {
              expect(err).to.be.null;
              expect(_credit1.credit.available).to.eq(0);

              Premium.findOne(credit2._id, function(err, _credit2) {
                expect(err).to.be.null;
                expect(_credit2.credit.available).to.eq(credit2.amount-premium.debit.reconciledBy[1].amount);

                done();
              });
            });
          }, now);
        }, now);
      }, now);
    }, now);
  });
});
