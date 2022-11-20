/* jshint node: true */
'use strict';

const Promise = require('bluebird');
const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { Types, States } = require('@fpm/constants');
const { dbUpdatedCount, dbNotUpdated, ObjectId, OAuthAppUser, Profile, Asset, Queue, ProfileName, DeletedProfile, PricingPlan, Audit, Transaction, User, Post, FetchAccount, AccountBlacklist } = require('@fpm/db');
const { teamMemberInvited } = require('@fpm/events');
const moment = require('moment');
const async = require('async');
const _ = require('lodash');
const tools = require('../lib/tools');
const isVatValid = require('../lib/vatValidator');
const auth = require('../lib/auth');
const FreePG = require('../lib/paygateways/Free');
const auth0 = require('../lib/auth0');
const { isEmailBlacklisted } = require('../lib/email.blacklist');

module.exports = ({ router, customerLifecycle, premiumManager, accountManager, profileManager }) => {
  const secureAccounts = accounts => (accounts || []).map(a => {
    a.token = undefined;
    a.secret = undefined;
    a.tagline = undefined;
    return a;
  });

  const secureProfiles = profiles => (profiles || []).map(sp => {
    sp.oauth = undefined;
    return sp;
  });

  router.get('/1/profile/:profile/profiles/billable', tools.tokenRequired, (req, res) => {
    const profileId = req.params.profile;
    auth.rest.onlyProfileManager(res, req.user, profileId, (user, profile) => {
      accountManager._findBraintreeSubscription(profile, (err, result) => {
        if (err) {
          return res.status(500).send({ error: { message: 'Failed to find subscription detail' } });
        }
        res.status(200).send(result);
      });
    });
  });

  // router.get('/1/profile/:profile/prices', tools.tokenRequired, function(req, res) {

  //   var op = req.params.op,
  //       profileId = req.params.profile,
  //       user = req.user;

  //   auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {

  //     PricingPlan.findAllAvailable(null, null, function(err, plans) {
  //       if (err || !plans || !plans.length) {
  //         log.error('Failed to list pricing plans for profile '+profileId, {
  //           error: err});
  //         res.status(500).json([]);
  //       } else {
  //         plans.forEach(function(plan) {
  //           delete plan.__v;
  //           delete plan._id;
  //           delete plan.available;
  //         });
  //         res.json(plans);
  //       }
  //     });
  //   });
  // });

  router.delete('/1/profile/:profile/socialprofile/:id', tools.tokenRequired, (req, res) => {
    const profileId = req.params.profile;
    const socialProfileId = req.params.id;
    auth.rest.onlyProfileManager(
      res,
      req.user,
      profileId,
      (user, profile) => {
        accountManager.removeProfile(profile, socialProfileId, user, (err, updatedProfile) => {
          if (err) {
            return res.status(500).send({
              error: { message: `Failed to remove social account ${socialProfileId} from team ${profileId}` }
            });
          }
          return res.status(200).send({
            user: {
              routes: updatedProfile.routes,
              accounts: secureAccounts(updatedProfile.accounts),
              profiles: secureProfiles(updatedProfile.profiles)
            }
          });
        });
      },
      '_id use members accounts profiles routes hashtags plan subscription'
    );
  });

  router.post('/1/profile/:profile/free/subscribe', tools.tokenRequired, function(req, res) {
    var profileId = req.params.profile,
      body = req.body,
      user = req.user,
      planName = body.plan,
      planInterval = body.interval;

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {
      var pg = new FreePG({ customerLifecycle, profile, user, profileManager });

      pg.subscribe(
        {
          planName: planName,
          planInterval: planInterval,
          couponCode: body.couponCode,
          addons: body.addons || {}
        },
        function(err) {
          if (err) {
            log.error('Free subscription have failed', {
              userId: user._id.toString(),
              error: err
            });

            res.status(500).json({
              error: {
                code: (err && err.code) || 'UNKNOWN',
                message: (err && err.message ? err.message : '') || 'Failed to complete upgrade'
              }
            });
          } else {
            res.json({
              use: pg.profile.use,
              plan: pg.profile.plan,
              accounts: pg.profile.accounts
            });
          }
        }
      );
    });
  });

  function listAvailablePlans(user, callback) {
    PricingPlan.findAllAvailable(user, function(err, plans) {
      if (err || !plans || !plans.length) {
        callback(err || { error: { message: 'No plan found' } });
      } else {
        var plansObj = {};

        for (var i = 0; i < plans.length; i++) {
          delete plans[i].members;

          plansObj[plans[i].id] = plans[i];
        }

        callback(null, plansObj, plans);
      }
    });
  }

  router.post('/1/profile/create', tools.tokenRequired, function(req, res) {
    var user = req.user;
    var name = req.body.name || '';
    if (!name) {
      return res.status(400).send({ error: { message: 'Cannot create profile with empty name.' } });
    }

    Profile.find({ _id: { $in: user.profiles.owner } }, '_id plan.name members affiliate subject', function(err, profiles) {

      if (err || !profiles || !profiles.length) {
        log.error('Failed to fetch profiles owned by user', {
          userId: user._id.toString(),
          error: err
        });
        return res.status(500).send({ error: { message: 'Failed to fetch user profiles.' } });
      }

      var myFreeProfilesCount = profiles.filter(function(p) { return user.isProfileOwner(p) && ['FREE', 'FREEFOREVER'].indexOf(p.plan.name) > -1; }).length;
      if (myFreeProfilesCount >= 5) {
        return res.status(403).send({ error: { message: 'Users are allowed to have only 5 FREE teams.' } });
      }

      var myTrialProfilesCount = profiles.filter(function(p) { return user.isProfileOwner(p) && p.plan.name === 'TRIAL'; }).length;
      if (myTrialProfilesCount >= 25) {
        return res.status(403).send({ error: { message: 'Users are allowed to have only 25 TRIAL teams.' } });
      }

      var refProfile = profiles[0].toObject();
      var isRefProfileTrial = refProfile.plan.name === 'TRIAL';
      var isRefProfilePremium = ['TRIAL', 'FREE', 'FREEFOREVER'].indexOf(refProfile.plan.name) === -1;
      var useTrialPlan = isRefProfileTrial || isRefProfilePremium;

      var planId = useTrialPlan ? 'TRIAL' : 'FREE';
      var planValidUntil = useTrialPlan ? (refProfile.plan.validUntil || moment.utc().add('days', config.get('premium:trial:signup:expireInDays')).toDate()) : null;

      PricingPlan.findOne({ id: planId }, function(err, plan) {
        if (err || !plan) {
          return res.status(500).send({ error: { message: 'Failed to fetch detail of the '+planId+' plan for new team.' } });
        }
        var use = _.defaults(plan.use || {}, config.get('users:use'));
        var subject = refProfile.subject && _.cloneDeep(refProfile.subject) || {};
        if (!subject.country) {
          subject.country = user.country;
        }
        var profile = new Profile({
          use: use,
          name: name,
          plan: {
            name: plan.id,
            validUntil: planValidUntil,
          },
          contact: {
            name: user.name,
            email: user.email
          },
          members: {
            owner: [user._id]
          },
          hashtags: {
            ns: { noshare: true, dst: [] },
            noshare: { noshare: true, dst: [] },
            plusonly: { noshare: true, dst: [] }
          },
          affiliate: refProfile.affiliate && _.cloneDeep(refProfile.affiliate),
          subject
        });
        profile.save(function(err) {
          if (err) {
            log.error('Failed to create new profile', {
              userId: user._id.toString(),
              error: err
            });
            return res.status(500).send({ error: { message: 'Failed to create new profile.' } });
          }

          log.info('Created new user profile', {
            userId: user._id.toString(),
            profileId: profile._id.toString()
          });

          User.update({ _id: user._id }, { $push: { 'profiles.owner': profile._id } }).exec(function(err) {
            if (err) {
              log.error('Failed to assign new profile to user', {
                userId: user._id.toString(),
                profileId: profile._id.toString(),
                error: err
              });
            } else {
              log.info('New profile assigned to user', {
                userId: user._id.toString(),
                profileId: profile._id.toString()
              });
            }
          });

          listAvailablePlans(user, function(err, plans) {
            if (err || !plans) {
              log.error('Failed to fetch pricing plans for new profile', {
                userId: user._id.toString(),
                profileId: profile._id.toString(),
                error: err
              });
              return res.status(500).send({ error: { message: 'Failed to fetch pricing plans for new profile.' } });
            }

            profile = profile.toObject();
            profile.plans = plans;

            res.json({
              profile: profile
            });
          });
        });
      });
    });
  });

  router.post('/1/profile/:id/delete', tools.tokenRequired, function(req, res) {
    var tasks = [],
      profileId = req.params.id,
      reason1 = req.body.reason1 || '',
      reason2 = req.body.reason2 || '',
      reason3 = req.body.reason3 || '',
      user = req.user;

    const isTosViolation = reason1 === 'tos_violation';

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {
      if (user.isNotProfileOwner(profile)) {
        res.status(403).send({ error: { message: 'Only owner can delete profile' } });
        return;
      }

      // profile.accounts.forEach(function(account) {
      //   if (account.network === Types.network.google.code && account.secret) {
      //     tasks.push(function(cb) {
      //       // FIXME vycist hodnotu refresh token z GoogleRefreshToken
      //       google.revokeAccessToken(account.secret, function(err/*, data, tm*/) {
      //         if (err) {
      //           log.error('Failed to revoke Google refresh token of account '+account._id.toString(), {error: err });
      //         } else {
      //           log.info('Successfully revoked Google refresh token of account '+account._id.toString());
      //         }
      //         cb();
      //       });
      //     });
      //   }
      // });

      if (isTosViolation) {
        // block user via auth0
        if (user.auth0Id) {
          tasks.push(function(cb) {
            auth0
              .blockUser(user.auth0Id)
              .then(function() {
                cb();
              })
              .catch(cb);
          });
        }

        // add connected accounts to blacklist
        profile.accounts.forEach(function(a) {
          tasks.push(function(cb) {
            var b = new AccountBlacklist({
              uid: a.uid,
              account: a.account,
              network: a.network,
              reason: reason1
            });
            b.save(function(err) {
              if (err) {
                if (err.code !== 11000) {
                  log.error('Failed to blacklist account', {
                    errorString: err.toString(),
                    error: err,
                    blacklist: b.toObject()
                  });
                }
              }
              // err se nepredava schvalne
              cb();
            });
          });
        });

        profile.accounts.forEach(function(p) {
          tasks.push(function(cb) {
            var b = new AccountBlacklist({
              uid: p.uid,
              account: p.account,
              network: p.network,
              reason: reason1
            });
            b.save(function(err) {
              if (err) {
                if (err.code !== 11000) {
                  log.error('Failed to blacklist account', {
                    errorString: err.toString(),
                    error: err,
                    blacklist: b.toObject()
                  });
                }
              }
              // err se nepredava schvalne
              cb();
            });
          });
        });

        profile.profiles.forEach(function(p) {
          tasks.push(function(cb) {
            var b = new AccountBlacklist({
              uid: p.uid,
              account: p.account,
              network: p.network,
              reason: reason1
            });
            b.save(function(err) {
              if (err) {
                if (err.code !== 11000) {
                  log.error('Failed to blacklist account profile', {
                    errorString: err.toString(),
                    error: err,
                    blacklist: b.toObject()
                  });
                }
              }
              // err se nepredava schvalne
              cb();
            });
          });
        });
      }

      tasks.push(function(cb) {
        var p = profile.toObject();
        delete p._id;
        var u = new DeletedProfile(p);
        u.deleted = moment.utc().toDate();
        u.deletedId = profile._id.toString();
        u.save(function(err) {
          if (err) {
            log.error(
              'Failed to save deleting profile ' + profile._id.toString() + ' to deleted profiles collection.',
              {
                errorString: err.toString(),
                error: err
              }
            );
          }
          cb(err);
        });
      });

      tasks.push(function(cb) {
        profile.remove(function(err) {
          if (err) {
            log.error('Failed to delete profile ' + profile._id.toString(), { error: err });
          }
          cb(err);
        });
      });

      tasks.push(function(cb) {
        Queue.remove({ pid: profile._id }, function(err) {
          if (err) {
            log.error('Failed to remove queues of profile ' + profile._id.toString(), { error: err });
          }
          cb(err);
        });
      });

      tasks.push(function(cb) {
        FetchAccount.removeProfileAccounts(profile, function(err) {
          if (err) {
            log.error('Failed to remove fetch accounts of profile ' + profile._id.toString(), { error: err });
          }
          cb(err);
        });
      });

      tasks.push(function(cb) {
        Post.remove({ pid: profile._id }, function(err) {
          if (err) {
            log.error('Failed to remove posts of profile ' + profile._id.toString(), { error: err });
          }
          // no need to return error
          cb();
        });
      });

      tasks.push(function(cb) {
        Asset.update({ pid: profile._id }, { $set: { state: 'delete' } }, { multi: true }, function(error) {
          if (error) {
            log.error('Failed to switch assets of profile ' + profile._id.toString()+' to state delete', { error });
          }
          // no need to return error
          cb();
        });
      });

      tasks.push(function(cb) {
        OAuthAppUser.remove({ uid: user._id }, function(error) {
          if (error) {
            log.error('Failed to remove OAuthAppUser records for user ' + user._id.toString(), { error });
          }
          // no need to return error
          cb();
        });
      });

      // uzivatele smazat pouze pokud je mazan posledni profil, ktery vlastni.
      if (!user.profiles.owner || user.profiles.owner.length < 2) {
        tasks.push(function(cb) {
          // smazat user zaznam vlastnika a manager users odstranit profil z users.profiles
          async.parallel(
            [
              async.apply(
                Profile.update.bind(Profile),
                { 'members.manager': user._id },
                { $pull: { 'members.manager': user._id } },
                { multi: true }
              ),
              async.apply(
                Profile.update.bind(Profile),
                { 'members.amanager': user._id },
                { $pull: { 'members.amanager': user._id } },
                { multi: true }
              ),
              async.apply(
                Profile.update.bind(Profile),
                { 'members.contributor': user._id },
                { $pull: { 'members.contributor': user._id } },
                { multi: true }
              ),
              async.apply(
                Profile.update.bind(Profile),
                { 'accounts.members.manager': user._id },
                { $pull: { 'accounts.members.manager': user._id } },
                { multi: true }
              ),
              async.apply(
                User.update.bind(User),
                { _id: user._id },
                {
                  $set: {
                    state: States.user.deleted.code,
                    deleted: moment.utc().toDate(),
                    deleteReason1: reason1,
                    deleteReason2: reason2,
                    deleteReason3: reason3,
                    profiles: {}
                  }
                }
              )
            ],
            function(err, results) {
              if (err) {
                log.error('Failed to remove deleted profile from Users.profiles and deleting of owner user account', {
                  userId: user._id.toString(),
                  profileId: profile._id.toString(),
                  error: err
                });
              } else {
                log.info(
                  'Updated ' +
                    results[0].n +
                    ' and ' +
                    results[1].n +
                    ' managed profiles(s) and ' +
                    results[2].n +
                    ' owner account(s) switched to deleted state'
                );
              }
              cb(err);
            }
          );
        });
      } else {
        tasks.push(function(cb) {
          User.update({ _id: user._id }, { $pull: { 'profiles.owner': profile._id } }, function(err) {
            if (err) {
              log.error('Failed to remove profile ' + profile._id.toString() + ' from user', { error: err });
            }
            // no need to return error
            cb();
          });
        });
      }

      async.series(tasks, function(err /*, results*/) {
        if (err) {
          log.error('Failed to delete user profile', {
            message: err.toString(),
            error: err
          });
          res.status(500).send({});
        } else {
          log.info(
            'Profile ' +
              profile._id.toString() +
              ' of user ' +
              user._id.toString() +
              ' ' +
              user.email +
              ' successfully deleted.',
            {
              reason1: reason1,
              reason2: reason2,
              reason3: reason3
            }
          );

          // /* jshint -W064 */
          // Metric('user-events', { ev: 'delete', uid: user._id.toString(), pid: profile._id.toString() });

          res.send({});
        }
      });
    });
  });

  router.post('/1/profile/:profile/hashtags', tools.tokenRequired, function(req, res) {
    // vytvoreni control hashtagu
    var i,
      chdgFound,
      profileId = req.params.profile,
      body = req.body,
      isNoShare = body.noshare || false,
      hashtag = (body.hashtag || '').toLowerCase(),
      user = req.user;

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {
      if (profile.hashtags && profile.hashtags[hashtag]) {
        res.status(400).send({ error: { message: 'Control hashtag "' + hashtag + '" already exists.' } });
      } else {
        if (profile.routes.length) {
          profile.routes.forEach(function(r) {
            chdgFound = false;
            if (r.chdg && r.chdg.length) {
              for (i = 0; i < r.chdg.length; i++) {
                if (isNoShare) {
                  if (r.chdg[i].noshare) {
                    if (!_.contains(r.chdg[i].hashtag, hashtag)) {
                      r.chdg[i].hashtag.push(hashtag);
                    }
                    chdgFound = true;
                    break;
                  }
                } else {
                  if (_.contains(r.chdg[i].hashtag, hashtag)) {
                    chdgFound = true;
                    break;
                  }
                }
              }
            }
            if (!chdgFound) {
              r.chdg.push({
                keep: true,
                noshare: isNoShare,
                hashtag: [hashtag],
                dst: []
              });
            }
          });
        }
        profile.markModified('routes');

        profile.hashtags = profile.hashtags || {};
        profile.hashtags[hashtag] = { noshare: isNoShare, keep: true, dst: [] };

        profile.markModified('hashtags');

        profile.save(function(err) {
          if (err) {
            log.error('Failed to create a new profile control hashtag', {
              userId: user._id.toString(),
              profileId: profileId,
              data: req.body,
              error: err
            });
            res.status(500).send({ error: { message: 'Failed to create a new profile control hashtag' } });
          } else {
            log.debug('Successfully created new profile control hashtag', {
              userId: user._id.toString(),
              profileId: profileId,
              data: req.body
            });
            res.json({
              hashtags: profile.hashtags,
              routes: profile.routes
            });
          }
        });
      }
    });
  });

  router.post('/1/profile/:profile/hashtags/delete', tools.tokenRequired, function(req, res) {
    // odstraneni control hashtagu
    var htc,
      removeHt,
      profileId = req.params.profile,
      body = req.body,
      hashtag = (body.hashtag || '').toLowerCase(),
      user = req.user;

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {
      var ht = profile.hashtags && profile.hashtags[hashtag];
      if (ht) {
        // odstranit hashtag z routovani vsech accounts
        profile.routes.forEach(function(r) {
          if (r.chdg && r.chdg.length) {
            removeHt = [];

            r.chdg.forEach(function(c) {
              htc = c.hashtag.length;
              c.hashtag = _.without(c.hashtag, hashtag);
              if (!c.noshare && c.hashtag.length !== htc) {
                removeHt.push(c);
              }
            });

            if (removeHt.length) {
              r.chdg = _.difference(r.chdg, removeHt);
            }
          }
        });
        profile.markModified('routes');

        delete profile.hashtags[hashtag];
        profile.markModified('hashtags');

        profile.save(function(err) {
          if (err) {
            log.error('Failed to create a new profile control hashtag', {
              userId: user._id.toString(),
              profileId: profileId,
              data: req.body,
              error: err
            });
            res.status(500).send({ error: { message: 'Failed to create a new profile control hashtag' } });
          } else {
            log.debug('Successfully created new profile control hashtag', {
              userId: user._id.toString(),
              profileId: profileId,
              data: req.body
            });
            res.json({
              hashtags: profile.hashtags,
              routes: profile.routes
            });
          }
        });
      } else {
        res.status(400).send({ error: { message: 'Control hashtag "' + hashtag + '" not found.' } });
      }
    });
  });

  router.put('/1/profile/:profile/hashtags', tools.tokenRequired, function(req, res) {
    // aktualizace seznamu uctu prirazenych control hashtagu
    var i,
      accountId,
      profileId = req.params.profile,
      body = req.body,
      hashtag = (body.hashtag || '').toLowerCase(),
      addAccounts = body.add,
      removeAccounts = body.remove,
      user = req.user;

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {
      var ht = profile.hashtags && profile.hashtags[hashtag];
      if (!ht) {
        res.status(404).send({ error: { message: 'Control hashtag "' + hashtag + '" not found.' } });
      } else {
        var pushed,
          updateKeep = body.keep === undefined ? false : true,
          updateHashtags = (addAccounts && addAccounts.length) || (removeAccounts && removeAccounts.length);

        if (addAccounts && addAccounts.length) {
          for (i = 0; i < addAccounts.length; i++) {
            accountId = addAccounts[i];

            if (profile.findAccountById(accountId) && !_.contains(ht.dst, accountId)) {
              ht.dst.push(accountId);
            }

            if (profile.routes.length) {
              /* jshint -W083 */
              profile.routes.forEach(function(r) {
                if (_.contains(r.allowed, accountId)) {
                  pushed = false;
                  if (r.chdg && r.chdg.length) {
                    r.chdg.forEach(function(c) {
                      if (_.contains(c.hashtag, hashtag)) {
                        if (!_.contains(c.dst, accountId)) {
                          c.dst.push(accountId);
                        }
                        pushed = true;
                      }
                    });
                  } else if (!r.chdg) {
                    r.chdg = [];
                  }
                  if (!pushed) {
                    r.chdg.push({
                      hashtag: [hashtag],
                      noshare: false,
                      dst: [accountId]
                    });
                  }
                }
              });
            }
          }
        }

        if (removeAccounts && removeAccounts.length) {
          for (i = 0; i < removeAccounts.length; i++) {
            accountId = removeAccounts[i];
            ht.dst = _.without(ht.dst, accountId);

            if (profile.routes.length) {
              profile.routes.forEach(function(r) {
                if (r.chdg && r.chdg.length) {
                  r.chdg.forEach(function(c) {
                    if (_.contains(c.hashtag, hashtag) && _.contains(c.dst, accountId)) {
                      c.dst = _.without(c.dst, accountId);
                    }
                  });
                }
              });
            }
          }
        }

        if (updateHashtags) {
          profile.hashtags[hashtag] = ht;
        }

        if (updateKeep && profile.routes.length) {
          profile.hashtags[hashtag].keep = body.keep || false;

          profile.routes.forEach(function(r) {
            if (r.chdg && r.chdg.length) {
              r.chdg.forEach(function(c) {
                if (_.contains(c.hashtag, hashtag)) {
                  c.keep = body.keep || false;
                }
              });
            }
          });
        }

        profile.markModified('hashtags');
        profile.markModified('routes');

        profile.save(function(err) {
          if (err) {
            log.error('Failed to update profile control hashtag', {
              userId: user._id.toString(),
              profileId: profileId,
              data: req.body,
              error: err
            });
            res.status(500).send({ error: { message: 'Failed to update profile control hashtag' } });
          } else {
            log.debug('Successfully updated profile control hashtag', {
              userId: user._id.toString(),
              profileId: profileId,
              data: req.body
            });
            res.json({
              hashtags: profile.hashtags,
              routes: profile.routes
            });
          }
        });
      }
    });
  });

  router.put('/1/profile/:profile/:op', tools.tokenRequired, function(req, res) {
    var op = req.params.op,
      profileId = req.params.profile,
      body = req.body,
      save = false,
      includeRoutes = false,
      user = req.user;

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {
      var doSave = function() {
        if (save) {
          profile.save(function(err) {
            if (err) {
              log.error('Failed to update profile', {
                userId: user._id.toString(),
                profileId: profileId,
                op: op,
                data: req.body,
                error: err
              });
              res.status(500).send({ error: { message: 'Failed to update organization info. Please try again.' } });
            } else {
              log.debug('Successfully updated profile', {
                userId: user._id.toString(),
                profileId: profileId,
                op: op,
                data: req.body
              });
              res.json({
                routes: includeRoutes ? profile.routes : undefined
              });
            }
          });
        } else {
          res.json({});
        }
      };

      switch (op) {
        case 'preset':
          if (
            _.contains(
              ['google-growth', 'mirroring', 'google-growth-controlled', 'mirroring-controlled'],
              body.preset
            ) &&
            profile.preset !== body.preset
          ) {
            save = true;
            profile.preset = body.preset;

            if (body.updateAccounts) {
              includeRoutes = true;

              profile.markModified('routes');
              profile.markModified('accounts');

              profile.accounts.forEach(function(account) {
                account.appendLink = profile.presetIs('google-growth', 'google-growth-controlled');
              });

              var accountId, assignedToHts;

              profile.routes.forEach(function(route) {
                profile.accounts.forEach(function(account) {
                  accountId = account._id.toString();

                  var i;

                  // remove from already added control hashtag groups
                  if (route.chdg && route.chdg.length) {
                    for (i = 0; i < route.chdg.length; i++) {
                      route.chdg[i].dst = _.without(route.chdg[i].dst, accountId);
                    }
                  }

                  // remove from default destination group
                  route.ddg = _.without(route.ddg, accountId);

                  if (route.src === accountId || !_.contains(route.allowed, accountId)) {
                    return;
                  }

                  // add to control hashtag groups
                  assignedToHts = _.chain(profile.hashtags)
                    .pairs()
                    .filter(function(pair) {
                      return pair[1].dst && _.contains(pair[1].dst, accountId);
                    })
                    .map(function(pair) {
                      return pair[0];
                    })
                    .value();

                  if (route.chdg && route.chdg.length) {
                    for (i = 0; i < route.chdg.length; i++) {
                      for (var j = 0; j < assignedToHts.length; j++) {
                        if (_.contains(route.chdg[i].hashtag, assignedToHts[j])) {
                          route.chdg[i].dst.push(accountId);
                        }
                      }
                    }
                  }

                  if (profile.presetIs('google-growth', 'mirroring')) {
                    // add to default destination group
                    route.ddg.push(accountId);
                  }
                });
              });
            }
          }
          break;
        case 'name':
          if (body.name !== undefined && body.name !== null && profile.name !== body.name) {
            if (user.isProfileOwner(profile)) {
              save = true;
              profile.name = body.name;
            } else {
              ProfileName.update({ uid: user._id, pid: profile._id }, { $set: { name: body.name } }, { upsert: true }, function(err, updated) {
                if (dbNotUpdated(updated)) {
                  log.error('Failed to update profile name', {
                    userId: user._id.toString(),
                    profileId: profile._id.toString(),
                    updated: updated,
                    error: err
                  });
                }
              });
            }
          }
          break;
        case 'contact':
          profile.contact = profile.contact || {};
          if (body.name !== undefined && body.name !== null && profile.contact.name !== body.name) {
            save = true;
            profile.contact.name = body.name;
          }
          if (body.email !== undefined && body.email !== null && profile.contact.email !== body.email) {
            save = true;
            profile.contact.email = body.email;
          }
          break;
        case 'organization':
          var validateVatId = false;
          /*jshint -W041*/
          if (body.org !== undefined && body.org !== null && profile.subject.org !== body.org) {
            save = true;
            profile.subject.org = body.org;
          }
          if (body.billTo !== undefined && body.billTo !== null && profile.subject.billTo !== body.billTo) {
            save = true;
            profile.subject.billTo = body.billTo;
          }
          if (body.vatId !== undefined && body.vatId !== null && profile.subject.vatId !== body.vatId) {
            save = true;
            profile.subject.vatId = body.vatId;
            validateVatId = profile.subject.vatId ? true : false;
          }
          if (body.country !== undefined && body.country !== null && profile.subject.country !== body.country) {
            save = true;
            profile.subject.country = body.country;
          }
          if (
            body.invoiceEmail !== undefined &&
            body.invoiceEmail !== null &&
            profile.subject.invoiceEmail !== body.invoiceEmail
          ) {
            save = true;
            profile.subject.invoiceEmail = body.invoiceEmail;
          }
          if (validateVatId) {
            return isVatValid(profile.subject.country, profile.subject.vatId, function(err, isValid) {
              if (err) {
                log.error('Failed to validate VAT ID', {
                  country: profile.subject.country,
                  vatId: profile.subject.vatId,
                  error: err
                });
                res.status(500).send({ error: { message: 'VAT ID validation failed. Please try again later.' } });
              } else if (isValid) {
                doSave();
              } else {
                log.warn('Invalid VAT ID', {
                  country: profile.subject.country,
                  vatId: profile.subject.vatId
                });
                res.status(400).send({ error: { message: 'VAT ID "' + profile.subject.vatId + '" is not valid!' } });
              }
            });
          }
          break;
        default:
          res.status(400).send({ error: { message: 'Unknown operation' } });
          break;
      }

      doSave();
    });
  });

  function containsArrayArray(arr, arr2) {
    if (arr && arr.length > 0 && arr2 && arr2.length > 0) {
      for (var i = 0; i < arr.length; i++) {
        for (var j = 0; j < arr2.length; j++) {
          if (arr[i] === arr2[j]) {
            return true;
          }
        }
      }
    }
    return false;
  }

  router.post('/1/profile/:profile/routes', tools.tokenRequired, function(req, res) {
    var profileId = req.params.profile, route = req.body && req.body.route, user = req.user;

    if (route && route.src) {
      auth.rest.onlyProfileManager(
        res,
        user,
        profileId,
        function(user, profile) {
          var accountsId = _.map(profile.accounts, function(a) {
            return a._id.toString();
          });

          if (!_.contains(accountsId, route.src)) {
            return res.status(403).send({ error: { code: 'UNKNOWN_ACCOUNT', message: 'Unknown queue.' } });
          }

          route.routeToDraft = !!route.routeToDraft;
          route.ddg = _.intersection(accountsId, route.ddg || []);
          route.chdg = route.chdg || [];

          if (route.chdg.length) {
            route.chdg.forEach(function(chdg) {
              chdg.dst = _.intersection(accountsId, chdg.dst || []);
            });
          }

          // kontrola na to zda routovaci tabulky neobsahuji Google+ Page v pripade ze je repost do G+ page zakazany
          var net = profile.use ? profile.use.network ? profile.use.network.google : null : null,
            // netDisallowedAsRepostDst = net.disallowedAsRepostDst, NOT IMPLEMENTED
            googlePageDisallowedAsRepostDst = net && net.page ? net.page.disallowedAsRepostDst === undefined || net.page.disallowedAsRepostDst === null ? false : net.page.disallowedAsRepostDst : false;
          if (googlePageDisallowedAsRepostDst) {
            var allowed = true, gpages = profile.findAccountsByType(Types.network.google.code, Types.account.page.code);
            if (gpages.length > 0) {
              var i, gpageIds = [];

              for (i = 0; i < gpages.length; i++) {
                gpageIds.push(gpages[i]._id.toString());
              }

              if (route.ddg && route.ddg.length > 0) {
                allowed = containsArrayArray(route.ddg, gpageIds) ? false : true;
              }
              if (route.chdg && route.chdg.length > 0 && allowed) {
                var chdg;
                for (i = 0; i < route.chdg.length; i++) {
                  chdg = route.chdg[i];
                  if (chdg.dst && chdg.dst.length > 0) {
                    allowed = containsArrayArray(chdg.dst, gpageIds) ? false : true;
                  }
                  if (!allowed) {
                    break;
                  }
                }
              }
            }
            if (!allowed) {
              return res.status(403).send({
                error: { code: 'REPOST_TO_GPAGES_NOT_ALLOWED', message: 'Repost to Google+ Pages is not allowed.' }
              });
            }
          }

          profile.updateRoute(route);
          profile.save(function(err) {
            if (err) {
              log.error('Failed to update profile routes', {
                userId: user._id.toString(),
                profileId: profileId,
                data: JSON.stringify(route),
                error: err
              });
              res.status(500).send({ error: { message: 'Failed to update profile' } });
            } else {
              log.debug('Successfully updated profile routes', {
                userId: user._id.toString(),
                profileId: profileId,
                data: JSON.stringify(route)
              });

              res.status(200).send({ route: profile.findRouteBySrc(route.src) });
            }
          });
        },
        '_id use members routes hashtags accounts'
      );
    } else {
      res.status(400).send({ error: { message: 'Invalid data' } });
    }
  });

  router.get('/1/profile/:profile/transactions', tools.tokenRequired, function(req, res) {
    var profileId = req.params.profile, user = req.user;

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {
      Transaction.find({ pid: profile._id }, null, { sort: { payedAt: 1 } }, function(err, txs) {
        if (err) {
          log.error('Failed to fetch profile ' + profileId + ' transactions from database', {
            error: err
          });
          res.status(500).json([]);
        } else {
          res.json(txs || []);
        }
      });
    });
  });

  function listProfileMembers(profile, callback) {
    var userId,
      owners = profile.members.owner || [],
      managers = profile.members.manager || [],
      contributors = profile.members.contributor || [],
      amanagers = profile.members.amanager || [],
      userIds = _.union(owners, managers, amanagers, contributors);

    User.find({ _id: { $in: userIds } }, 'name image email', function(err, users) {
      if (err) {
        log.error('Failed to fetch profile ' + profile._id.toString() + ' members from database', {
          error: err
        });
        callback(err);
      } else {
        var result = {
          profile: {
            members: profile.members,
            invitations: profile.invitations
          },
          members: []
        };

        if (users && users.length) {
          for (var i = 0; i < users.length; i++) {
            userId = users[i]._id;
            users[i].role = users[i]._containsObjectId(owners, userId) ? 'owner' : users[i]._containsObjectId(managers, userId) ? 'manager' : users[i]._containsObjectId(amanagers, userId) ? 'amanager' : users[i]._containsObjectId(contributors, userId) ? 'contributor' : 'unknown';
          }
          result.members = users;
        }

        callback(null, result);
      }
    });
  }

  function listProfileMembersAndSend(res, profile) {
    listProfileMembers(profile, function(err, result) {
      if (err) {
        res.status(500).json({});
      } else {
        res.json(result || {});
      }
    });
  }

  router.get('/1/profile/:profile/members', tools.tokenRequired, function(req, res) {
    var profileId = req.params.profile, user = req.user;

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {
      listProfileMembersAndSend(res, profile);
    });
  });

  router.post('/1/profile/:profile/members', tools.tokenRequired, function(req, res) {
    var profileId = req.params.profile,
      inviteEmail = req.body.email,
      inviteRole = req.body.role || 'contributor',
      user = req.user;

    const isBlacklisted = isEmailBlacklisted(inviteEmail);

    if (isBlacklisted || !inviteEmail || !_.contains(['manager', 'amanager', 'contributor'], inviteRole)) {
      res.status(400).json({});
      return;
    }

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {
      premiumManager.checkBalance(profile, 'member', function(err, isOk) {
        if (err) {
          log.error('Failed to check credit balance', {
            profileId: profileId,
            error: err
          });
          return res.status(500).json({});
        }

        if (!isOk) {
          return res.status(400).json({ error: { message: 'Mimimum balance reached' } });
        }

        profile.invitations = profile.invitations || {};

        var maxPeople = (profile.use.maxMembers || 0) + 1,
          profileMembers = _.chain(profile.members).values().flatten().value().length,
          provileInvitations = _.size(profile.invitations);

        if (profileMembers + provileInvitations >= maxPeople) {
          return res.status(400).json({ error: { message: 'Maximum number of members reached.' } });
        }

        var invitationFound = _.chain(profile.invitations).values().findWhere({ email: inviteEmail }).value();
        if (invitationFound) {
          listProfileMembersAndSend(res, profile);
        } else {
          var inviteId = new ObjectId(), $set = {};

          $set['invitations.' + inviteId.toString()] = {
            inviterId: user._id.toString(),
            email: inviteEmail,
            role: inviteRole,
            createdAt: moment.utc().toDate()
          };

          Profile.update({ _id: profile._id }, { $set: $set }, function(err, updated) {
            if (err) {
              log.error('Failed to register team member invitation', {
                email: inviteEmail,
                role: inviteRole,
                error: err
              });
              res.status(500).json({});
            } else {
              if (dbUpdatedCount(updated)) {
                profile.invitations[inviteId.toString()] = {
                  inviterId: user._id.toString(),
                  email: inviteEmail,
                  role: inviteRole,
                  createdAt: moment.utc().toDate()
                };

                log.info('Team member invitation successfully persisted', {
                  email: inviteEmail,
                  role: inviteRole
                });

                teamMemberInvited({ profile, inviter: user, inviteeCode: inviteId, inviteeEmail: inviteEmail }).then(() => {
                  log.info('Team member invitation email successfully queued', {
                    email: inviteEmail,
                    role: inviteRole
                  });
                }, error => {
                  log.error('Failed to queue team member invitation email', {
                    email: inviteEmail,
                    role: inviteRole,
                    message: error.toString(),
                    error
                  });
                });

                Audit.profile('member:invited', user._id, profile._id, {
                  email: inviteEmail,
                  role: inviteRole
                });

                listProfileMembersAndSend(res, profile);
              } else {
                log.warn('Invite of a team member was not successfull', {
                  email: inviteEmail,
                  role: inviteRole
                });
                listProfileMembersAndSend(res, profile);
              }
            }
          });
        }
      });
    });
  });

  router.delete('/1/profile/:profile/invitations/:invitationId', tools.tokenRequired, function(req, res) {
    var profileId = req.params.profile, invitationId = req.params.invitationId, user = req.user;

    if (!invitationId) {
      res.status(400).json({});
      return;
    }

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {
      if (profile.invitations && profile.invitations[invitationId]) {
        var $unset = {};

        $unset['invitations.' + invitationId] = '';

        Profile.update({ _id: profile._id }, { $unset: $unset }, function(err, updated) {
          if (err) {
            log.error('Failed to remove team member invitation', {
              invitationId: invitationId,
              error: err
            });
            res.status(500).json({});
          } else {
            if (dbUpdatedCount(updated)) {
              delete profile.invitations[invitationId];

              log.info('Invitation of a team member successfully removed', {
                invitationId: invitationId
              });
            } else {
              log.warn('Invite removal of a team member was not successfull', {
                invitationId: invitationId
              });
            }
            listProfileMembersAndSend(res, profile);
          }
        });
      } else {
        listProfileMembersAndSend(res, profile);
      }
    });
  });

  router.delete('/1/profile/:profile/members/:memberId', tools.tokenRequired, function(req, res) {
    var profileId = req.params.profile, memberId = req.params.memberId, user = req.user;

    if (!memberId) {
      res.status(400).json({});
      return;
    }

    auth.rest.onlyProfileManager(res, user, profileId, function(user, profile) {
      if (user.isProfileOwnerOrManager(profile) && user._id.toString() !== memberId) {
        var role,
          found = false,
          profileSet = {
            $pull: {}
          },
          userSet = {
            $pull: {}
          },
          roles = _.pairs(profile.members);

        for (var i = 0; i < roles.length; i++) {
          if (user._containsObjectId(roles[i][1], memberId)) {
            role = roles[i][0];
            profileSet.$pull['members.' + role] = new ObjectId(memberId);
            userSet.$pull['profiles.' + role] = profile._id;
            found = true;
            break;
          }
        }

        if (found) {
          async.parallel(
            [
              function(cb) {
                Post.update(
                  {
                    pid: profile._id
                  },
                  {
                    $pull: { 'extension.publishers': new ObjectId(memberId) }
                  },
                  function(err, updated) {
                    if (err) {
                      log.error('Failed to remove publisher from profile posts', {
                        profileId: profile._id.toString(),
                        memberId: memberId,
                        updated: updated && updated.result,
                        error: err
                      });
                    }
                    cb(err);
                  }
                );
              },
              function(cb) {
                Profile.update({ _id: profile._id }, profileSet, function(err, updated) {
                  if (err) {
                    log.error('Failed to remove team member from profile', {
                      memberId: memberId,
                      profileId: profile._id.toString(),
                      error: err
                    });
                  } else {
                    if (dbUpdatedCount(updated)) {
                      profile.members[role] = _.filter(profile.members[role], function(v) {
                        return v.toString() !== memberId;
                      });
                      log.info('Team member successfully removed from profile', {
                        memberId: memberId,
                        profileId: profile._id.toString()
                      });
                    } else {
                      log.warn('Removal of a team member from profile was not successfull', {
                        memberId: memberId,
                        profileId: profile._id.toString()
                      });
                    }
                  }
                  cb(err);
                });
              },
              function(cb) {
                User.update({ _id: memberId }, userSet, function(err, updated) {
                  if (err) {
                    log.error('Failed to remove profile from user', {
                      userId: memberId,
                      profileId: profile._id.toString(),
                      error: err
                    });
                  } else {
                    if (dbUpdatedCount(updated)) {
                      log.info('Profile successfully removed from user', {
                        userId: memberId,
                        profileId: profile._id.toString()
                      });
                    } else {
                      log.warn('Removal of a profile from user was not successfull', {
                        userId: memberId,
                        profileId: profile._id.toString()
                      });
                    }
                  }
                  cb(err);
                });
              }
            ],
            function(err) {
              if (err) {
                res.status(500).json({});
              } else {
                listProfileMembersAndSend(res, profile);
              }
            }
          );
        } else {
          listProfileMembersAndSend(res, profile);
        }
      } else {
        listProfileMembersAndSend(res, profile);
      }
    });
  });

  // accounts queue size
  router.get('/1/profile/:profile/queues/stat', tools.tokenRequired, (req, res) => {
    const profileId = req.params.profile;
    const user = req.user;

    auth.rest.everyProfileTeamMemberRest(
      res,
      user,
      profileId,
      (user, profile) => {
        const result = {
          success: true,
          accounts: {}
        };
        const queues = user.canManageProfile(profile) ? profile.accounts : 
          profile.accounts.filter(a => user.canManageAccount(a));
        const queuesId = queues.filter(q => !q.ng);
        const queuesNgId = queues.filter(q => q.ng);

        Promise.all([
          Promise.map(queuesNgId, async ({ _id }) => {
            const q = await Queue.findOne({ _id }, { 'posts.count': 1 }).lean().exec();
            result.accounts[_id.toString()] = {
              size: (q && q.posts && q.posts.count) || 0
            };
          }, { concurrency: 8 }),
          Promise.map(queuesId, async ({ _id: aid }) => {
            const count = await Post.count({ aid, state: { $lt: States.post.draft.code } }).exec();
            result.accounts[aid.toString()] = {
              size: count || 0
            };
          }, { concurrency: 8 })  
        ]).then(() => {

          res.json(result);
        }).catch(error => {
          log.error('Failed to determine accounts queue size', {
            profileId,
            message: error.toString(),
            stack: error.stack
          });
          res.json({
            success: false,
            error: {
              message: 'Failed to get queues stats.'
            }
          });
        });
      },
      '_id members accounts._id accounts.members accounts.ng'
    );
  });
};
