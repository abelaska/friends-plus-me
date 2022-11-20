// prettier-ignore
/* jshint node: true */

const _ = require('lodash');
const log = require('@fpm/logging').default;
const { Types, States } = require('@fpm/constants');
const {
  dbNotUpdated,
  ObjectId,
  DeviceAssigned,
  Profile,
  FetchAccount,
  Audit,
  Post,
  Queue,
  GoogleRefreshToken
} = require('@fpm/db');
const { OAuthTokenCryptor } = require('@fpm/token');
const { PostScheduler } = require('@fpm/post');
const { braintreeClientByProfile } = require('./braintree');

const AccountManager = (module.exports = function AccountManager({ profileManager }) {
  this.oAuthTokenCryptor = new OAuthTokenCryptor();
  this.profileManager = profileManager;
  return this;
});

AccountManager.prototype.enhanceAddOnRequest = function (req, profile, sub, addOnName, newCount, premiumMetricName) {
  return this.enhanceRequest(req, profile, sub, 'addOns', addOnName, newCount, premiumMetricName);
};

AccountManager.prototype.enhanceDiscountRequest = function (req, profile, sub, addOnName, newCount, premiumMetricName) {
  return this.enhanceRequest(req, profile, sub, 'discounts', addOnName, newCount, premiumMetricName);
};

