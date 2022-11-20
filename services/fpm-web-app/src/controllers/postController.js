/* jshint node: true */
const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { Types, States } = require('@fpm/constants');
const { dbUpdatedCount, dbNotUpdated, ObjectId, Profile, User, Post, FetchAccount, ActivityLock } = require('@fpm/db');
const moment = require('moment');
const _ = require('underscore');
const async = require('async');
const utils = require('../lib/utils');
const tools = require('../lib/tools');
const auth = require('../lib/auth');

module.exports = ({ router, postScheduler }) => {
  function postsUsers(posts, callback) {
    const uids = _.chain(posts).map(d => [d.createdBy, d.modifiedBy]).flatten().map(u => u && u.toString()).filter(u => u).uniq().value();
    if (!uids.length) {
      return callback([]);
    }
    User.find({ _id: { $in: uids } }, '_id name image', (err, users) => {
      if (err) {
        log.error('Failed to fetch posts users', {
          error: err
        });
      }
      callback(users || []);
    });
  }

  function listPosts(basicQuery, basicSort) {
    return (req, res) => {
      const query = _.clone(basicQuery);
      const sort = basicSort && _.clone(basicSort) || { publishAt: 1 };
      const profileId = req.params.profileId;
      const filterAccount = req.query.account || null;
      const skip = req.query.skip && !isNaN(req.query.skip) && parseInt(req.query.skip, 10) || 0;
      const limit = Math.min(req.query.limit || 20, 20);
      const postId = req.query.post && ObjectId.isValid(req.query.post) && req.query.post;

      auth.rest.everyProfileTeamMemberRest(res, req.user, profileId, (user, profile) => {
        if (user.isProfileOwnerOrManager(profile) || user.isProfileContributor(profile)) {
          if (filterAccount) {
            query.aid = filterAccount;
          } else {
            query.pid = profileId;
          }
        } else {
          query.aid = { $in: [] };
          profile.accounts.forEach(account => {
            if (filterAccount) {
              if (filterAccount === account._id.toString() && user.isAccountManager(account)) {
                query.aid.$in.push(account._id);
              }
            } else
            if (user.isAccountManager(account)) {
              query.aid.$in.push(account._id);
            }
          });
        }

        if (postId) {
          query._id = postId;
        }

        Post.find(query).sort(sort).skip(skip).limit(limit)
        .exec((err, posts) => {
          if (err) {
            log.error('Failed to fetch queued posts from database', {
              profileId,
              query,
              message: err.toString(),
              stack: err.stack
            });
          }
          posts = posts || [];

          postsUsers(posts, users => {
            res.json({
              users: users || [],
              posts: posts || []
            });
          });
        });
      }, '_id members accounts._id accounts.members accounts.network');
    };
  }

  router.get('/1/profile/:profileId/queue', tools.tokenRequired, listPosts({
    state: { $lt: States.post.draft.code }
  }, { publishAt: 1 }));

  router.get('/1/profile/:profileId/timeline', tools.tokenRequired, listPosts({
    state: { $gt: States.post.draft.code }
  }, { completedAt: -1 }));

  // /////////////////////////////////////////////////////////////

  router.get('/1/profile/:profileId/drafts', tools.tokenRequired, function(req, res) {

    var profileId = req.params.profileId,
        skip = req.query.skip && parseInt(req.query.skip) || 0,
        limit = Math.min(req.query.limit || 20, 20),
        user = req.user;

    auth.rest.everyProfileTeamMemberRest(res, user, profileId, function(/*user, profile*/) {

      Post.find({pid: profileId, state: 0}, null, {skip: skip, limit: limit, sort: {createdAt: -1}}, function(err, drafts) {
        if (err) {
          log.error('Failed to fetch drafts from database', {
            profileId: profileId,
            error: err
          });
        }
        drafts = drafts || [];

        postsUsers(drafts, function(users) {
          res.json({
            users: users,
            drafts: drafts
          });
        });
      });
    }, '_id members accounts.members');
  });

  ///////////////////////////////////////////////////////////////

  function decodeDestinations(destinations) {

    if (!destinations || !destinations.length) {
      return null;
    }

    var d,
        result = {
          isPerson: false,
          isCircle: false,
          isMyCircle: false,
          isPublicCircle: false,
          isYourCircles: false,
          isExtendedCircles: false,
          isCollection: false,
          isCommunity: false
        };

    for (var i = 0; i < destinations.length; i++) {
      d = destinations[i];
      if (d.name === 'Public') {
        result.isPublicCircle = true;
      } else
      if (d.name === 'Your Circles') {
        result.isYourCircles = true;
      } else
      if (d.name === 'Extended Circles') {
        result.isExtendedCircles = true;
      } else
      if (d.type === 'circle') {
        result.isMyCircle = true;
      } else
      if (d.type === 'person') {
        result.isPerson = true;
      } else
      if (d.type === 'collection') {
        result.isCollection = true;
      } else
      if (d.type === 'community') {
        result.isCommunity = true;
      }
    }

    result.isCircle = result.isPublicCircle || result.isYourCircles ||
                      result.isExtendedCircles || result.isMyCircle;

    return result;
  }

  function decodeDestinationsToAccountCode(account, destinations) {
    var d = decodeDestinations(destinations);
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

  router.post('/1/profile/:profile/drafts', tools.tokenRequired, function(req, res) {

    var profileId = req.params.profile,
        body = req.body,
        accountId = body.aid && body.aid.toString(),
        user = req.user;

    auth.rest.everyProfileTeamMemberRest(res, user, profileId, function(user, profile) {

      if (body._id) {
        var $set = {
          modifiedAt: moment.utc().toDate(),
          modifiedBy: user._id
        };
        if (body.html) {
          $set.html = body.html;
        }
        if (body.attachments) {

          var ba = body.attachments;
          if (ba) {
            if (ba.link && ba.link.photo && ba.link.photo.thumbnail) {
              delete ba.link.photo.thumbnail.thumbnail;
            }
            if (ba.photo && ba.photo.thumbnail) {
              delete ba.photo.thumbnail.thumbnail;
            }
          }

          $set.attachments = body.attachments;
        }
        if (body.destinations && accountId) {

          var account = profile.findAccountById(accountId),
              isGoogle = account && account.network === Types.network.google.code;

          if (isGoogle) {
            var isReshare = isGoogle && body.reshare && body.reshare.id && body.reshare.is,
                destinations = body.destinations,
                accountCode = decodeDestinationsToAccountCode(account, destinations),
                processor = (isReshare ? 'reshare': 'post')+':'+Types.networkTypeName(account.network)+':'+Types.accountTypeName(account.account);

            if (accountCode !== Types.createCode(account.network, account.account)) {
              processor += ':' + Types.codeToNetworkAndAccount(accountCode).account.typeName;
            }

            $set.processor = processor;
            $set.accountCode = accountCode;
            $set.destinations = destinations;
          }
        }

        var q = {
          _id: body._id,
          pid: profile._id
          // ignorovat zamek lockedUntil: {$lt: moment.utc().toDate()}
        };

        if (user.isProfileContributor(profile)) {
          q.createdBy = user._id;
        }

        Post.update(q, { $set }, function(err, updated) {
          if (err) {
            log.error('Failed to update post/draft', {
              userId: user._id.toString(),
              profileId: profile._id.toString(),
              updated: updated && updated.result,
              draft: body,
              error: err});
            res.status(500).json({
              error: {
                message: 'Failed to update post/draft'
              }
            });
          } else {
            if (dbNotUpdated(updated)) {
              res.status(403).json({ error: { message: 'Permission denied' } });
            } else {
              res.json({ id: body._id });
            }
          }
        });
      } else {
        var drafts = [],
            // prozatim se draft uklada pouze do soukromeho profilu a ne do vsech jichz je uzivatel clenem
            profilesId = [];
            //profilesId = user.memberOfProfiles;

        if (profilesId.length === 0) {
          profilesId = [profile._id.toString()];
        }

        for (var i = 0; i < profilesId.length; i++) {
          drafts.push(new Post({
            pid: new ObjectId(profilesId[i]),
            html: body.html,
            attachments: body.attachments,
            createdBy: user._id,
            modifiedBy: user._id
          }));
        }

        async.eachLimit(drafts, 4, function(draft, cb) {
          draft.save(cb);
        }, function(err) {
          if (err) {
            log.error('Failed to create draft', {
              userId: user._id.toString(),
              profileId: profile._id.toString(),
              profilesId: profilesId,
              draft: body,
              error: err});
            res.status(500).json({
              error: {
                message: 'Failed to create draft'
              }
            });
          } else {
            var draft;

            for (var i = 0; i < drafts.length; i++) {
              if (drafts[i].pid.toString() === profile._id.toString()) {
                draft = drafts[i];
                break;
              }
            }

            res.json({
              id: draft && draft._id.toString()
            });
          }
        });
      }
    });
  });

  ///////////////////////////////////////////////////////////////

  router.delete('/1/profile/:profile/drafts/:draft', tools.tokenRequired, function(req, res) {

    var profileId = req.params.profile,
        draftId = req.params.draft,
        user = req.user;

    auth.rest.everyProfileTeamMemberRest(res, user, profileId, function(user, profile) {

      var q = {
        _id: draftId,
        pid: profile._id
      };

      if (user.isProfileContributor(profile)) {
        q.createdBy = user._id;
      }

      Post.remove(q, function(err, updated) {
        if (err) {
          log.error('Failed to remove draft', {
            userId: user._id.toString(),
            profileId: profile._id.toString(),
            draftId: draftId,
            error: err});
          res.status(500).json({
            error: {
              message: 'Failed to remove draft'
            }
          });
        } else {
          if (dbUpdatedCount(updated)) {
            res.json({ removed: true });
          } else {
            res.status(403).json({ error: { message: 'Permission denied' } });
          }
        }
      });
    });
  });

  ///////////////////////////////////////////////////////////////

  // function postsPublishResult(req, res, user, rsp) {
  //   var data = rsp && rsp.data,
  //       reply = data && data.reply,
  //       postId = data && data.postId,
  //       postError = data && data.error,
  //       success = rsp && rsp.success,
  //       newPostId = reply && reply.id,
  //       newPostUrl = reply && reply.url,
  //       isAlreadyProcessedError = postError && postError.error && postError.error.message && postError.error.message.indexOf('already processed') > -1 ? true : false;

  //   log.debug('Received extension publish posts reply',{
  //     success: success,
  //     newPostId: newPostId,
  //     newPostUrl: newPostUrl,
  //     reply: JSON.stringify(reply),
  //     rsp: JSON.stringify(rsp)
  //   });

  //   if (!rsp || !postId) {
  //     log.error('Extension reply not found or empty', {
  //       rsp: rsp,
  //       postId: postId});
  //     return res.status(500).json({error:{message: 'Unknown post id'}}).end();
  //   }

  //   Post.findById(postId, function(err, post) {
  //     if (err) {
  //       log.error('Failed to find post to acknowledge from extension', {
  //         postId: postId,
  //         error: err});
  //       return res.status(500).json({error:{message: 'Post '+postId+' not found'}}).end();
  //     }

  //     if (!post) {
  //       log.warn('Post to acknowledge from extension not found', {
  //         postId: postId});
  //       return res.status(200).json({}).end();
  //     }

  //     var isRecoverable = !isAlreadyProcessedError,
  //         isDisablingAccount = false,
  //         blockPublishingUntil = null,
  //         isCompleted = success && newPostId && newPostUrl ? true : false,
  //         accountType = Types.codeToNetworkAndAccount(post.accountCode),
  //         accountTypeName = accountType.network.name+' '+accountType.account.name;

  //     log.info(accountTypeName+' post processed', {
  //       postId: post._id.toString(),
  //       profileId: post.pid && post.pid.toString(),
  //       accountId: post.aid && post.aid.toString(),
  //       rsp: rsp,
  //       blockPublishingUntil: blockPublishingUntil && blockPublishingUntil.format(),
  //       isAlreadyProcessedError: isAlreadyProcessedError,
  //       isDisablingAccount: isDisablingAccount,
  //       isRecoverable: isRecoverable,
  //       isCompleted: isCompleted,
  //       error: postError});

  //     if (isCompleted) {
  //       post.published(newPostId, newPostUrl, function() {
  //         return res.status(200).json({}).end();
  //       });
  //     } else {
  //       err = postError;
  //       var failure = (err && {
  //             message: err.error && err.error.message || err.message || null,
  //             error: err
  //           }) || 'Unspecified '+(isRecoverable?'':'un')+'recoverable error',
  //           isFailed = (err && err.isFatal) || !isRecoverable ? true : false,
  //           opNow = isFailed ? null : blockPublishingUntil,
  //           op = isFailed ? post.failed : post.retry;

  //       op.bind(post)(failure, function() {
  //         return res.status(200).json({}).end();
  //       }.bind(this), opNow);
  //     }
  //   });

  //   // {
  //   //   "time":1355,
  //   //   "success":true,
  //   //   "type":"reply:extension:publish:posts",
  //   //   "data":{
  //   //     "postId":"553559703e17abab40cf2205",
  //   //     "reply":{
  //   //       "id":"z13wsl2w1si0uvxhy04cg5ugzqmtelehqew",
  //   //       "text":"test",
  //   //       "html":"",
  //   //       "url":"https://plus.google.com/106808796125435447680/posts/Yw8fkDsiZKW"
  //   //     },
  //   //     "error":null
  //   //   }
  //   // }
  // }

  // function postsPublish(req, res, user, body) {
  //   var tasks = [],
  //       networks = body && body.network,
  //       fetchCount = body && body.fetchCount !== undefined && body.fetchCount !== null ? body.fetchCount : -1,
  //       rsp = {
  //         posts: []
  //       };

  //   if (!networks || !user) {
  //     return res.json(rsp);
  //   }

  //   if (fetchCount === 0) {
  //     tasks.push(function(cb) {

  //       var accountsId = [],
  //           userId = user._id.toString(),
  //           profilesId = _.chain(user.profiles).values().flatten().map(function(p) {
  //             return p.toString();
  //           }).uniq().value();

  //       async.eachLimit(profilesId, 4, function(profileId, cb2) {
  //         auth.rest.everyProfileTeamMember(user, profileId, function(user, profile) {
  //           profile.accounts.forEach(function(account) {
  //             if (_.contains(profile.usersWhoCanPublishToAccount(account), userId)) {
  //               accountsId.push(account._id.toString());
  //             }
  //           });
  //           cb2();
  //         }, function() {
  //           cb2();
  //         }, '_id members accounts._id accounts.members accounts.network accounts.account');
  //       }, function() {

  //         log.info('Rescheduling posts on first extension fetch', {
  //           accountsId: accountsId
  //         });

  //         async.eachLimit(accountsId, 4, postScheduler.rescheduleAll.bind(postScheduler), cb);
  //       });
  //     });
  //   }

  //   tasks.push(function(cb) {

  //     Post.acquirePostsByNetworkAndUidAndCodes(user, networks, Types.publishableOnlyByExtension, config.get('post:maxPostsPerAccountPerFetch'), function(err, posts) {
  //       // odstranit z posts pro extensionu nepotrebne udaje
  //       if (posts && posts.length) {

  //         log.debug('Fetched posts for extension', {
  //           userId: user._id.toString(),
  //           networks: networks,
  //           postIds: _.map(posts, function(p) { return p._id.toString(); })
  //         });

  //         var delayAccountsId = {};

  //         posts.forEach(function(post) {
  //           delete post._v;
  //           delete post.editable;
  //           delete post.failures;

  //           var att = post.attachments;

  //           if (att && att.photo && att.photo.gcs) {
  //             att.photo.url = att.photo.gcs;
  //             delete att.photo.gcs;
  //           }

  //           if (att && att.link && att.link.photo && att.link.photo.gcs) {
  //             att.link.photo.url = att.link.photo.gcs;
  //             delete att.link.photo.gcs;
  //           }

  //           if (post.accountCode === Types.createCode(Types.network.google.code, Types.account.circle.code) ||
  //               post.accountCode === Types.createCode(Types.network.google.code, Types.account.profile.code) ||
  //               post.accountCode === Types.createCode(Types.network.google.code, Types.account.community.code) ||
  //               post.accountCode === Types.createCode(Types.network.google.code, Types.account.collection.code)) {

  //             if (post.appendNoShare && post.parentAid) {
  //               delayAccountsId[post.parentAid.toString()] = true;
  //             }

  //             post.html = utils.deformatGoogleHtml(
  //                           utils.replaceAutocompletedInputWithValue(
  //                             utils.replaceAutocompletedInputWithUid(post.html, '+')));
  //           }
  //         });

  //         if (_.size(delayAccountsId)) {

  //           var delayBySeconds = config.get('post:delayNextFetchSeconds'),
  //               newNextFetch = moment.utc().add(delayBySeconds, 'seconds').toDate();

  //           return async.eachLimit(_.keys(delayAccountsId), 4, function(delayAccountId, cb2) {

  //             log.info('Delaying next fetch for account '+delayAccountId+' by '+delayBySeconds+' second(s)');

  //             FetchAccount.update({
  //               _id: new ObjectId(delayAccountId),
  //               nextFetch: {$lt: newNextFetch, $ne: null}
  //             }, {
  //               $set: {nextFetch: newNextFetch, fetchUpdatedAt: moment.utc().toDate() }
  //             }, function(err, updated) {
  //               if (err) {
  //                 log.error('Failed to delay next fetch for account '+delayAccountId+' by '+delayBySeconds+' second(s)', {
  //                   accountId: delayAccountId,
  //                   updated: updated && updated.result,
  //                   error: err
  //                 });
  //               }
  //               cb2();
  //             });
  //           }, function() {
  //             rsp.posts = posts || [];
  //             cb();
  //           });
  //         }
  //       }

  //       rsp.posts = posts || [];
  //       cb();
  //     });
  //   });

  //   async.series(tasks, function() {
  //     res.json(rsp);
  //   });
  // }

  // function lockActivity(req, res, user) {

  //   var userId = user && user._id.toString(),
  //       actorId = req.params.actorId,
  //       activityId = req.params.activityId;

  //   if (!userId || !actorId || !activityId) {
  //     return res.json({});
  //   }

  //   var query = {
  //     _id: {$in: _.chain(user.profiles).values().flatten().value()},
  //     'accounts.uid': actorId
  //   };

  //   Profile.findOne(query, '_id members accounts._id accounts.uid accounts.members accounts.network accounts.account', function(err, profile) {
  //     if (err) {
  //       log.error('Failed to find user profile with account uid '+actorId+' to lock activity '+activityId, {
  //         actorId: actorId,
  //         activityId: activityId,
  //         error: err
  //       });
  //     } else {
  //       var account = profile && profile.accounts && _.findWhere(profile.accounts, {network: Types.network.google.code, uid: actorId});
  //       if (account && _.contains(profile.usersWhoCanPublishToAccount(account), userId)) {
  //         new ActivityLock({
  //           id: activityId,
  //           pid: profile._id
  //         }).save(function(err, al) {
  //           if (err) {
  //             log.error('Failed to save new activity '+activityId+' lock', {
  //               actorId: actorId,
  //               activityId: activityId,
  //               error: err
  //             });
  //           } else {
  //             log.info('Activity '+activityId+' successfully locked', {
  //               lockId: al._id.toString(),
  //               actorId: actorId,
  //               activityId: activityId
  //             });
  //           }
  //         });
  //       } else {
  //         log.warn('User '+userId+' is not allowed to create activities lock for account '+(account && account._id.toString() || '(not found)'));
  //       }
  //     }
  //     res.json({});
  //   });
  // }

  // function queryBody(req) {
  //   var body = req && req.query && req.query.body;
  //   try {
  //     return body && JSON.parse(body) || {};
  //   } catch(e) {
  //     log.error('Failed to parse query body', {
  //       body: body,
  //       error: e
  //     });
  //     return {};
  //   }
  // }

  function extensionPing(req, res) {
    const rsp = { pong: true };
    if (req.user) {
      const uid = req.user._id.toString();
      rsp.user = { _id: uid, email: req.user.email };
      rsp.token = req.encryptToken({ uid }, config.get('token:expiresInSeconds') * 1000);
    } else
    if (req.session) {
      req.session.destroy();
    }
    res.json(rsp);
  }

  router.get('/1/extension/ping', tools.tokenOptional, extensionPing);

  // router.post('/1/extension/ping', tools.tokenOptional, function(req, res) {
  //   extensionPing(req, res, req.user, req.body);
  // });

  // router.get('/1/extension/activity/lock/:actorId/:activityId', tools.tokenOptional, function(req, res) {
  //   lockActivity(req, res, req.user);
  // });

  // router.get('/1/extension/posts/publish/result', tools.tokenRequired, function(req, res) {
  //   postsPublishResult(req, res, req.user, queryBody(req));
  // });

  // router.post('/1/extension/posts/publish/result', tools.tokenRequired, function(req, res) {
  //   postsPublishResult(req, res, req.user, req.body);
  // });

  // router.get('/1/extension/posts/publish', tools.tokenRequired, function(req, res) {
  //   postsPublish(req, res, req.user, queryBody(req));
  // });

  // router.post('/1/extension/posts/publish', tools.tokenRequired, function(req, res) {
  //   postsPublish(req, res, req.user, req.body);
  // });
};
