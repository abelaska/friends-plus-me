import { registerModel, Schema, SchemaObjectId, Mixed } from '../db';
import { Types, States } from '@fpm/constants';
import moment from 'moment';
import async from 'async';
import _ from 'lodash';
import log from '@fpm/logging';
import config from '@fpm/config';
import Audit from './Audit';

var Premium = new Schema({
  pid: SchemaObjectId, // profile._id

  createdAt: { type: Date, default: Date.now }, // datum vytvoreni transakce

  amount: { type: Number, default: 0 }, // fixed amount of $0.000000 (*1000000), positite=credit, nagative=debit

  credit: Mixed /*{
    available:      {type:Number, default:0},    // fixed amount, kolik postredku z amount je stale dostupnych
    debited:        {type:Number, default:0},    // fixed amount, kolik prostredku bylo z premia uplatneno
    debits:         {type:Number, default:0},    // debit count
    expiresAt:      Date,      // den a cas expirace kreditu
    source:         String,    // zdroj kreditu: trial,promocode,tx,affiliate
    sourceId:       String     // identifikace zdroje promocode(premiumcodes._id),affiliate(affiliatecommisions.commisions.tx),tx(tx._id)
  },*/,

  debit: Mixed /*{
    metric:         String,    // nazev metriky: member, sourceAccount, connectedAccount
    metricIds:      [String],  // identifikator metriky: users._id, profiles.accounts._id
    reconciledBy:   [{         // seznam kredit zaznamu, ze kterych byl uhrazen tento debit
      creditId:     ObjectId, // premium._id
      amount:       Number    // uhrazena castka
    }]
  }*/
});

Premium.index({
  pid: 1,
  amount: 1,
  createdAt: 1
});

// used for finding existing debit
Premium.index(
  {
    pid: 1,
    createdAt: 1,
    'debit.metric': 1,
    'debit.metricIds': 1
  },
  { sparse: true }
);

Premium.index(
  {
    pid: 1,
    'credit.available': 1,
    'credit.expiresAt': 1
  },
  { sparse: true }
);

// used in PremiumCode
Premium.index(
  {
    pid: 1,
    'credit.source': 1,
    'credit.sourceId': 1
  },
  { sparse: true }
);

Premium.index(
  {
    pid: 1,
    'credit.source': 1,
    'credit.available': 1,
    'credit.expiresAt': 1
  },
  { sparse: true }
);

Premium.virtual('isCreditExpired').get(function() {
  if (this.amount >= 0 && this.credit && this.credit.expiresAt) {
    return moment.utc(this.credit.expiresAt).isBefore(moment.utc());
  }
  return false;
});

// amount in dolars
Premium.static('credit', function(profileId, amount, source, sourceId, expireInDays, callback, overrideNow) {
  var pid = profileId._id || profileId;
  var now = overrideNow || moment.utc();
  var amountFixed = Math.floor(amount * 1000000);
  var premium = {
    pid: pid,
    createdAt: now.toDate(),
    amount: amountFixed,
    credit: {
      source: source,
      sourceId: sourceId,
      available: amountFixed,
      debited: 0,
      debits: 0,
      expiresAt: (expireInDays !== undefined &&
        expireInDays !== null &&
        expireInDays > -1 &&
        now.clone().add(expireInDays, 'days').toDate()) ||
        null
    }
  };

  var extendValidityOfSources = config.get('premium:extendableSources');

  if (_.contains(extendValidityOfSources, source)) {
    // prodlouzit platnost stavajicich premium kreditu
    async.each(
      extendValidityOfSources,
      function(source, cb) {
        var expireInDays = config.get('premium:' + source + ':expireInDays');
        var expiresAt =
          (expireInDays !== undefined &&
            expireInDays !== null &&
            expireInDays > -1 &&
            now.clone().add(expireInDays, 'days').toDate()) ||
          null;
        this.update(
          {
            pid: pid,
            'credit.source': source,
            'credit.available': { $gt: 0 },
            'credit.expiresAt': { $gt: now.toDate() }
          },
          {
            $set: { 'credit.expiresAt': expiresAt }
          },
          { multi: 1 },
          cb
        );
      }.bind(this),
      function(err) {
        if (err) {
          log.error('Failed to extend validity of credits', {
            profileId: pid.toString(),
            error: err
          });
        } else {
          log.info('Extended validity of credits', {
            profileId: pid.toString()
          });
        }
      }.bind(this)
    );
  }

  this.create(premium, function(err, premium) {
    if (err) {
      return callback(err);
    }
    Audit.profile('credit:added', null, pid, {
      source: source,
      sourceId: sourceId,
      credit: amountFixed
    });
    callback(err, premium);
  });
});

Premium.static('debit', function(profile, metric, metricIds, callback, overrideNow) {
  var now = overrideNow || moment.utc();
  this.balance(
    profile,
    function(err, balance, credits) {
      if (err) {
        return callback(err);
      }

      var amount = metricIds.length * Math.floor(profile.premium.metrics[metric] * 1000000 / (365 / 12));
      if (amount === 0) {
        return callback();
      }

      if (balance < amount) {
        return callback({
          code: 'INSUFFICIENT_FUNDS',
          amount: amount,
          balance: balance,
          message: 'Insufficient funds'
        });
      }

      // find credit premium
      var reconciledBy = [];
      var updateCredits = [];
      var required = amount;
      var allocate;

      // setridit vzestupne, at se nejdrive vyuzije kredit s drive expirujicich kreditu
      credits.sort(function(a, b) {
        return moment.utc(a.credit.expiresAt).unix() - moment.utc(b.credit.expiresAt).unix();
      });

      for (var i = 0; i < credits.length; i++) {
        allocate = Math.min(credits[i].credit.available, required);

        reconciledBy.push({
          creditId: credits[i]._id,
          amount: allocate
        });

        updateCredits.push({
          find: { _id: credits[i]._id },
          update: { $inc: { 'credit.available': -allocate, 'credit.debited': allocate, 'credit.debits': 1 } }
        });

        required -= allocate;
        if (required === 0) {
          break;
        }
      }

      async.eachLimit(
        updateCredits,
        4,
        function(d, cb) {
          this.update(d.find, d.update, cb);
        }.bind(this),
        function(err) {
          if (err) {
            return callback(err);
          }
          var premium = {
            pid: profile._id,
            amount: -amount,
            createdAt: now.toDate(),
            debit: {
              reconciledBy: reconciledBy,
              metric: metric,
              metricIds: metricIds
            }
          };
          this.create(premium, callback);
        }.bind(this)
      );
    }.bind(this),
    now
  );
});

Premium.static('balance', function(profileId, callback, overrideNow) {
  var pid = profileId._id || profileId;
  var now = overrideNow || moment.utc();
  var query = {
    pid: pid,
    'credit.available': { $gt: 0 },
    'credit.expiresAt': { $gt: now.toDate() }
  };
  this.find(
    query,
    function(err, credits) {
      if (err) {
        return callback(err);
      }
      var balance =
        (credits &&
          _.reduce(
            credits,
            function(sum, p) {
              return sum + p.credit.available;
            },
            0
          )) ||
        0;
      callback(null, balance, credits);
    }.bind(this)
  );
});

export default registerModel('Premium', Premium);
