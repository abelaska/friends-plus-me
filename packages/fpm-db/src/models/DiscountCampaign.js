import { registerModel, Schema, dbNotUpdated } from '../db';
import moment from 'moment';
import async from 'async';
import log from '@fpm/logging';
import Coupon from './Coupon';
import PricingPlan from './PricingPlan';

var DiscountCampaign = new Schema({
  // slevova kampan
  code: String, // kod kuponu slevove kampane
  validFrom: Date, // cas pocatku platnosti kampane
  validUntil: Date, // cas ukonceni platnosti kampane
  created: { type: Date, default: Date.now }, // cas vzniku kampane

  discounts: [
    {
      // seznam moznych slev
      //_id
      plan: String, // interval=MONTH||YEAR, konkretni plan '{plan}:{interval}', konkretni plan vsechny intervaly "{plan}:", vsechny plany konkretniho intervalu ":{interval}"
      dtype: String, // typ slevy 'percent','fixed'
      discount: Number, // hodnota slevy, procento nebo fixni hodnota slevy v dolarech
      recurring: Boolean, // true pokud se jedna o opakovanou slevu, false pokud pouze o jednorazovou slevu
      applied: {
        // prehled o uplatnenych slevach pro danou slevovou kampan
        count: Number, // pocet uplatenenych slev
        amount: Number, // celkovy soucet uplatenene financni slevy
        last: Date // cas posledniho uplatneni slevy
      },
      limits: {
        emails: [String] // seznam emailu uivatelu, kteri muzou uplatnit slevu
      }
    }
  ]
});

DiscountCampaign.index(
  {
    validFrom: 1,
    validUntil: 1,
    code: 1
  },
  { unique: false }
);

DiscountCampaign.index(
  {
    _id: 1,
    'discounts._id': 1
  },
  { unique: true }
);

DiscountCampaign.methods._loadPlanInterval = function(planId, interval, profile, callback) {
  PricingPlan.findPlan(
    planId,
    profile,
    function(err, plan) {
      if (err || !plan) {
        callback(err);
      } else {
        callback(null, plan.intervals[interval]);
      }
    }.bind(this)
  );
};

DiscountCampaign.methods.applyOnPlan = function(plan, interval, user, profile, callback) {
  this._loadPlanInterval(
    plan,
    interval,
    profile,
    function(err, planCfg) {
      if (err || !planCfg) {
        callback(err);
      } else {
        var discount,
          planPrice = planCfg[interval === 'MONTH' ? 'pricePerMonth' : 'pricePerYear'],
          result = {
            campaign: this,
            discount: null,
            discountAmount: 0,
            recurring: false,
            payAmount: planPrice
          };

        if (this.discounts && this.discounts.length) {
          for (var i = 0; i < this.discounts.length; i++) {
            if (
              this.discounts[i].plan === plan + ':' + interval ||
              this.discounts[i].plan === ':' + interval ||
              this.discounts[i].plan === plan + ':' ||
              this.discounts[i].plan === ':'
            ) {
              discount = this.discounts[i];
              break;
            }
          }
        }

        if (discount) {
          result.discount = discount;
          result.recurring = discount.recurring;

          var ok = true, limits = discount.limits;
          if (limits) {
            if (limits.emails && limits.emails.length) {
              ok = limits.emails.indexOf(user.email) > -1;
            }
          }
          if (ok) {
            switch (discount.dtype) {
              case 'percent':
                result.discountAmount = Math.floor(result.payAmount * discount.discount / 100);
                break;
              case 'fixed':
                result.discountAmount = discount.discount;
                break;
            }
            result.discountAmount = Math.max(Math.min(result.payAmount, result.discountAmount), 0);
            result.payAmount -= result.discountAmount;
          }
        } else {
          result = null;
        }

        if (result) {
          // zkontrolovat, zda uz si uzivatel slevu pro danou kampan neuplatnil
          async.parallel(
            [
              async.apply(Coupon.count.bind(Coupon), { campaignId: this._id, pid: profile._id }),
              async.apply(Coupon.count.bind(Coupon), { campaignId: this._id, userId: user._id })
            ],
            function(err, counts) {
              if (err) {
                callback(err);
              } else if (counts[0] + counts[1] > 0) {
                callback(
                  err || {
                    error: {
                      code: 'COUPON_ALREADY_APPLIED',
                      message: 'Coupon "' + this.code + '" already applied'
                    }
                  }
                );
              } else {
                callback(null, result);
              }
            }.bind(this)
          );
        } else {
          callback();
        }
      }
    }.bind(this)
  );
};

