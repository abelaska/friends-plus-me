'use strict';

process.env.NODE_ENV = 'test';

var mongoose = require('mongoose'),
    config = require('../src/lib/config').config;

mongoose.connect(config.get('db:url'), config.get('db:options'));

var moment = require('moment'),
    async = require('async'),
    expect = require('chai').expect,
    _ = require('underscore'),
    config = require(__dirname+'/../src/lib/config').config,
    Coupon = require(__dirname+'/../src/models/Coupon'),
    DiscountCampaign = require(__dirname+'/../src/models/DiscountCampaign'),
    PricingPlan = require(__dirname+'/../src/models/PricingPlan');

describe('DiscountCampaign', function() {

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
    }], function(plan, cb2) {
      new PricingPlan(plan).save(cb2);
    }, cb);
  }

  beforeEach(function(done) {
    async.parallel([
      async.apply(removeAll, DiscountCampaign),
      async.apply(removeAll, PricingPlan),
      async.apply(removeAll, Coupon),
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

  it('should not apply', function(done) {
    var pid = '11115af163608024520002b2',
        userId = '51cc5af163608024520002b2';
    new DiscountCampaign({
      code: 'code',
      discounts: []
    }).applyOnPlan('BASIC', 'MONTH', {_id:pid}, {_id:userId}, function(err, result) {
      expect(err).to.be.undefined;
      expect(result).to.be.undefined;
      done();
    });
  });

  it('should not apply for BASIC plan', function(done) {
    var pid = '11115af163608024520002b2',
        userId = '51cc5af163608024520002b2';
    new DiscountCampaign({
      code: 'code',
      dd:[{
        plan: 'BUSINESS:',
        dtype: 'percent',
        discount: 10,
        recurring: true
      }]
    }).applyOnPlan('BASIC', 'MONTH', {_id:userId}, {_id:pid}, function(err, result) {
      expect(err).to.be.undefined;
      expect(result).to.be.undefined;
      done();
    });
  });

  it('should apply for MONTH interval', function(done) {
    var pid = '11115af163608024520002b2',
        userId = '51cc5af163608024520002b2';
    (new DiscountCampaign({
      code: 'code',
      discounts: [{
        plan: ':MONTH',
        dtype: 'percent',
        discount: 10,
        recurring: true
      }]
    })).applyOnPlan('BASIC', 'MONTH', {_id:userId,email:'a@b.cz'}, {_id:pid}, function(err, result) {
      expect(err).to.be.null;
      expect(result).to.be.ok;
      expect(result.campaign).to.be.ok;
      expect(result.discount).to.be.ok;
      expect(result.recurring).to.eq(result.discount.recurring);
      expect(result.discountAmount).to.eq(100);
      expect(result.payAmount).to.eq(900);
      done();
    });
  });

  it('should apply fixed discount higher then the price of plan', function(done) {
    var pid = '11115af163608024520002b2',
        userId = '51cc5af163608024520002b2';
    (new DiscountCampaign({
      code: 'code',
      discounts: [{
        plan: ':MONTH',
        dtype: 'fixed',
        discount: 10000,
        recurring: true
      }]
    })).applyOnPlan('BASIC', 'MONTH', {_id:userId,email:'a@b.cz'}, {_id:pid}, function(err, result) {
      expect(err).to.be.null;
      expect(result).to.be.ok;
      expect(result.campaign).to.be.ok;
      expect(result.discount).to.be.ok;
      expect(result.recurring).to.eq(result.discount.recurring);
      expect(result.discountAmount).to.eq(1000);
      expect(result.payAmount).to.eq(0);
      done();
    });
  });

  it('should apply fixed discount lower then the price of plan', function(done) {
    var pid = '11115af163608024520002b2',
        userId = '51cc5af163608024520002b2';
    (new DiscountCampaign({
      code: 'code',
      discounts: [{
        plan: ':MONTH',
        dtype: 'fixed',
        discount: 500,
        recurring: true
      }]
    })).applyOnPlan('BASIC', 'MONTH', {_id:userId,email:'a@b.cz'}, {_id:pid}, function(err, result) {
      expect(err).to.be.null;
      expect(result).to.be.ok;
      expect(result.campaign).to.be.ok;
      expect(result.discount).to.be.ok;
      expect(result.recurring).to.eq(result.discount.recurring);
      expect(result.discountAmount).to.eq(500);
      expect(result.payAmount).to.eq(500);
      done();
    });
  });

  it('should apply for BASIC plan and all intervals', function(done) {
    var pid = '11115af163608024520002b2',
        userId = '51cc5af163608024520002b2';
    (new DiscountCampaign({
      code: 'code',
      discounts: [{
        plan: 'BASIC:',
        dtype: 'percent',
        discount: 10,
        recurring: true
      }]
    })).applyOnPlan('BASIC', 'YEAR', {_id:userId,email:'a@b.cz'}, {_id:pid}, function(err, result) {
      expect(err).to.be.null;
      expect(result).to.be.ok;
      expect(result.campaign).to.be.ok;
      expect(result.discount).to.be.ok;
      expect(result.recurring).to.eq(result.discount.recurring);
      expect(result.discountAmount).to.eq(960);
      expect(result.payAmount).to.eq(8640);
      done();
    });
  });

  it('should not apply for unknown email', function(done) {
    var pid = '11115af163608024520002b2',
        userId = '51cc5af163608024520002b2';
    (new DiscountCampaign({
      code: 'code',
      discounts: [{
        plan: 'BASIC:',
        dtype: 'percent',
        discount: 10,
        recurring: true,
        limits: {emails:['a@b.sk']}
      }]
    })).applyOnPlan('BASIC', 'MONTH', {_id:userId,email:'a@b.cz'}, {_id:pid}, function(err, result) {
      expect(err).to.be.null;
      expect(result).to.be.ok;
      expect(result.campaign).to.be.ok;
      expect(result.discount).to.be.ok;
      expect(result.recurring).to.eq(result.discount.recurring);
      expect(result.discountAmount).to.eq(0);
      expect(result.payAmount).to.eq(1000);
      done();
    });
  });

  it('should apply for known email', function(done) {
    var pid = '11115af163608024520002b2',
        userId = '51cc5af163608024520002b2';
    (new DiscountCampaign({
      code: 'code',
      discounts: [{
        plan: 'BASIC:',
        dtype: 'percent',
        discount: 10,
        recurring: true,
        limits: {emails:['a@b.cz']}
      }]
    })).applyOnPlan('BASIC', 'MONTH', {_id:userId,email:'a@b.cz'}, {_id:pid}, function(err, result) {
      expect(err).to.be.null;
      expect(result).to.be.ok;
      expect(result.campaign).to.be.ok;
      expect(result.discount).to.be.ok;
      expect(result.recurring).to.eq(result.discount.recurring);
      expect(result.discountAmount).to.eq(100);
      expect(result.payAmount).to.eq(900);
      done();
    });
  });

  it('should not find any campaign', function(done) {
    var pid = '11115af163608024520002b2',
        userId = '51cc5af163608024520002b2';
    DiscountCampaign.applyDummy('code', 'BASIC', 'MONTH', {_id:userId,email:'a@b.cz'}, {_id:pid}, function(err, data) {
      expect(err).to.deep.eq({error: {code: 'DISCOUNT_NOT_FOUND',
        message: 'Valid discount campaign with code "code" not found'}});
      expect(data).to.be.undefined;
      done();
    });
  });

  it('should find campaign', function(done) {
    var pid = '11115af163608024520002b2',
        userId = '51cc5af163608024520002b2',
        validFrom = moment.utc().subtract('days', 10),
        validUntil = moment.utc().add('days', 10);
    var d = new DiscountCampaign({
      code: 'code',
      validFrom: validFrom.toDate(),
      validUntil: validUntil.toDate(),
      discounts: [{
        plan: 'BASIC:',
        dtype: 'percent',
        discount: 10,
        recurring: true
      }]
    });
    d.save(function(err, d) {
      expect(err).to.be.null;
      expect(d).to.be.ok;    

      DiscountCampaign.applyDummy(d.code, 'BASIC', 'MONTH', {_id:userId,email:'a@b.cz'}, {_id:pid}, function(err, result) {
        expect(err).to.be.null;
        expect(result).to.be.ok;
        expect(result.campaign).to.be.ok;
        expect(result.discount).to.be.ok;
        expect(result.recurring).to.eq(result.discount.recurring);
        expect(result.discountAmount).to.eq(100);
        expect(result.payAmount).to.eq(900);
        done();
      });
    });
  });

  it('should apply for unknown campaign', function(done) {
    var pid = '11115af163608024520002b2',
        userId = '51cc5af163608024520002b2';
    DiscountCampaign.apply('code', 'BASIC', 'MONTH', {_id:userId,email:'a@b.cz'}, {_id:pid}, function(err, data) {
      expect(err).to.deep.eq({error: {code: 'DISCOUNT_NOT_FOUND',
        message: 'Valid discount campaign with code "code" not found'}});
      expect(data).to.be.undefined;
      done();
    });
  });

  it('should apply for unapplicable campaign', function(done) {
    var pid = '11115af163608024520002b2',
        userId = '51cc5af163608024520002b2',
        validFrom = moment.utc().subtract('days', 10),
        validUntil = moment.utc().add('days', 10);
    var d = new DiscountCampaign({
      code: 'code',
      validFrom: validFrom.toDate(),
      validUntil: validUntil.toDate(),
      discounts: [{
        plan: 'BASIC:',
        dtype: 'percent',
        discount: 10,
        recurring: true,
        limits: {emails:['a@b.sk']}
      }]
    });
    d.save(function(err, d) {
      expect(err).to.be.null;
      expect(d).to.be.ok;    

      DiscountCampaign.apply(d.code, 'BASIC', 'MONTH', {_id:userId,email:'a@b.cz'}, {_id:pid}, function(err, result) {
        expect(err).to.deep.eq({error: {code: 'DISCOUNT_NOT_APPLICABLE',
          message: 'Discount campaign with code "code" cannot be applied for plan BASIC interval MONTH for user a@b.cz'}});
        expect(result).to.be.undefined;
        done();
      });
    });
  });

  it('should successfully apply for discount campaign', function(done) {
    var pid = '11115af163608024520002b2',
        userId = '51cc5af163608024520002b2',
        validFrom = moment.utc().subtract('days', 10),
        validUntil = moment.utc().add('days', 10);
    var d = new DiscountCampaign({
      code: 'code',
      validFrom: validFrom.toDate(),
      validUntil: validUntil.toDate(),
      discounts: [{
        plan: 'BASIC:',
        dtype: 'percent',
        discount: 10,
        recurring: true
      }]
    });
    d.save(function(err, d) {
      expect(err).to.be.null;
      expect(d).to.be.ok;    

      DiscountCampaign.apply(d.code, 'BASIC', 'MONTH', {_id:userId,email:'a@b.cz'}, {_id:pid}, function(err, coupon, campaign, discount) {
        expect(err).to.be.null;
        expect(coupon).to.be.ok;
        expect(campaign).to.be.ok;
        expect(discount).to.be.ok;

        expect(coupon.campaignId.toString()).to.eq(campaign._id.toString());
        expect(coupon.discountId.toString()).to.eq(discount._id.toString());
        expect(coupon.userId.toString()).to.eq('51cc5af163608024520002b2');
        expect(coupon.pid.toString()).to.eq('11115af163608024520002b2');
        expect(coupon.code).to.eq(campaign.code);
        expect(coupon.email).to.eq('a@b.cz');
        expect(coupon.type).to.eq(discount.dtype);
        expect(coupon.planInterval).to.eq('BASIC:MONTH');
        expect(coupon.recurring).to.eq(discount.recurring);
        expect(coupon.discount).to.eq(discount.discount);
        expect(coupon.appliedDiscount).to.eq(100);
        expect(coupon.validUntil).to.be.ok;
        expect(coupon.applied).to.be.ok;
        expect(coupon.created.valueOf()).to.eq(campaign.created.valueOf());

        DiscountCampaign.findById(campaign._id, function(err, fcampaign) {
          expect(err).to.be.null;
          expect(fcampaign).to.be.ok;
          expect(fcampaign.discounts[0].applied).to.be.ok;
          expect(fcampaign.discounts[0].applied.last).to.be.ok;
          expect(fcampaign.discounts[0].applied.count).to.eq(1);
          expect(fcampaign.discounts[0].applied.amount).to.eq(100);

          done();
        });
      });
    });
  });

  it('should successfully apply for discount campaign for every plan and interval', function(done) {
    var pid = '11115af163608024520002b2',
        userId = '51cc5af163608024520002b2',
        validFrom = moment.utc().subtract('days', 10),
        validUntil = moment.utc().add('days', 10);
    var d = new DiscountCampaign({
      code: 'code',
      validFrom: validFrom.toDate(),
      validUntil: validUntil.toDate(),
      discounts: [{
        plan: ':',
        dtype: 'percent',
        discount: 10,
        recurring: true
      }]
    });
    d.save(function(err, d) {
      expect(err).to.be.null;
      expect(d).to.be.ok;    

      DiscountCampaign.apply(d.code, 'STARTER', 'MONTH', {_id:userId,email:'a@b.cz'}, {_id:pid}, function(err, coupon, campaign, discount) {
        expect(err).to.be.null;
        expect(coupon).to.be.ok;
        expect(campaign).to.be.ok;
        expect(discount).to.be.ok;

        expect(coupon.campaignId.toString()).to.eq(campaign._id.toString());
        expect(coupon.discountId.toString()).to.eq(discount._id.toString());
        expect(coupon.userId.toString()).to.eq('51cc5af163608024520002b2');
        expect(coupon.pid.toString()).to.eq('11115af163608024520002b2');
        expect(coupon.code).to.eq(campaign.code);
        expect(coupon.email).to.eq('a@b.cz');
        expect(coupon.type).to.eq(discount.dtype);
        expect(coupon.planInterval).to.eq('STARTER:MONTH');
        expect(coupon.recurring).to.eq(discount.recurring);
        expect(coupon.discount).to.eq(discount.discount);
        expect(coupon.appliedDiscount).to.eq(50);
        expect(coupon.validUntil).to.be.ok;
        expect(coupon.applied).to.be.ok;
        expect(coupon.created.valueOf()).to.eq(campaign.created.valueOf());

        DiscountCampaign.findById(campaign._id, function(err, fcampaign) {
          expect(err).to.be.null;
          expect(fcampaign).to.be.ok;
          expect(fcampaign.discounts[0].applied).to.be.ok;
          expect(fcampaign.discounts[0].applied.last).to.be.ok;
          expect(fcampaign.discounts[0].applied.count).to.eq(1);
          expect(fcampaign.discounts[0].applied.amount).to.eq(50);

          done();
        });
      });
    });
  });

  it('should not apply coupon that\'s applied by user', function(done) {
    var pid = '11115af163608024520002b2',
        userId = '51cc5af163608024520002b2',
        userEmail = 'a@b.cz',
        validFrom = moment.utc().subtract('days', 10),
        validUntil = moment.utc().add('days', 10);
    var d = new DiscountCampaign({
      code: 'code',
      validFrom: validFrom.toDate(),
      validUntil: validUntil.toDate(),
      discounts: [{
        plan: 'BASIC:',
        dtype: 'percent',
        discount: 10,
        recurring: true
      }]
    });
    d.save(function(err, d) {
      expect(err).to.be.null;
      expect(d).to.be.ok;

      var c = new Coupon({
        campaignId:       d._id,
        discountId:       d.discounts[0]._id,
        code:             d.code,
        userId:           userId,
        pid:              pid,
        email:            userEmail,
        type:             d.discounts[0].dtype,
        recurring:        d.discounts[0].recurring,
        discount:         d.discounts[0].discount,
        appliedDiscount:  100,
        validUntil:       new Date(),
        applied:          new Date(),
        created:          d.created

      });
      c.save(function(err, c) {
        expect(err).to.be.null;
        expect(c).to.be.ok;

        DiscountCampaign.apply(d.code, 'BASIC', 'MONTH', {_id:userId, email:userEmail}, {_id:pid}, function(err, coupon, campaign, discount) {
          expect(err).to.deep.eq({error:{code: 'COUPON_ALREADY_APPLIED',
            message: 'Coupon "code" already applied'}});
          expect(coupon).to.be.undefined;
          expect(campaign).to.be.undefined;
          expect(discount).to.be.undefined;
          done();
        });
      });
    });
  });

  it('should not apply coupon that\'s applied on profile', function(done) {
    var pid = '11115af163608024520002b2',
        userId = '51cc5af163608024520002b2',
        user2Id = '51cc5af163608024520002b3',
        userEmail = 'a@b.cz',
        validFrom = moment.utc().subtract('days', 10),
        validUntil = moment.utc().add('days', 10);
    var d = new DiscountCampaign({
      code: 'code',
      validFrom: validFrom.toDate(),
      validUntil: validUntil.toDate(),
      discounts: [{
        plan: 'BASIC:',
        dtype: 'percent',
        discount: 10,
        recurring: true
      }]
    });
    d.save(function(err, d) {
      expect(err).to.be.null;
      expect(d).to.be.ok;

      var c = new Coupon({
        campaignId:       d._id,
        discountId:       d.discounts[0]._id,
        code:             d.code,
        userId:           user2Id,
        pid:              pid,
        email:            userEmail,
        type:             d.discounts[0].dtype,
        recurring:        d.discounts[0].recurring,
        discount:         d.discounts[0].discount,
        appliedDiscount:  100,
        validUntil:       new Date(),
        applied:          new Date(),
        created:          d.created
      });
      c.save(function(err, c) {
        expect(err).to.be.null;
        expect(c).to.be.ok;

        DiscountCampaign.apply(d.code, 'BASIC', 'MONTH', {_id:userId, email:userEmail}, {_id:pid}, function(err, coupon, campaign, discount) {
          expect(err).to.deep.eq({error:{code: 'COUPON_ALREADY_APPLIED',
            message: 'Coupon "code" already applied'}});
          expect(coupon).to.be.undefined;
          expect(campaign).to.be.undefined;
          expect(discount).to.be.undefined;
          done();
        });
      });
    });
  });
});