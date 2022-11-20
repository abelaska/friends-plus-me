// prettier-ignore
import Promise from 'bluebird';
import cloneDeep from 'lodash.clonedeep';
import log from '@fpm/logging';
import { Types, States } from '@fpm/constants';
import {
  dbNotUpdated,
  ObjectId,
  DeviceAssigned,
  VatRate,
  Profile,
  FetchAccount,
  Audit,
  Post,
  GoogleRefreshToken
} from '@fpm/db';
import { OAuthTokenCryptor } from '@fpm/token';
import { PostScheduler } from '@fpm/post';
import ProfileManager from './ProfileManager';
import { braintreeClientByProfile } from './braintree';

export default class AccountManager {
  constructor() {
    this.oAuthTokenCryptor = new OAuthTokenCryptor();
    this.profileManager = new ProfileManager();
  }

  async getVaRate(country) {
    const vt = await VatRate.findOne({ country: country.toUpperCase() }).exec();
    if (!vt) {
      throw new Error(`Vat rate for country "${country}" not found`);
    }
    return vt.rate;
  }

  async profileVat(profile) {
    return profile.pricesShouldContainVat ? this.getVaRate(this.subject.country) : 0;
  }

  async enhanceAddOnRequest(req, profile, sub, addOnName, newCount, premiumMetricName) {
    return this.enhanceRequest(req, profile, sub, 'addOns', addOnName, newCount, premiumMetricName);
  }

  async enhanceDiscountRequest(req, profile, sub, addOnName, newCount, premiumMetricName) {
    return this.enhanceRequest(req, profile, sub, 'discounts', addOnName, newCount, premiumMetricName);
  }

  async enhanceRequest(req, profile, sub, type, addOnName, newCount, premiumMetricName) {
    let addon;
    const unitPrice = profile.premium && profile.premium.metrics && profile.premium.metrics[premiumMetricName];
    let finalUnitPrice = unitPrice;

    req = req || {};
    req[type] = req[type] || {};

    if (unitPrice !== null && unitPrice !== undefined) {
      const taxAmount = profile.pricesShouldContainVat
        ? Math.ceil(unitPrice * (await this.profileVat(profile))) / 100
        : 0;
      finalUnitPrice = unitPrice + taxAmount;
    }
    const exists = sub && sub[type] && sub[type].filter(r => r.id === addOnName).length > 0;
    if (exists) {
      if (newCount < 1) {
        req[type].remove = req[type].remove || [];
        req[type].remove.push(addOnName);
      } else {
        addon = { existingId: addOnName, quantity: newCount };
        if (finalUnitPrice !== null && finalUnitPrice !== undefined) {
          addon.amount = finalUnitPrice.toFixed(2);
        }
        req[type].update = req[type].update || [];
        req[type].update.push(addon);
      }
    } else if (newCount > 0) {
      addon = { inheritedFromId: addOnName, quantity: newCount };
      if (finalUnitPrice !== null && finalUnitPrice !== undefined) {
        addon.amount = finalUnitPrice.toFixed(2);
      }
      req[type].add = req[type].add || [];
      req[type].add.push(addon);
    }
    return req;
  }

  async _findBraintreeSubscription(profile) {
    let amount = 0;
    let nextPay;
    const subId = profile.subscription && profile.subscription.id;
    if (!subId) {
      log.warn('AccountManager: profile subscription.id not found', { profileId: profile._id.toString() });
      return { amount, nextPay };
    }
    return new Promise((resolve, reject) => {
      braintreeClientByProfile(profile).subscription.find(subId, (error, sub) => {
        if (error) {
          log.error('AccountManager: failed to find braintree subscription', {
            subId,
            profileId: profile._id.toString(),
            error: error.stack
          });
          return reject(error);
        }
        nextPay = sub.nextBillingDate;
        amount = Math.ceil(sub.nextBillAmount * 100) / 100;
        return resolve({ amount, nextPay });
      });
    });
  }

  async findBraintreeSubscription(profile) {
    const subId = profile && profile.subscription && profile.subscription.id;
    if (!subId) {
      return;
    }
    // eslint-disable-next-line consistent-return
    return new Promise((resolve, reject) => {
      braintreeClientByProfile(profile).subscription.find(subId, (error, sub) => {
        if (error) {
          log.error('AccountManager: failed to find braintree subscription', {
            subId,
            profileId: profile._id.toString(),
            error: error.stack
          });
          return reject(error);
        }
        return resolve(sub);
      });
    });
  }

