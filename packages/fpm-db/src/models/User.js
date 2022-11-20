import { registerModel, Schema, Mixed, SchemaObjectId } from '../db';
import { States } from '@fpm/constants';
import async from 'async';
import _ from 'underscore';
import config from '@fpm/config';
import { Profile } from './Profile';
import ProfileName from './ProfileName';

const User = new Schema({
  auth0Id: String, // auth0 user id
  actorId: String, // google+ user id
  name: String, // jmeno uctu
  fname: String, // jmeno
  lname: String, // prijmeni
  image: String, // URL obrazku vlastnika uctu
  email: String, // e-mail
  emailVerified: Boolean, // e-mail is verified
  locale: String, // locale
  tz: String, // timezone
  country: String, // upper case two-letter ISO country code http://userpage.chemie.fu-berlin.de/diverse/doc/ISO_3166.html

  created: { type: Date, default: Date.now }, // cas vytvoreni uctu
  role: { type: String, default: 'user' }, // role uzivatele v systemu (admin,user)
  state: { type: Number, default: States.user.enabled.code }, // stav uctu 0-deleted, 1-enabled, 2-blocked
  loginLast: { type: Date, default: Date.now }, // cas posledniho prihlaseni
  loginCount: { type: Number, default: 1 }, // pocet prihlaseni

  shareLast: Date, // cas posledniho zobrazeni share stranky
  shareCount: Number, // pocet zobrazeni share stranky

  profiles: Mixed, // seznam profilu jichz je uzivatel clenem
  // {ROLE}: [{profile._id},...]  // profiles._id list
  affiliate: {
    // informace o ucastnikovi affiliate programu
    referrer: {
      // informace o partnerovi, ktery privedl tohoto uzivatele
      campaignId: String, // getAmbassador campaign ID
      mbsy: String // getAmbassador partner short code
    }
  },

  // list of notifications user wants to receive
  notifications: {
    type: Mixed,
    default: {
      'post-publishing-failed': true
    }
  },

  extension: {
    lastAccounts: [String] // cilove accounts._id posledni uspesne prijateho prispevku
  },

  last: {
    // last use of ...
    desktop: {
      login: Date,
      version: String // used desktop version
    }
  },

  aids: [String], // Analytics identificators

  deleted: Date, // cas smazani uzivatele
  deleteReason1: String, // uzivatelem udany duvod smazani profilu 1. uroven
  deleteReason2: String, // uzivatelem udany duvod smazani profilu 2. uroven
  deleteReason3: String, // uzivatelem udany duvod smazani profilu 3. uroven
  blocked: Date, // cas zablokovani uctu
  blockReason: Number // kod duvodu zablokovani uctu (TODO: zadefinovat duvody)
});

User.index(
  {
    auth0Id: 1
  },
  { unique: true }
);

User.index(
  {
    actorId: 1
  },
  { unique: true }
);

User.index(
  {
    'profiles.manager': 1
  },
  { unique: false }
);

User.index(
  {
    'profiles.owner': 1
  },
  { unique: false }
);

User.virtual('ownsAnyProfile').get(function () {
  return this.profiles && this.profiles.owner && this.profiles.owner.length > 0;
});

User.virtual('isEnabled').get(function () {
  return this.state === States.user.enabled.code;
});

User.virtual('isBlocked').get(function () {
  return this.state === States.user.blocked.code;
});

User.virtual('isDeleted').get(function () {
  return this.state === States.user.deleted.code;
});

// analytics id
User.virtual('aid').get(function () {
  return this.aids && this.aids.length > 0 ? this.aids[this.aids.length - 1] : null;
});

// ziskani language z locale
User.virtual('language').get(function () {
  if (this.locale !== undefined && this.locale !== null) {
    return this.locale.split('_')[0].split('-')[0];
  }
  return config.get('defaultLanguage') || 'en';
});

// ziskani seznamu _id profilu jich je uzivatel clenem
User.virtual('memberOfProfiles').get(function () {
  return _.chain(this.profiles)
    .values()
    .flatten()
    .map(pid => {
      return pid.valueOf().toString();
    })
    .uniq()
    .value();
});

User.methods.addAnalyticId = function (aid) {
  if (!this.aids) {
    this.aids = [];
  }
  this.aids.push(aid);
};

User.static('fetchProfilesWithName', function (user, callback) {
  user.fetchProfiles((err, profiles) => {
    if (err || !profiles) {
      callback(err);
    } else {
      async.each(
        profiles,
        (profile, cb) => {
          if (user.isProfileOwner(profile) || !profile.ownerId) {
            if (!profile.name) {
              profile.name = `${profile._id.toString()} Team`;
            }
            return cb();
          }
          ProfileName.findOne({ uid: user._id, pid: profile._id }, 'name', (err, pn) => {
            const name = pn && pn.name;
            if (name) {
              profile.name = name;
              return cb();
            }
            this.findById({ _id: profile.ownerId }, 'name', (err, owner) => {
              if (err || !owner) {
                return cb(err);
              }
              profile.name = `${profile.name || 'Team'} (shared by ${owner.name})`;
              cb();
            });
          });
        },
        err => {
          if (err) {
            callback(err);
          } else {
            callback(null, profiles);
          }
        }
      );
    }
  });
});

User.methods.fetchProfiles = function (callback) {
  Profile.find({ _id: { $in: this.memberOfProfiles } }, callback);
};

User.methods._containsObjectId = function (array, item) {
  if (!array || !array.length || !item) {
    return false;
  }
  item = item.toString();
  for (let i = 0; i < array.length; i++) {
    if (array[i].toString() === item) {
      return true;
    }
  }
  return false;
};

User.methods.isProfileOwner = function (profile) {
  return (
    this._containsObjectId(this.profiles.owner, profile._id) && this._containsObjectId(profile.members.owner, this._id)
  );
};

User.methods.isProfileContributor = function (profile) {
  return (
    this._containsObjectId(this.profiles.contributor, profile._id) &&
    this._containsObjectId(profile.members.contributor, this._id)
  );
};

User.methods.isProfileOwnerOrManager = function (profile) {
  return (
    (this._containsObjectId(this.profiles.owner, profile._id) ||
      this._containsObjectId(this.profiles.manager, profile._id)) &&
    (this._containsObjectId(profile.members.owner, this._id) ||
      this._containsObjectId(profile.members.manager, this._id))
  );
};

User.methods.isTeamMember = function (profile) {
  return (
    (this._containsObjectId(this.profiles.owner, profile._id) ||
      this._containsObjectId(this.profiles.manager, profile._id) ||
      this._containsObjectId(this.profiles.contributor, profile._id) ||
      this._containsObjectId(this.profiles.amanager, profile._id)) &&
    (this._containsObjectId(profile.members.owner, this._id) ||
      this._containsObjectId(profile.members.manager, this._id) ||
      this._containsObjectId(profile.members.contributor, this._id) ||
      this._containsObjectId(profile.members.amanager, this._id))
  );
};

User.methods.isNotProfileOwner = function (profile) {
  return !this.isProfileOwner(profile);
};

User.methods.isAccountManager = function (account) {
  const accountManagers = (account && account.members && account.members.manager) || [];
  return this._containsObjectId(accountManagers, this._id);
};

User.methods.canManageProfile = function (profile) {
  return this.isProfileOwnerOrManager(profile);
};

User.methods.canManageAccount = function (account) {
  return this.isAccountManager(account);
};

export default registerModel('User', User);