AccountManager.prototype.enhanceRequest = function (req, profile, sub, type, addOnName, newCount, premiumMetricName) {
  let addon;
  const unitPrice = profile.premium && profile.premium.metrics && profile.premium.metrics[premiumMetricName];
  let finalUnitPrice = unitPrice;

  req = req || {};
  req[type] = req[type] || {};

  if (unitPrice !== null && unitPrice !== undefined) {
    finalUnitPrice = unitPrice;
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
};

AccountManager.prototype._findBraintreeSubscription = function (profile, callback) {
  let amount = 0;
  let nextPay;
  const subId = profile.subscription && profile.subscription.id;
  if (!subId) {
    log.warn('AccountManager: profile subscription.id not found', { profileId: profile._id.toString() });
    return callback(null, { amount, nextPay });
  }
  braintreeClientByProfile(profile).subscription.find(subId, (err, sub) => {
    if (err) {
      log.error('AccountManager: failed to find braintree subscription', {
        subId,
        profileId: profile._id.toString(),
        error: err
      });
      return callback(err);
    }
    nextPay = sub.nextBillingDate;
    amount = Math.ceil(sub.nextBillAmount * 100) / 100;
    callback(null, { amount, nextPay });
  });
};

AccountManager.prototype.updateBraintreeSubscription = function (profile, callback) {
  const plan = profile && profile.plan && profile.plan.name;
  const subId = profile && profile.subscription && profile.subscription.id;
  if (!subId || !(plan === 'PAYWYUM' || plan.indexOf('PAYWYUM_') === 0)) {
    if (callback) {
      callback();
    }
    return;
  }
  Profile.findById(
    profile._id,
    '_id use subscription premium subject accounts.uid accounts.network accounts.account profiles.uid profiles.network profiles.account',
    (error, profile) => {
      if (error) {
        if (callback) {
          callback(error);
        }
        return;
      }
      let req = {
        options: {
          prorateCharges: false
        }
      };

      braintreeClientByProfile(profile).subscription.find(subId, (err, sub) => {
        if (err) {
          log.error('AccountManager: failed to find braintree subscription', {
            profileId: profile._id.toString(),
            subId,
            error: err
          });
          return callback(err);
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
        const connectedInstagramQueues = profile.accounts.filter(a => a.network === Types.network.instagram.code)
          .length;
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

        braintreeClientByProfile(profile).subscription.update(subId, req, (err, sub) => {
          if (err || !sub || !sub.subscription) {
            log.error('AccountManager: failed to set subscription addons quantity', {
              subId,
              profileId: profile._id.toString(),
              req: JSON.stringify(req),
              error: err || { message: 'Subscription is empty' }
            });
          } else {
            const balance = Math.floor(sub.subscription.balance * 100);
            const amount = Math.floor(sub.subscription.price * 100);
            Profile.update(
              { _id: profile._id },
              { $set: { 'subscription.amount': amount, 'subscription.balance': balance } },
              (error, updated) => {
                if (error) {
                  log.error('AccountManager: failed to update profile subscription in database', {
                    profileId: profile._id.toString(),
                    updated,
                    error
                  });
                }
              }
            );
          }
          if (callback) {
            callback();
          }
        });
      });
    }
  );
};

AccountManager.prototype.addProfile = function (pid, socialProfile, callback) {
  socialProfile = _.cloneDeep(socialProfile);
  Profile.findOne(
    { _id: pid },
    '_id premium plan subject profiles._id profiles.connectedAt profiles.uid profiles.network profiles.account subscription'
  )
    .exec()
    .then(
      profile => {
        const profileExists =
          profile.profiles &&
          profile.profiles.length &&
          profile.profiles.find(
            p =>
              p.uid === socialProfile.uid && p.network === socialProfile.network && p.account === socialProfile.account
          );

        if (socialProfile.oauth.secret) {
          socialProfile.oauth.secret = this.oAuthTokenCryptor.encrypt(socialProfile.oauth.secret);
        }
        if (socialProfile.oauth.token) {
          socialProfile.oauth.token = this.oAuthTokenCryptor.encrypt(socialProfile.oauth.token);
        }

        if (profileExists) {
          const $set = {
            'profiles.$.reconnectedAt': new Date(),
            'profiles.$.parentUid': socialProfile.parentUid,
            'profiles.$.image': socialProfile.image,
            'profiles.$.name': socialProfile.name,
            'profiles.$.email': socialProfile.email,
            'profiles.$.url': socialProfile.url,
            'profiles.$.oauth.token': socialProfile.oauth.token,
            'profiles.$.oauth.expiresAt': socialProfile.oauth.expiresAt,
            'profiles.$.meta.publishViaApi': !!(socialProfile.meta && socialProfile.meta.publishViaApi)
          };

          if (socialProfile.oauth.secret) {
            $set['profiles.$.oauth.secret'] = socialProfile.oauth.secret;
          }

          return Profile.update({ 'profiles._id': profileExists._id }, { $set }, (err, updated) => {
            if (err || dbNotUpdated(updated)) {
              log.error('AccountManager: failed to update social account', {
                profileId: pid.toString(),
                socialProfile,
                updated: updated && updated.result,
                stack: err && err.stack,
                error: err
              });
              return callback(err || { error: { message: 'Failed to update social account' } });
            }
            return callback(null, profileExists._id);
          });
        }

        socialProfile._id = new ObjectId();

        return Profile.update({ _id: pid }, { $push: { profiles: socialProfile } }, (err, updated) => {
          if (err || dbNotUpdated(updated)) {
            log.error('AccountManager: failed to add a new social account to the profile', {
              profileId: pid.toString(),
              socialProfile,
              updated: updated && updated.result,
              // stack: err && err.stack,
              error: err
            });
            return callback(err || { error: { message: 'Failed to add a new social account to team' } });
          }

          return this.updateBraintreeSubscription(profile, () => {
            callback(null, socialProfile._id);
          });
        });
      },
      err => {
        log.error('AccountManager: failed find profile', {
          profileId: pid.toString(),
          error: err
        });
        callback(err);
      }
    );
};

AccountManager.prototype.addAccount = function (profile, account, user, callback) {
  PostScheduler.initiateAccountScheduling(account, user);

  Profile.update({ _id: profile._id }, { $push: { accounts: account } }, (err, updated) => {
    if (err) {
      log.error('AccountManager: failed add account to profile', {
        profileId: profile && profile._id.toString(),
        account,
        error: err
      });
      return callback(err);
    }

    if (dbNotUpdated(updated)) {
      log.error('AccountManager: failed add account to profile via update', {
        profileId: profile && profile._id.toString(),
        account,
        updated: updated && updated.result
      });
      return callback();
    }

    Audit.account('account:added', user && user._id, profile._id, account._id, {
      account: account.account,
      network: account.network
    });

    return this.updateBraintreeSubscription(profile, () => {
      Profile.newAccountRouteWizard(account._id, () => {
        if (err) {
          log.error('AccountManager: failed to update new new account profile routes', {
            userId: user && user._id.toString(),
            profileId: profile._id.toString(),
            accountId: account._id.toString(),
            error: err
          });
        }
        callback(null, account);
      });
    });
  });
};

AccountManager.prototype.removeProfile = function (profile, socialProfileId, user, callback) {
  let removeProfile;
  for (let i = 0; i < profile.profiles.length; i++) {
    if (profile.profiles[i]._id.toString() === socialProfileId.toString()) {
      removeProfile = profile.profiles[i];
      break;
    }
  }
  if (!removeProfile) {
    return callback(null, profile);
  }

  profile.profiles = profile.profiles.filter(p => {
    return p._id.toString() !== removeProfile._id.toString();
  });
  profile.markModified('profiles');

  const removeAccounts = profile.accounts.filter(a => {
    return a.socialProfileId && a.socialProfileId.toString() === removeProfile._id.toString();
  });

  if (removeProfile.network === Types.network.google.code) {
    Profile.find(
      { 'profiles.uid': removeProfile.uid },
      '_id profiles.uid profiles.network subscription',
      (err, profiles) => {
        if (err) {
          log.error('AccountManager: failed find profiles with specific profile', {
            socialProfileId: socialProfileId.toString(),
            error: err
          });
        }
        const socProfiles =
          profiles &&
          profiles
            .map(profile => {
              return profile.profiles.filter(
                p =>
                  p.network === Types.network.google.code &&
                  (p.uid === removeProfile.uid || p.parentUid === removeProfile.uid)
              );
            })
            .reduce((accs, paccs) => (paccs.length && accs.concat(paccs)) || accs, [])
            .filter(p => p.uid !== removeProfile.uid);

        if (!err && !socProfiles.length) {
          GoogleRefreshToken.remove({ uid: removeProfile.uid }).exec();
        }

        this.removeAccounts(profile, removeAccounts, user, callback);
      }
    );
  } else {
    this.removeAccounts(profile, removeAccounts, user, callback);
  }
};

AccountManager.prototype.removeAccount = function (profile, account, user, callback) {
  this.removeAccounts(profile, [account], user, callback);
};

AccountManager.prototype.removeAccounts = function (profile, removeAccounts, user, callback) {
  let removeAccount;
  while (removeAccounts.length) {
    removeAccount = removeAccounts.pop();
    this._removeAccount(profile, removeAccount, user);
  }

  this.profileManager
    .updateAccountsByUseLimits(profile)
    .then(() => {
      this.updateBraintreeSubscription(profile, () => {
        callback(null, profile);
      });
    })
    .catch(error => {
      log.error(
        `AccountManager: failed to update accounts by limits for profile ${profile._id.toString()} after account removal`,
        {
          profileId: profile._id.toString(),
          error
        }
      );
      callback(error);
    });
};

AccountManager.prototype._removeAccount = function (profile, removeAccount, user) {
  profile.removeAccount(removeAccount._id);

  if (removeAccount.ng) {
    Queue.remove({ _id: removeAccount._id }, err => {
      if (err) {
        log.error('AccountManager: failed to remove queue of deleted account', {
          accountId: removeAccount._id.toString(),
          profileId: profile._id.toString(),
          message: err.toString(),
          stack: err.stack
        });
      }
    });
  }

  if (removeAccount.network === Types.network.instagram.code) {
    DeviceAssigned.remove({ tokens: { $in: [DeviceAssigned.hash(null, removeAccount.token)] } })
      .then(updated => {
        log.warn(`Removed DeviceAssigned records for ${removeAccount._id.toString()} account`, {
          count: updated && updated.result && updated.result.n
        });
      })
      .catch(error =>
        log.error(`Failed to remove DeviceAssigned records for removed ${removeAccount._id.toString()} account`, {
          message: error.toString(),
          stack: error.stack
        })
      );
  }

  if (removeAccount.network === Types.network.google.code) {
    FetchAccount.remove({ _id: removeAccount._id }, error => {
      if (error) {
        log.error(
          `AccountManager: failed to remove deleted account ${removeAccount._id.toString()} from FetchAccount collection`,
          { error }
        );
      }
    });
  }

  Post.count({ aid: new ObjectId(removeAccount._id), state: { $eq: States.post.published.code } }, (error, count) => {
    const publishedPosts = error ? -1 : count || 0;
    const connectedForDays =
      (removeAccount.started &&
        Math.ceil((new Date().valueOf() - removeAccount.started.valueOf()) / (24 * 60 * 60 * 1000))) ||
      0;

    Audit.account('account:removed', user && user._id, profile._id, removeAccount._id, {
      account: removeAccount.account,
      network: removeAccount.network,
      publishedPosts,
      connectedForDays
    });

    log.info('Removed account', {
      profileId: profile._id.toString(),
      accountId: removeAccount._id.toString(),
      account: Types.accountTypeName(removeAccount.account),
      network: Types.networkTypeName(removeAccount.network),
      publishedPosts,
      connectedForDays
    });

    Post.remove({ aid: removeAccount._id }, err => {
      if (err) {
        log.error('AccountManager: failed to remove posts of deleted account', {
          accountId: removeAccount._id.toString(),
          profileId: profile._id.toString(),
          message: err.toString(),
          stack: err.stack
      });
      }
    });      
  });
};
