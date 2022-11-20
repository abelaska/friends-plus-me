import { registerModel, Schema, SchemaObjectId } from '../db';
import { Types } from '@fpm/constants';

var AccountBlacklist = new Schema(
  {
    uid: String, // identifikator uctu prideleny socialni siti
    account: Number, // typ uctu (0=Profile,1=Page,2=Group)
    network: Number, // typ socialni site (0=google+,1=twitter,2=facebook,3=linkedin)
    reason: String, // tos_violation
    createdAt: { type: Date, default: Date.now } // cas vytvoreni
  },
  {
    versionKey: false
  }
);

AccountBlacklist.index(
  {
    uid: 1,
    network: 1
  },
  { unique: true }
);

AccountBlacklist.static('check', function(networkName, uid, callback) {
  this.find(
    {
      uid: uid,
      network: Types.network[networkName].code
    },
    function(err, items) {
      var found = items && items.length > 0;
      if (found) {
        err = new Error('Account is blacklisted!');
        err.code = 'account_blacklisted';
      }
      callback(err);
    }
  );
});

AccountBlacklist.static('checkWithDone', function(networkName, uid, account, done) {
  this.check(networkName, uid, function(err) {
    if (err) {
      return done(err);
    }
    done(null, account);
  });
});

export default registerModel('AccountBlacklist', AccountBlacklist);
