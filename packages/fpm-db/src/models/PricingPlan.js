import { registerModel, Schema, SchemaObjectId, Mixed } from '../db';
import { Profile } from './Profile';
import uniq from 'lodash/uniq';

var PricingPlan = new Schema({
  id: String, // ID pricing planu
  name: String, // lidsky nazev pricing planu
  available: Boolean, // true pokud je plan dostupny, false pokud neni
  unavailableSince: Date, // datum od ktereho neni plan dostupny
  fetchInterval: Number, // pocatecni hodnota fetch intervalu v sekundach
  fetchIntervals: [Number], // seznam hodnot fetch intervalu v minutach
  customizedFor: SchemaObjectId, // profile._id kteremu je pricing plan prirazen

  members: [
    {
      // komu je pricing plan dostupny, udava se vzdy pouze jedna identifikacni hodnota
      pid: SchemaObjectId, // profile._id
      uid: SchemaObjectId, // user._id
      email: String, // user.email
      actorId: String // user.actorId
    }
  ],

  intervals: {
    // seznam intervalu
    MONTH: {
      // mesicni platebni interval
      disabled: Boolean, // true pokud je disabled, false pokud enabled
      braintreePlanId: String, // identifikator Braintree subscription planu
      pricePerMonth: Number // cena za mesic
    },
    YEAR: {
      // rocni platebni interval
      disabled: Boolean, // true pokud je disabled, false pokud enabled
      braintreePlanId: String, // identifikator Braintree subscription planu
      pricePerMonth: Number, // cena za mesic
      pricePerYear: Number // cena za rok
    }
  },

  premium: Mixed, // struktura se uklada pri subscribe do profile.premium

  use: Mixed /*{ use struktura pro dany plan
    maxAccounts:        Number, // maximani pocet pripojenych uctu
    maxMembers:         Number, // maximalni pocet prizvanych clenu tymu
    addons:{                    // seznam addonu
      'ACCOUNTS_ADDON': {       // accounts addon
        accounts:       Number  // pocet uctu navic per addon
        price:          Number  // fixed price za addon
      },
      'MEMBERS_ADDON': {        // members addon
        members:        Number  // pocet members navic per addon
        price:          Number  // fixed price za addon
      }
    },
    network: {
      {networkTypeName}: {               // lowercase
        limit:                  Number   // -1,null = unlimited, >= 0 allowed count
        {accountTypeName}: {             // lowercase
          limit:                 Number  // -1,null = unlimited, >= 0 allowed count
          maxInQueue:            Number  // -1,null = unlimited, >= 0 max. number of posts to publish (this account type is a destination) in queue
          disallowedAsRepostDst: Boolean // true = this G+ page cannot be used as a destination of reposts, false = can be used as a destination for reposts
        }
      }
    }
  },*/
});

PricingPlan.index({ id: 1 }, { unique: true });
PricingPlan.index({ customizedFor: 1, available: 1 }, { unique: false });
PricingPlan.index({ available: 1, 'members.pid': 1 }, { unique: false, sparse: true });
PricingPlan.index({ available: 1, 'members.uid': 1 }, { unique: false, sparse: true });
PricingPlan.index({ available: 1, 'members.email': 1 }, { unique: false, sparse: true });
PricingPlan.index({ available: 1, 'members.actorId': 1 }, { unique: false, sparse: true });

// PricingPlan.methods.isAvailable = function(profile) {
//   return (this.available && !this.customizedFor) || (this.customizedFor && this.customizedFor.toString() === profile._id.toString()) ? true : false;
// };

PricingPlan.static('findPlan', function(planId, profile, callback) {
  this.findOne({ id: planId }, function(err, plan) {
    if (err || !plan) {
      callback(err || { error: { message: 'Plan ' + planId + ' not found' } });
    } else {
      callback(null, plan);
    }
    // if (plan.isAvailable(profile) || profile.plan.name === planId) {
    //   callback(null, plan);
    // } else {
    //   callback({error:{message: 'Plan '+planId+' is not available'}});
    // }
  });
});

PricingPlan.static('findAllAvailable', function(user, callback) {
  if (user) {
    return Profile.find({ _id: { $in: user.memberOfProfiles } }, 'plan.name', (err, profiles) => {
      if (err) {
        return callback(err);
      }

      const plans = profiles && profiles.length && uniq(profiles.map(p => p.plan.name));
      const $or = [
        {
          'members.uid': user._id
        }
      ];

      // if (profile && profile._id) {
      //   $or.push({
      //     'members.pid': profile._id
      //   });
      // }
      if (user.actorId) {
        $or.push({
          'members.actorId': user.actorId
        });
      }
      if (user.email) {
        $or.push({
          'members.email': user.email
        });
      }

      const query = {
        $or: [{ id: { $in: plans } }, { available: true }, { $or }]
      };

      this.find(query, callback);
    });
  }
  this.find(
    {
      available: true
    },
    callback
  );
});

export default registerModel('PricingPlan', PricingPlan);