  async updateBraintreeSubscription(profile) {
    const plan = profile && profile.plan && profile.plan.name;
    const subId = profile && profile.subscription && profile.subscription.id;
    if (!subId || !(plan === 'PAYWYUM' || plan.indexOf('PAYWYUM_') === 0)) {
      return;
    }

    let req = {
      options: {
        prorateCharges: false
      }
    };

    profile = await Profile.findById(
      profile._id,
      '_id use subscription premium subject accounts.uid accounts.network accounts.account profiles.uid profiles.network profiles.account'
    ).exec();
    const sub = await this.findBraintreeSubscription(profile);
    if (!sub) {
      return;
    }

    if (plan === 'PAYWYUM') {
      req = this.enhanceAddOnRequest(
        req,
        profile,
        sub,
        'PAYWYUM_SOCIAL_PROFILE_ADDON',
        profile.premiumProfilesCount,
        'profile'
      );
      // general queues
      req = this.enhanceDiscountRequest(req, profile, sub, 'QUEUE_DISCOUNT', 0, 'connectedAccount');
      req = this.enhanceAddOnRequest(req, profile, sub, 'QUEUE_ADDON', 0, 'connectedAccount');
    } else {
      req = this.enhanceAddOnRequest(req, profile, sub, 'PAYWYUM_SOCIAL_PROFILE_ADDON', 0, 'profile');
      // general queues
      const freeQueues = (profile.use && profile.use.free && profile.use.free.accounts) || 0;
      req = this.enhanceDiscountRequest(
        req,
        profile,
        sub,
        'QUEUE_DISCOUNT',
        Math.min(freeQueues, profile.accounts.length),
        'connectedAccount'
      );
      req = this.enhanceAddOnRequest(req, profile, sub, 'QUEUE_ADDON', profile.accounts.length, 'connectedAccount');
    }

    // instagram queues
    const connectedInstagramQueues = profile.accounts.filter(a => a.network === Types.network.instagram.code).length;
    const freeInstagramQueues = (profile.use && profile.use.free && profile.use.free.instagramQueues) || 0;
    req = this.enhanceDiscountRequest(
      req,
      profile,
      sub,
      'INSTAGRAM_QUEUE_DISCOUNT',
      Math.min(freeInstagramQueues, connectedInstagramQueues),
      'instagramQueue'
    );
    req = this.enhanceAddOnRequest(
      req,
      profile,
      sub,
      'INSTAGRAM_QUEUE_ADDON',
      connectedInstagramQueues,
      'instagramQueue'
    );

    // eslint-disable-next-line consistent-return
    return new Promise(resolve => {
      braintreeClientByProfile(profile).subscription.update(subId, req, (error, updatedSub) => {
        if (error || !updatedSub || !updatedSub.subscription) {
          log.error('AccountManager: failed to set subscription addons quantity', {
            subId,
            profileId: profile._id.toString(),
            req: JSON.stringify(req),
            error: error || { message: 'Subscription is empty' }
          });
        } else {
          const balance = Math.floor(updatedSub.subscription.balance * 100);
          const amount = Math.floor(updatedSub.subscription.price * 100);
          Profile.update(
            { _id: profile._id },
            { $set: { 'subscription.amount': amount, 'subscription.balance': balance } },
            (error2, updated) => {
              if (error) {
                log.error('AccountManager: failed to update profile subscription in database', {
                  profileId: profile._id.toString(),
                  updated,
                  error: error2
                });
              }
            }
          );
        }
        resolve();
      });
    });
  }
}

// AccountManager.prototype.addProfile = function(pid, socialProfile, callback) {
//   socialProfile = cloneDeep(socialProfile);
//   Profile.findOne({ _id: pid },
//     '_id premium plan subject profiles._id profiles.connectedAt profiles.uid profiles.network profiles.account subscription')
//     .exec()
//     .then(
//       function(profile) {
//         const profileExists = profile.profiles && profile.profiles.length &&
//           profile.profiles.find(p => p.uid === socialProfile.uid && p.network === socialProfile.network && p.account === socialProfile.account);

