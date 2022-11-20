// const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { PostText } = require('@fpm/post');
const { Types, States } = require('@fpm/constants');
const { ObjectId, Profile, User, Post } = require('@fpm/db');
// const { createRedisClient } = require('@fpm/redis');
const moment = require('moment');
const _ = require('underscore');
const async = require('async');
const tools = require('../lib/tools');
const utils = require('../lib/utils');
const auth = require('../lib/auth');
// const recaptcha = require('../lib/recaptcha');

// const redis = createRedisClient(config);

module.exports = ({ router, postScheduler, queueManager }) => {
  function prepareScheduleTime(account, post, shareType, callback) {
    switch (shareType) {
      case 'first':
        postScheduler.firstTime(account._id, (err, scheduledTime) => {
          if (!err && !scheduledTime) {
            log.warn(`Next scheduled time for account ${account._id.toString()} not defined, publishing now`);
            scheduledTime = moment.utc();
            post.state = States.post.scheduledByUser.code;
          } else if (err || !scheduledTime) {
            return callback(
              err || { error: { message: `First scheduled time for queue ${account._id.toString()} not defined!` } }
            );
          }
          post.publishAt = scheduledTime.toDate();
          return callback();
        });
        break;
      case 'next':
        postScheduler.nextTime(account._id, (err, scheduledTime) => {
          if (!err && !scheduledTime) {
            log.warn(`Next scheduled time for account ${account._id.toString()} not defined, publishing now`);
            scheduledTime = moment.utc();
            post.state = States.post.scheduledByUser.code;
          } else if (err || !scheduledTime) {
            return callback(
              err || { error: { message: `Next scheduled time for queue ${account._id.toString()} not defined!` } }
            );
          }
          post.publishAt = scheduledTime.toDate();
          return callback();
        });
        break;
      default:
        callback();
    }
  }

  function isAccountQueueLimitReached(profile, account, callback) {
    const networkName = Types.networkTypeName(account.network);
    const accountName = Types.accountTypeName(account.account);
    const use = profile.use;
    const network = (use && use.network && networkName && use.network[networkName]) || null;
    const globalLimit = use && use.maxQueueSizePerAccount;
    const networkLimit = (network && network.maxQueueSizePerAccount) || null;
    const accountLimit =
      (network && accountName && network[accountName] && network[accountName].maxQueueSizePerAccount) || null;
    const maxQueueSize = accountLimit || networkLimit || globalLimit || -1;

    if (maxQueueSize > 0) {
      return Post.count(
        {
          aid: account._id,
          state: { $lt: States.post.draft.code }
        },
        (err, count) => {
          if (err || count === undefined || count === null) {
            log.error('Failed to determine account queue size', {
              accountId: account._id.toString(),
              profileId: profile._id.toString(),
              error: err
            });
            return callback(err, true, maxQueueSize);
          }
          return callback(null, !(maxQueueSize > count), maxQueueSize);
        }
      );
    }
    return callback(null, maxQueueSize === 0, maxQueueSize);
  }

  router.post('/1/share/format/google', (req, res) => {
    let html = (req.body && req.body.html) || '';
    if (html) {
      html = utils.deformatGoogleHtml(
        utils.replaceAutocompletedInputWithValue(utils.replaceAutocompletedInputWithUid(html, '+'))
      );
    }
    res.json({ html });
  });

  function decodeDestinations(destinations) {
    if (!destinations || !destinations.length) {
      return null;
    }
    const result = {
      isPerson: false,
      isCircle: false,
      isMyCircle: false,
      isPublicCircle: false,
      isYourCircles: false,
      isExtendedCircles: false,
      isCollection: false,
      isCommunity: false
    };
    let d;
    for (let i = 0; i < destinations.length; i++) {
      d = destinations[i];
      if (d.name === 'Public') {
        result.isPublicCircle = true;
      } else if (d.name === 'Your Circles') {
        result.isYourCircles = true;
      } else if (d.name === 'Extended Circles') {
        result.isExtendedCircles = true;
      } else if (d.type === 'circle') {
        result.isMyCircle = true;
      } else if (d.type === 'person') {
        result.isPerson = true;
      } else if (d.type === 'collection') {
        result.isCollection = true;
      } else if (d.type === 'community') {
        result.isCommunity = true;
      }
    }
    result.isCircle = result.isPublicCircle || result.isYourCircles || result.isExtendedCircles || result.isMyCircle;
    return result;
  }

  function decodeDestinationsToAccountCode(account, destinations) {
    const d = decodeDestinations(destinations);
    if (d) {
      if (d.isExtendedCircles || d.isMyCircle || d.isYourCircles || d.isPerson) {
        return Types.createCode(account.network, Types.account.circle.code);
      }
      if (d.isCollection) {
        return Types.createCode(account.network, Types.account.collection.code);
      }
      if (d.isCommunity) {
        return Types.createCode(account.network, Types.account.community.code);
      }
    }
    return Types.createCode(account.network, account.account);
  }

  // function recaptchaKey(user) {
  //   return `recaptcha:${user._id.toString()}:posts`;
  // }

  // function recaptchaResolve(user, increment, callback) {
  //   return (error, counter) => {
  //     if (error) {
  //       log.error('Failed to get recaptcha counter from redis', { error });
  //       return callback(true);
  //     }
  //     let count = parseInt(counter || '0', 10);
  //     if (isNaN(count)) {
  //       return callback(true);
  //     }
  //     count += increment || 0;

  //     // number of queued posts after which will the recaptcha be required once
  //     const maxPostsWithout = user.emailVerified ? 150 : 10;

  //     // callback(count >= maxPostsWithout);
  //     // FIXME recaptcha vyrazena z provozu, protoze uz neni potreba
  //     callback(false);
  //   };
  // }

  // callback( required: boolean )
  // function isRecaptchaRequired(user, increment, callback) {
  //   redis.get(recaptchaKey(user), recaptchaResolve(user, increment, callback));
  // }

  // callback( required: boolean )
  // function incRecaptchaCounter(user, increment, callback) {
  //   redis.incrby(recaptchaKey(user), increment, recaptchaResolve(user, 0, callback));
  // }

  // function resetRecaptchaCounter(user, callback) {
  //   redis.set(recaptchaKey(user), 0, error => {
  //     if (error) {
  //       log.error(`Failed to reset recaptcha counter ${recaptchaKey(user)} from redis`, { error });
  //     }
  //     return callback();
  //   });
  // }

  // function validateRecaptchaIfNeeded(res, user, increment, recaptchaToken, successCallback) {
  //   incRecaptchaCounter(user, increment, required => {
  //     if (!required) {
  //       return successCallback();
  //     }
  //     if (!recaptchaToken) {
  //       return res.status(400).json({ error: { message: 'Recaptcha token not present' } });
  //     }
  //     recaptcha.validate(recaptchaToken).then(
  //       response => {
  //         if (response.success) {
  //           resetRecaptchaCounter(user, () => {
  //             successCallback();
  //           });
  //         } else {
  //           res.status(400).json({ error: { message: 'Invalid recaptcha!' } });
  //         }
  //       },
  //       error => {
  //         log.error('Failed to validate recaptcha', { error });
  //         res.status(500).json({ error: { message: 'Failed to validate recaptcha' } });
  //       }
  //     );
  //   });
  // }

  router.get(
    '/1/share/recaptcha/:increment',
    tools.tokenRequired,
    (req, res) => res.json({ required: false })
    // isRecaptchaRequired(req.user, parseInt(req.params.increment || '0', 10), required => res.json({ required }))
  );

  router.post('/1/share', tools.tokenRequired, (req, res) => {
    const body = req.body;
    const shareType = body.type;
    const source = body.source;
    const reshare = body.reshare;
    // const recaptchaToken = body.recaptcha;
    const shareAccounts = body.accounts || [];
    const shareAccountsIds = shareAccounts.map(sa => sa._id);
    const now = moment.utc();
    let publishAt = (body.publishAt && moment.utc(body.publishAt)) || null;

    body.html = body.html || '';

    // validateRecaptchaIfNeeded(res, user, shareAccountsIds.length, recaptchaToken, () => {
    Profile.distinct('_id', { 'accounts._id': { $in: shareAccountsIds } }, (err, profiles) => {
      if (err) {
        log.error('Failed to find profiles for post share', {
          userId: req.user._id.toString(),
          accountsId: shareAccounts,
          message: err.toString(),
          stack: err.stack
        });
        return res.status(500).json({ error: { message: 'Failed to share post' } });
      }

      const ids = {};
      const accountsWithQueueLimitReached = [];

      async.eachLimit(
        profiles,
        4,
        (profileId, cb) => {
          auth.rest.everyProfileTeamMember(
            req.user,
            profileId,
            (user, profile) => {
              const maxHtmlLength = profile.plan.name === 'FREE' ? 10 * 1024 : 256 * 1024;
              if (body.html.length > maxHtmlLength) {
                return cb({
                  error: {
                    message: `Post message is too long! ${body.html.length}>${maxHtmlLength}`
                  }
                });
              }

              let accounts = profile.accounts.filter(
                account =>
                  !profile.isAccountBlocked(account) &&
                  _.contains(shareAccountsIds, account._id.toString()) &&
                  (user.isProfileOwnerOrManager(profile) || user.isAccountManager(account))
              );

              const accountsId = accounts.map(a => a._id.toString());

              async.eachLimit(
                accounts,
                8,
                (account, cb2) => {
                  if (shareType === 'now') {
                    return cb2();
                  }
                  return isAccountQueueLimitReached(profile, account, (err2, isLimitReached, maxQueueSize) => {
                    if (err2) {
                      return cb2(err2);
                    }
                    if (isLimitReached) {
                      accountsWithQueueLimitReached.push({
                        accountId: account._id.toString(),
                        max: maxQueueSize
                      });
                    }
                    return cb2();
                  });
                },
                err2 => {
                  if (err2) {
                    return cb(err2);
                  }
                  if (accountsWithQueueLimitReached.length) {
                    return cb();
                  }

                  if (!profile.use || !profile.use.publishToGoogleProfile) {
                    accounts = accounts.filter(
                      account =>
                        !(
                          account.network === Types.network.google.code &&
                          account.account === Types.account.profile.code
                        )
                    );
                  }

                  async.eachLimit(
                    accounts,
                    8,
                    (account, cb3) => {
                      const isGoogle = account.network === Types.network.google.code;
                      const isTwitter = account.network === Types.network.twitter.code;
                      const isFacebook = account.network === Types.network.facebook.code;
                      const isLinkedin = account.network === Types.network.linkedin.code;
                      const isReshare = isGoogle && reshare && reshare.id;
                      const shareAccount = _.findWhere(shareAccounts, { _id: account._id.toString() });
                      const destinations = shareAccount && shareAccount.destinations;
                      const accountCode = decodeDestinationsToAccountCode(account, destinations);
                      let processor = `${isReshare ? 'reshare' : 'post'}:${Types.networkTypeName(
                        account.network
                      )}:${Types.accountTypeName(account.account)}`;

                      if (isGoogle && accountCode !== Types.createCode(account.network, account.account)) {
                        processor += `:${Types.codeToNetworkAndAccount(accountCode).account.typeName}`;
                      }

                      const html = isTwitter
                        ? PostText.shortenTweetHtml(body)
                        : isFacebook
                          ? PostText.shortenFacebookHtml(body)
                          : isLinkedin ? PostText.shortenLinkedinHtml(body) : body.html;

                      const parentAccount =
                        account.parentUid &&
                        _.findWhere(profile.accounts, { network: account.network, uid: account.parentUid });
                      const post = new Post({
                        aid: account._id,
                        pid: profile._id,
                        uid: account.uid,
                        parentAid: parentAccount && parentAccount._id,
                        parentUid: account.parentUid,
                        categoryId: account.category && account.category.id,
                        blockedAt: account.state === States.account.enabled.code ? null : moment.utc().toDate(),
                        accountCode,
                        destinations,
                        source,
                        html,
                        attachments: body.attachments,
                        createdBy: user._id,
                        processor
                      });

                      if (isReshare) {
                        post.reshare = {
                          is: true,
                          id: reshare.id
                        };
                      }

                      if (
                        post.attachments &&
                        post.attachments.link &&
                        post.attachments.link.short &&
                        post.attachments.link.short.aid
                      ) {
                        post.attachments.link.short.aid = new ObjectId(post.attachments.link.short.aid);
                      }

                      if (account.network === Types.network.google.code) {
                        post.appendNoShare =
                          _.chain(profile.accountPossibleRouteDestinations(account))
                            .uniq()
                            .intersection(accountsId)
                            .value().length > 0;
                      }

                      if (post.isPublishableOnlyByExtension) {
                        post.extension.publishers = profile.usersWhoCanPublishToAccount(account);
                      } else {
                        delete post.extension;
                      }

                      switch (shareType) {
                        case 'first':
                        case 'next':
                          post.state = States.post.scheduledByScheduler.code;
                          break;
                        case 'now':
                        case 'schedule':
                          if (publishAt && publishAt.isBefore(now)) {
                            publishAt = now.clone();
                          }
                          post.publishAt = (publishAt || now).toDate();
                          post.state = States.post.scheduledByUser.code;
                          break;
                        default:
                          break;
                      }

                      if (account.ng) {
                        post.ng = true;
                        post.state = States.post.scheduled.code;
                        post.blockedAt = new Date();
                        post.save((err4, _post) => {
                          if (err4) {
                            return cb3(err4);
                          }

                          let type;
                          switch (shareType) {
                            case 'first':
                              type = 'first';
                              break;
                            case 'next':
                              type = 'last';
                              break;
                            default:
                              type = 'custom';
                              break;
                          }

                          return queueManager
                            .schedulePost({ post, type })
                            .then(() => {
                              ids[account._id.toString()] = _post._id.toString();
                              cb3();
                            })
                            .catch(error => {
                              Post.remove({ _id: post._id }, err5 => {
                                if (err5) {
                                  log.error('Failed to remove post that failed to be scheduled', {
                                    userId: req.user._id.toString(),
                                    postId: post._id.toString(),
                                    message: err5.toString(),
                                    stack: err5.stack
                                  });
                                }
                              });
                              if (error.code === 'QUEUE_SIZE_LIMIT_REACHED') {
                                accountsWithQueueLimitReached.push({
                                  accountId: account._id.toString(),
                                  max: error.limit
                                });
                                return cb3();
                              }
                              return cb3(error);
                            });
                        });
                      } else {
                        prepareScheduleTime(account, post, shareType, err3 => {
                          if (err3) {
                            return cb3(err3);
                          }
                          return post.save((err4, _post) => {
                            if (err4) {
                              return cb3(err4);
                            }
                            ids[account._id.toString()] = _post._id.toString();
                            return cb3();
                          });
                        });
                      }
                    },
                    cb
                  );
                }
              );
            },
            cb,
            '_id use members routes accounts'
          );
        },
        err2 => {
          if (err2) {
            log.error('Failed to share post', {
              userId: req.user._id.toString(),
              post: body,
              message: err2.toString(),
              stack: err2.stack
            });
            return res.status(500).json({ error: { message: 'Failed to share post' } });
          }

          User.update({ _id: req.user._id }, { $set: { 'extension.lastAccounts': shareAccountsIds } }, err3 => {
            if (err3) {
              log.error('Failed to save destination accounts of the last share', {
                userId: req.user._id.toString(),
                shareAccounts,
                message: err3.toString(),
                stack: err3.stack
              });
            }
          });

          if (accountsWithQueueLimitReached.length) {
            return res.json({ success: false, queueLimitReached: accountsWithQueueLimitReached });
          }
          return res.json({ success: true, ids });
        }
      );
    });
    // });
  });
};
