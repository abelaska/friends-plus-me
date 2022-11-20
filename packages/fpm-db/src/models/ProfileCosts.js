import { registerModel, Schema, SchemaObjectId, dbUpdatedCount } from '../db';
import config from '@fpm/config';
import moment from 'moment';

var ProfileCosts = new Schema({
  pid: SchemaObjectId, // profile._id
  day: Date,
  createdAt: { type: Date, default: Date.now }, // costs for day

  reconcilation: {
    finished: { type: Boolean, default: false },
    notified: { type: Boolean, default: false }, // true pokud byla odeslana notifikace uzivateli
    finishedAt: Date,
    lockedUntil: { type: Date, default: Date.now }
  },

  daily: { type: Number, default: 0 }, // daily fixed price 1000000
  monthly: { type: Number, default: 0 }, // monthly fixed price 1000000

  metrics: {
    profile: {
      unitPrice: { type: Number, default: 0 }, // fixed price 1000000 per unit
      monthly: { type: Number, default: 0 }, // total monthly fixed price 1000000
      daily: { type: Number, default: 0 }, // total daily fixed price 1000000
      count: { type: Number, default: 0 }, // units count
      ids: [String] // units id
    },
    connectedAccount: {
      unitPrice: { type: Number, default: 0 }, // fixed price 1000000 per unit
      monthly: { type: Number, default: 0 }, // total monthly fixed price 1000000
      daily: { type: Number, default: 0 }, // total daily fixed price 1000000
      count: { type: Number, default: 0 }, // units count
      ids: [String] // units id
    },
    sourceAccount: {
      unitPrice: { type: Number, default: 0 }, // fixed price 1000000 per unit
      monthly: { type: Number, default: 0 }, // total monthly fixed price 1000000
      daily: { type: Number, default: 0 }, // total daily fixed price 1000000
      count: { type: Number, default: 0 }, // units count
      ids: [String] // units id
    },
    member: {
      unitPrice: { type: Number, default: 0 }, // fixed price 1000000 per unit
      monthly: { type: Number, default: 0 }, // total monthly fixed price 1000000
      daily: { type: Number, default: 0 }, // total daily fixed price 1000000
      count: { type: Number, default: 0 }, // units count
      ids: [String] // units id
    }
  }
});

ProfileCosts.index(
  {
    'reconcilation.finished': 1,
    'reconcilation.lockedUntil': 1
  },
  { sparse: true }
);

ProfileCosts.index({
  pid: 1,
  day: 1
});

ProfileCosts.methods.reconcile = function(callback) {
  this.update({
    $set: {
      'reconcilation.finished': true,
      'reconcilation.finishedAt': moment.utc().toDate()
    },
    $unset: {
      'reconcilation.lockedUntil': 1
    }
  }).exec(function(err, updated) {
    callback(err, dbUpdatedCount(updated) ? true : false);
  });
};

ProfileCosts.static('fetchForReconcile', function(callback, overrideNow) {
  var now = overrideNow || moment.utc();
  this.findOneAndUpdate(
    {
      'reconcilation.finished': false,
      'reconcilation.lockedUntil': { $lt: now.toDate() }
    },
    {
      $set: {
        'reconcilation.lockedUntil': now
          .clone()
          .add(config.get('premium:reconcile:lock:seconds') || 5 * 60, 'seconds')
          .toDate()
      }
    },
    {
      sort: {
        'reconcilation.lockedUntil': 1
      }
    },
    callback
  );
});

export default registerModel('ProfileCosts', ProfileCosts);