//         if (socialProfile.oauth.secret) {
//           socialProfile.oauth.secret = this.oAuthTokenCryptor.encrypt(socialProfile.oauth.secret);
//         }
//         if (socialProfile.oauth.token) {
//           socialProfile.oauth.token = this.oAuthTokenCryptor.encrypt(socialProfile.oauth.token);
//         }

//         if (profileExists) {
//           var $set = {
//             'profiles.$.reconnectedAt': new Date(),
//             'profiles.$.parentUid': socialProfile.parentUid,
//             'profiles.$.image': socialProfile.image,
//             'profiles.$.name': socialProfile.name,
//             'profiles.$.email': socialProfile.email,
//             'profiles.$.url': socialProfile.url,
//             'profiles.$.oauth.token': socialProfile.oauth.token,
//             'profiles.$.oauth.expiresAt': socialProfile.oauth.expiresAt,
//             'profiles.$.meta.publishViaApi': !!(socialProfile.meta && socialProfile.meta.publishViaApi)
//           };

//           if (socialProfile.oauth.secret) {
//             $set['profiles.$.oauth.secret'] = socialProfile.oauth.secret;
//           }

//           return Profile.update({ 'profiles._id': profileExists._id }, { $set: $set }, function(err, updated) {
//             if (err || dbNotUpdated(updated)) {
//               log.error('AccountManager: failed to update social account', {
//                 profileId: pid.toString(),
//                 socialProfile: socialProfile,
//                 updated: updated && updated.result,
//                 stack: err && err.stack,
//                 error: err
//               });
//               return callback(err || { error: { message: 'Failed to update social account' } });
//             }
//             return callback(null, profileExists._id);
//           }.bind(this));
//         }

//         socialProfile._id = new ObjectId();

//         return Profile.update({ _id: pid }, { $push: { profiles: socialProfile } }, function(err, updated) {
//           if (err || dbNotUpdated(updated)) {
//             log.error('AccountManager: failed to add a new social account to the profile', {
//               profileId: pid.toString(),
//               socialProfile: socialProfile,
//               updated: updated && updated.result,
//               // stack: err && err.stack,
//               error: err
//             });
//             return callback(err || { error: { message: 'Failed to add a new social account to team' } });
//           }

//           return this.updateBraintreeSubscription(profile, function() {
//             callback(null, socialProfile._id);
//           }.bind(this));
//         }.bind(this));
//       }.bind(this),
//       function(err) {
//         log.error('AccountManager: failed find profile', {
//           profileId: pid.toString(),
//           error: err
//         });
//         callback(err);
//       }
//     );
// };

// AccountManager.prototype.addAccount = function(profile, account, user, callback) {
//   PostScheduler.initiateAccountScheduling(account, user);

//   Profile.update({ _id: profile._id }, { $push: { accounts: account } }, function(err, updated) {
//     if (err) {
//       log.error('AccountManager: failed add account to profile', {
//         profileId: profile && profile._id.toString(),
//         account,
//         error: err
//       });
//       return callback(err);
//     }

//     if (dbNotUpdated(updated)) {
//       log.error('AccountManager: failed add account to profile via update', {
//         profileId: profile && profile._id.toString(),
//         account,
//         updated: updated && updated.result
//       });
//       return callback();
//     }

//     Audit.account('account:added', user && user._id, profile._id, account._id, {
//       account: account.account,
//       network: account.network
//     });

//     return this.updateBraintreeSubscription(profile, function() {
//       Profile.newAccountRouteWizard(account._id, function() {
//         if (err) {
//           log.error('AccountManager: failed to update new new account profile routes', {
//             userId: user && user._id.toString(),
//             profileId: profile._id.toString(),
//             accountId: account._id.toString(),
//             error: err
//           });
//         }
//         callback(null, account);
//       });
//     }.bind(this));
//   }.bind(this));
// };

// AccountManager.prototype.removeProfile = function(profile, socialProfileId, user, callback) {
//   var removeProfile;
//   for (var i = 0; i < profile.profiles.length; i++) {
//     if (profile.profiles[i]._id.toString() === socialProfileId.toString()) {
//       removeProfile = profile.profiles[i];
//       break;
//     }
//   }
//   if (!removeProfile) {
//     return callback(null, profile);
//   }

//   profile.profiles = profile.profiles.filter(function(p) {
//     return p._id.toString() !== removeProfile._id.toString();
//   });
//   profile.markModified('profiles');

