import { registerModel, Schema, SchemaObjectId, Mixed, dbNotUpdated } from '../db';
import moment from 'moment';
import async from 'async';
import log from '@fpm/logging';
import Premium from './Premium';

var PremiumCode = new Schema({
  // slevovy kupon
  code: String, // kod kuponu
  amount: { type: Number, default: 0 }, // amount in dolars
  validFrom: { type: Date, default: Date.now }, // cas pocatku platnosti kampane
  validUntil: { type: Date, default: Date.now }, // cas ukonceni platnosti kampane
  createdAt: { type: Date, default: Date.now }, // cas vzniku kampane
  expireInDays: { type: Number, default: 365 }, // pocet dnu do expirace vznikleho kreditu, null pokud neexpiruje

  applied: {
    // prehled o uplatnenych slevach pro danou slevovou kampan
    count: { type: Number, default: 0 }, // pocet uplatenenych slev
    amount: { type: Number, default: 0 }, // celkovy soucet uplatenene financni slevy
    last: { type: Date, default: null } // cas posledniho uplatneni slevy
  },

  limits: {
    count: Number // maximalni pocet aplikaci slevoveho kodu
  }
});

PremiumCode.index({
  validFrom: 1,
  validUntil: 1,
  code: 1
});

PremiumCode.static('findByCode', function(code, callback, overrideNow) {
  var now = overrideNow || moment.utc();
  this.findOne(
    {
      code: code,
      validFrom: { $lte: now.toDate() },
      validUntil: { $gt: now.toDate() }
    },
    function(err, premiumCode) {
      if (err || !premiumCode) {
        return callback(
          err || {
            error: {
              code: 'CODE_NOT_FOUND',
              message: 'No valid promo code "' + code + '" found'
            }
          }
        );
      }
      callback(null, premiumCode);
    }
  );
});

PremiumCode.static('apply', function(premiumCode, callback, overrideNow) {
  var now = overrideNow || moment.utc();
  this.update(
    {
      _id: premiumCode._id
    },
    {
      $set: { 'applied.last': now.toDate() },
      $inc: {
        'applied.count': 1,
        'applied.amount': premiumCode.amount
      }
    },
    function(err, updated) {
      if (err || dbNotUpdated(updated)) {
        return callback(
          err || {
            error: {
              code: 'CODE_UPDATE_FAILURE',
              message: 'Failed to apply promo code ' + premiumCode._id.toString()
            }
          }
        );
      }
      callback(null, premiumCode);
    }
  );
});

PremiumCode.static('isAppliedToProfile', function(premiumCode, profile, callback) {
  Premium.count(
    {
      pid: profile._id,
      'credit.source': 'promocode',
      'credit.sourceId': premiumCode._id.toString()
    },
    function(err, count) {
      if (err) {
        return callback(err);
      }
      callback(null, count > 0);
    }.bind(this)
  );
});

PremiumCode.static('applyToProfile', function(code, profile, callback, overrideNow) {
  var now = overrideNow || moment.utc();

  async.waterfall(
    [
      // find code
      function(cb) {
        this.findByCode(code, cb, now);
      }.bind(this),

      // check if the code was already applied
      function(premiumCode, cb) {
        this.isAppliedToProfile(
          premiumCode,
          profile,
          function(err, isApplied) {
            if (err || isApplied) {
              return cb(
                err || {
                  error: {
                    code: 'CODE_ALREADY_APPLIED',
                    message: 'Promo code "' + code + '" already applied'
                  }
                }
              );
            }
            cb(null, premiumCode);
          }.bind(this)
        );
      }.bind(this),

      // check limit count
      function(premiumCode, cb) {
        if (!premiumCode.limits) {
          return cb(null, premiumCode);
        }

        var limitCount = premiumCode.limits.count || null;
        var appliedCount = premiumCode.applied.count || 0;

        if (limitCount !== null && limitCount !== undefined && appliedCount !== null && appliedCount >= limitCount) {
          return cb({
            error: {
              code: 'CODE_NO_LONGER_VALID',
              message: 'Promo code "' + code + '" is no longer valid'
            }
          });
        }

        cb(null, premiumCode);
      }.bind(this),

      // apply code
      function(premiumCode, cb) {
        this.apply(premiumCode, cb, now);
      }.bind(this),

      // create premium
      function(premiumCode, cb) {
        Premium.credit(
          profile._id,
          premiumCode.amount,
          'promocode',
          premiumCode._id.toString(),
          premiumCode.expireInDays,
          function(err, premium) {
            if (err) {
              return cb(err);
            }
            cb(null, premiumCode, premium);
          },
          now
        );
      }.bind(this)

      // final
    ],
    function(err, premiumCode, premium) {
      if (err) {
        log.error('Failed to apply premium code', {
          code: code,
          profileId: profile._id.toString(),
          error: err
        });
        return callback(err);
      }
      callback(null, premiumCode, premium);
    }.bind(this)
  );
});

export default registerModel('PremiumCode', PremiumCode);