DiscountCampaign.static('applyDummy', function(code, plan, interval, user, profile, callback) {
  var now = moment.utc().toDate();
  this.findOne(
    {
      code: code,
      validFrom: { $lte: now },
      validUntil: { $gt: now }
    },
    function(err, campaign) {
      if (err || !campaign) {
        callback(
          err || {
            error: {
              code: 'DISCOUNT_NOT_FOUND',
              message: 'Valid discount campaign with code "' + code + '" not found'
            }
          }
        );
      } else {
        campaign.applyOnPlan(plan, interval, user, profile, callback);
      }
    }
  );
});

DiscountCampaign.static('applyCoupon', function(coupon, callback, now) {
  now = now || moment.utc().toDate();

  this.update(
    {
      _id: coupon.campaignId,
      'discounts._id': coupon.discountId
    },
    {
      $set: { 'discounts.$.applied.last': now },
      $inc: {
        'discounts.$.applied.count': 1,
        'discounts.$.applied.amount': coupon.appliedDiscount
      }
    },
    function(err, updated) {
      if (err || dbNotUpdated(updated)) {
        callback(
          err || {
            error: {
              code: 'DISCOUNT_CAMPAIGN_STAT_UPDATE_FAILURE',
              message: 'Failed to update discount campaign ' +
                coupon.campaignId.toString() +
                ' with applied coupon ' +
                coupon._id.toString()
            }
          }
        );
      } else {
        callback();
      }
    }
  );
});

DiscountCampaign.static('apply', function(code, plan, interval, user, profile, callback) {
  var now = moment.utc().toDate();

  async.waterfall(
    [
      // findCampaign
      function(cb) {
        this.applyDummy(code, plan, interval, user, profile, function(err, appliedDiscount) {
          if (err || !appliedDiscount || appliedDiscount.discountAmount <= 0) {
            cb(
              err || {
                error: {
                  code: 'DISCOUNT_NOT_APPLICABLE',
                  message: 'Discount campaign with code "' +
                    code +
                    '" cannot be applied for plan ' +
                    plan +
                    ' interval ' +
                    interval +
                    ' for user ' +
                    user.email
                }
              }
            );
          } else {
            cb(null, appliedDiscount.campaign, appliedDiscount.discount, appliedDiscount);
          }
        });
      }.bind(this),
      // create coupon
      function(campaign, discount, appliedDiscount, cb) {
        var coupon = new Coupon({
          campaignId: campaign._id,
          discountId: discount._id,
          planInterval: plan + ':' + interval,
          code: campaign.code,
          userId: user._id,
          pid: profile._id,
          email: user.email,
          type: discount.dtype,
          recurring: discount.recurring,
          discount: discount.discount,
          appliedDiscount: appliedDiscount.discountAmount,
          validUntil: now,
          applied: now,
          created: campaign.created
        });
        coupon.save(function(err, coupon) {
          if (err || !coupon) {
            cb(
              err || {
                error: {
                  code: 'COUPON_CREATE_FAILURE',
                  message: 'Failed to save coupon'
                }
              }
            );
          } else {
            cb(null, campaign, discount, coupon);
          }
        });
      }.bind(this),
      // update discount campaign
      function(campaign, discount, coupon, cb) {
        this.applyCoupon(coupon, function(err) {
          if (err) {
            cb(err);
          } else {
            cb(null, campaign, discount, coupon);
          }
        });
      }.bind(this)
    ],
    function(err, campaign, discount, coupon) {
      if (err) {
        log.error('Failed to apply discount', {
          code: code,
          plan: plan,
          interval: interval,
          profileId: profile._id.toString(),
          userId: user._id.toString(),
          error: err
        });
        callback(err);
      } else {
        callback(null, coupon, campaign, discount);
      }
    }.bind(this)
  );
});

export default registerModel('DiscountCampaign', DiscountCampaign);