//   var removeAccounts = profile.accounts.filter(function(a) {
//     return a.socialProfileId && a.socialProfileId.toString() === removeProfile._id.toString();
//   });

//   if (removeProfile.network === Types.network.google.code) {
//     Profile.find({ 'profiles.uid': removeProfile.uid }, '_id profiles.uid profiles.network subscription', (err, profiles) => {
//       if (err) {
//         log.error('AccountManager: failed find profiles with specific profile', {
//           socialProfileId: socialProfileId.toString(),
//           error: err
//         });
//       }
//       const socProfiles = profiles && profiles
//         .map(profile => {
//           return profile.profiles
//             .filter(p => p.network === Types.network.google.code && (p.uid === removeProfile.uid || p.parentUid === removeProfile.uid));
//         })
//         .reduce((accs, paccs) => (paccs.length && accs.concat(paccs)) || accs, [])
//         .filter(p => p.uid !== removeProfile.uid);

//       if (!err && !socProfiles.length) {
//         GoogleRefreshToken.remove({ uid: removeProfile.uid }).exec();
//       }

//       this.removeAccounts(profile, removeAccounts, user, callback);
//     });
//   } else {
//     this.removeAccounts(profile, removeAccounts, user, callback);
//   }
// };

// AccountManager.prototype.removeAccount = function(profile, account, user, callback) {
//   this.removeAccounts(profile, [account], user, callback);
// };

// AccountManager.prototype.removeAccounts = function(profile, removeAccounts, user, callback) {
//   var removeAccount;
//   while (removeAccounts.length) {
//     removeAccount = removeAccounts.pop();
//     this._removeAccount(profile, removeAccount, user);
//   }

//   this.profileManager.updateAccountsByUseLimits(profile).then(() => {
//     this.updateBraintreeSubscription(profile, function() {
//       callback(null, profile);
//     }.bind(this));
//   }).catch(error => {
//     log.error('AccountManager: failed to update accounts by limits for profile ' + profile._id.toString()+' after account removal', {
//       profileId: profile._id.toString(),
//       error
//     });
//     callback(error);
//   });
// };

// AccountManager.prototype._removeAccount = function(profile, removeAccount, user) {
//   profile.removeAccount(removeAccount._id);

//   Post.remove({ aid: removeAccount._id }, function(err) {
//     if (err) {
//       log.error('AccountManager: failed to remove posts of deleted account', {
//         accountId: removeAccount._id.toString(),
//         profileId: profile._id.toString(),
//         error: err
//       });
//     }
//   });

// if (removeAccount.network === Types.network.instagram.code) {
// DeviceAssigned.remove({ tokens: { $in: [DeviceAssigned.hash(null, removeAccount.token)] } })
// .then(updated => {
//   log.warn(`Removed DeviceAssigned records for ${removeAccount._id.toString()} account`, {
//     count: updated && updated.result && updated.result.n
//   });
// })
//     .catch(error =>
//       log.error(`Failed to remove DeviceAssigned records for removed ${removeAccount._id.toString()} account`, {
//         stack: error.stack
//       })
//     );
// }

//   if (removeAccount.network === Types.network.google.code) {
//     FetchAccount.remove({ _id: removeAccount._id }, function(error) {
//       if (error) {
//         log.error(`AccountManager: failed to remove deleted account ${removeAccount._id.toString()} from FetchAccount collection`, { error });
//       }
//     });
//   }

//   Post.count({ aid: new ObjectId(removeAccount._id), state: { $eq: States.post.published.code } }, (error, count) => {
//     const publishedPosts = error ? -1 : count || 0;
//     const connectedForDays = removeAccount.started && Math.ceil((new Date().valueOf() - removeAccount.started.valueOf()) / (24 * 60 * 60 * 1000)) || 0;

//     Audit.account('account:removed', user && user._id, profile._id, removeAccount._id, {
//       account: removeAccount.account,
//       network: removeAccount.network,
//       publishedPosts,
//       connectedForDays
//     });

//     log.info('Removed account', {
//       profileId: profile._id.toString(),
//       accountId: removeAccount._id.toString(),
//       account: Types.accountTypeName(removeAccount.account),
//       network: Types.networkTypeName(removeAccount.network),
//       publishedPosts,
//       connectedForDays
//     });
//   });
// };
