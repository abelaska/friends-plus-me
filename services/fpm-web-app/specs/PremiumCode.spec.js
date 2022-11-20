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
    PremiumCode = require(__dirname+'/../src/models/PremiumCode'),
    Profile = require(__dirname+'/../src/models/Profile').Profile;

describe('PremiumCode', function() {

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
      async.apply(removeAll, Profile)
    ], done);
  });

  it('should not find code', function(done) {
    var findCode = 'code';
    PremiumCode.findByCode(findCode, function(err, code) {
      expect(err).to.deep.eq({error: {
        code: 'CODE_NOT_FOUND',
        message: 'No valid promo code "'+findCode+'" found'
      }});
      expect(code).to.be.undefined;
      done();
    });
  });

  it('should not apply non existing code to profile', function(done) {
    var findCode = 'code';
    var now = moment.utc();
    var profile = new Profile({
      _id: new ObjectId()
    });
    PremiumCode.applyToProfile(findCode, profile, function(err, code) {
      expect(err).to.deep.eq({error: {
        code: 'CODE_NOT_FOUND',
        message: 'No valid promo code "'+findCode+'" found'
      }});
      expect(code).to.be.undefined;
      done();
    }, now);
  });

  it('should not find expired code', function(done) {
    var findCode = 'code';
    var now = moment.utc();

    PremiumCode.create({
      code: findCode,
      validFrom: now.clone().subtract(10, 'days').toDate(),
      validUntil: now.clone().subtract(5, 'days').toDate()
    }, function(err, code) {
      expect(err).to.be.null;
      expect(code).to.be.ok;

      PremiumCode.findByCode(findCode, function(err, code) {
        expect(err).to.deep.eq({error: {
          code: 'CODE_NOT_FOUND',
          message: 'No valid promo code "'+findCode+'" found'
        }});
        expect(code).to.be.undefined;
        done();
      });
    });
  });

  it('should find code', function(done) {
    var findCode = 'code';
    var now = moment.utc();

    PremiumCode.create({
      code: findCode,
      validFrom: now.clone().subtract(10, 'days').toDate(),
      validUntil: now.clone().add(10, 'days').toDate()
    }, function(err, code) {
      expect(err).to.be.null;
      expect(code).to.be.ok;

      PremiumCode.findByCode(findCode, function(err, foundCode) {
        expect(err).to.be.null;
        expect(foundCode).to.be.ok;
        expect(foundCode._id.toString()).to.eq(code._id.toString());
        done();
      });
    })
  });

  it('should apply code', function(done) {
    var findCode = 'code';
    var now = moment.utc();

    PremiumCode.create({
      amount: 1,
      code: findCode,
      validFrom: now.clone().subtract(10, 'days').toDate(),
      validUntil: now.clone().add(10, 'days').toDate()
    }, function(err, code) {
      expect(err).to.be.null;
      expect(code).to.be.ok;

      PremiumCode.apply(code, function(err, appliedCode) {
        expect(err).to.be.null;
        expect(appliedCode).to.be.ok;
        expect(appliedCode._id.toString()).to.eq(code._id.toString());

        PremiumCode.findOne(code._id, function(err, updatedCode) {
          expect(err).to.be.null;
          expect(updatedCode).to.be.ok;
          expect(updatedCode._id.toString()).to.eq(code._id.toString());

          expect(updatedCode.applied).to.be.ok;
          expect(updatedCode.applied.count).to.eq(1);
          expect(updatedCode.applied.amount).to.eq(1);
          expect(moment.utc(updatedCode.applied.last).format()).to.eq(moment.utc().format());

          done();
        });
      }, now);
    })
  });

  it('should not apply non existing code to profile', function(done) {
    var findCode = 'code';
    var now = moment.utc();
    var profile = new Profile({
      _id: new ObjectId()
    });
    PremiumCode.create({
      amount: 1, // $1
      code: findCode,
      expireInDays: 100,
      validFrom: now.clone().subtract(10, 'days').toDate(),
      validUntil: now.clone().add(10, 'days').toDate()
    }, function(err, code) {
      expect(err).to.be.null;
      expect(code).to.be.ok;

      PremiumCode.applyToProfile(findCode, profile, function(err, appliedCode, premium) {

        expect(err).to.be.null;
        expect(appliedCode).to.be.ok;
        expect(appliedCode._id.toString()).to.eq(code._id.toString());

        expect(premium).to.be.ok;
        expect(premium.pid).to.be.ok;
        expect(premium.pid.valueOf()).to.eq(profile._id.valueOf());
        expect(premium.amount).to.eq(Math.floor(code.amount*1000000));
        expect(premium.debit).to.be.undefined;
        expect(premium.credit).to.be.ok;
        expect(premium.credit.available).to.eq(Math.floor(code.amount*1000000));
        expect(premium.credit.debited).to.eq(0);
        expect(premium.credit.source).to.eq('promocode');
        expect(premium.credit.sourceId).to.eq(code._id.toString());
        expect(premium.credit.expiresAt).to.be.ok;
        expect(moment.utc(premium.credit.expiresAt).format()).to.eq(now.clone().add(code.expireInDays, 'days').format());

        PremiumCode.findOne(code._id, function(err, updatedCode) {
          expect(err).to.be.null;
          expect(updatedCode).to.be.ok;
          expect(updatedCode._id.toString()).to.eq(code._id.toString());

          expect(updatedCode.applied).to.be.ok;
          expect(updatedCode.applied.count).to.eq(1);
          expect(updatedCode.applied.amount).to.eq(1);
          expect(moment.utc(updatedCode.applied.last).format()).to.eq(moment.utc().format());

          done();
        });
      }, now);
    });
  });

  it('should not apply already applied code', function(done) {
    var findCode = 'code';
    var now = moment.utc();
    var profile = new Profile({
      _id: new ObjectId()
    });
    PremiumCode.create({
      amount: 1, // $1
      code: findCode,
      expireInDays: 100,
      validFrom: now.clone().subtract(10, 'days').toDate(),
      validUntil: now.clone().add(10, 'days').toDate()
    }, function(err, code) {
      expect(err).to.be.null;
      expect(code).to.be.ok;

      PremiumCode.applyToProfile(findCode, profile, function(err, appliedCode, premium) {

        expect(err).to.be.null;
        expect(appliedCode).to.be.ok;
        expect(premium).to.be.ok;

        PremiumCode.applyToProfile(findCode, profile, function(err, appliedCode2, premium2) {
          expect(err).to.be.deep.eq({ error:
           { code: 'CODE_ALREADY_APPLIED',
             message: 'Promo code "'+code.code+'" already applied' } });
          expect(appliedCode2).to.be.undefined;
          expect(premium2).to.be.undefined;
          done();
        });
      }, now);
    });
  });

  it('should not apply limited code', function(done) {
    var findCode = 'code';
    var now = moment.utc();
    var profile = new Profile({
      _id: new ObjectId()
    });
    var profile2 = new Profile({
      _id: new ObjectId()
    });
    PremiumCode.create({
      amount: 1, // $1
      code: findCode,
      expireInDays: 100,
      limits: {
        count: 1
      },
      validFrom: now.clone().subtract(10, 'days').toDate(),
      validUntil: now.clone().add(10, 'days').toDate()
    }, function(err, code) {
      expect(err).to.be.null;
      expect(code).to.be.ok;

      PremiumCode.applyToProfile(findCode, profile, function(err, appliedCode, premium) {

        expect(err).to.be.null;
        expect(appliedCode).to.be.ok;
        expect(premium).to.be.ok;

        PremiumCode.applyToProfile(findCode, profile2, function(err, appliedCode2, premium2) {
          expect(err).to.be.deep.eq({error: {
            code: 'CODE_NO_LONGER_VALID',
            message: 'Promo code "'+code.code+'" is no longer valid'
          }});
          expect(appliedCode2).to.be.undefined;
          expect(premium2).to.be.undefined;
          done();
        });
      }, now);
    });
  });
});
