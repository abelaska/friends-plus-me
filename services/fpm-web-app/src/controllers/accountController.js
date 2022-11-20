/* jshint node: true */
/* jshint -W064, -W106 */
const log = require('@fpm/logging').default;
const { Types, States } = require('@fpm/constants');
const { dbUpdatedCount, dbNotUpdated, ObjectId, FetchAccount, ActivityLock, Post, Profile } = require('@fpm/db');
const moment = require('moment');
const S = require('string');
const async = require('async');
const _ = require('underscore');
const tools = require('../lib/tools');
const auth = require('../lib/auth');
const facebook = require('../lib/facebook');
const ShortenerBitly = require('../lib/ShortenerBitly');
const ShortenerGoogl = require('../lib/ShortenerGoogl');

const shortenerBitly = new ShortenerBitly();
const shortenerGoogl = new ShortenerGoogl();

module.exports = ({ router, postScheduler, accountManager, queueManager }) => {
  function secureAccount(account) {
    if (account) {
      account.token = undefined;
      account.secret = undefined;
      // account.analytics = {};

      if (account.tagline) {
        account.tagline = S(account.tagline).escapeHTML().s;
      }
    }
    return account;
  }

  function secureAccounts(accounts) {
    if (accounts && accounts.length > 0) {
      accounts.forEach(secureAccount);
    }
    return accounts;
  }

  function shortenUrl(url, account, callback) {
    var shortenerType = account.shortener && account.shortener.type || 'none',
        useFpmeLink = shortenerType === 'fpmelink',
        useFpmeGoogl = shortenerType === 'fpmegoogl',
        useBitly = shortenerType === 'bitly' && account.shortener.bitly.token,
        useGoogl = shortenerType === 'googl' && account.shortener.googl.secret && account.shortener.googl.id;
    if (useBitly) {
      shortenerBitly.shortenUrlExtended(url, account.shortener.bitly, null, null, function(shortenedUrl/*, opStat*/) {

        shortenedUrl = shortenedUrl || url;

        callback(null, shortenedUrl, shortenerType);

      });
    } else
    if (useGoogl) {
      shortenerGoogl.shortenUrlExtended(url, account.shortener.googl, null, null, function(err, shortenedUrl) {

        shortenedUrl = shortenedUrl || url;

        // TODO disablovani shorteneru v pripade ze doslo k invalidaci refresh tokenu

        callback(null, shortenedUrl, shortenerType);

      });
    } else
    if (useFpmeLink || useFpmeGoogl) {
      shortenerGoogl.shortenUrlWithKey(url, function(err, shortenedUrl) {

        if (shortenedUrl) {
          shortenedUrl = useFpmeLink && shortenedUrl.replace(/https?:\/\/goo.gl/, 'http://fpme.link') || shortenedUrl;
        } else {
          shortenedUrl = url;
        }

        // TODO disablovani shorteneru v pripade ze doslo k invalidaci refresh tokenu

        callback(null, shortenedUrl, shortenerType);

      });
    } else {
      callback(null, url, shortenerType);
    }
  }

  router.post('/1/account/:accountId/link/shorten', tools.tokenRequired, auth.rest.middleware.onlyAccountManager, function(req, res) {
    var account = req.account,
        longUrl = req.body.longUrl || '',
        url = longUrl,
        rsp = {
          longUrl: longUrl,
          url: url
        };

    shortenUrl(longUrl, account, function(err, shortenedUrl) {
      rsp.url = shortenedUrl || url;
      res.json(rsp);
    });
  });

  router.put('/1/account/:accountId/members', tools.tokenRequired, function(req, res) {
    var accountId = req.params.accountId,
        role = req.body.role,
        memberId = req.body.memberId,
        user = req.user;

    if (!memberId || !role) {
      res.status(400).send({error: {message: 'Team member or role not defined'}});
      return;
    }

    auth.rest.onlyAccountManager(res, user, accountId, function(user, profile, account) {

      if (!user.canManageProfile(profile)) {
        res.status(403).send({error: {message: 'Only team manager can assign queue to a team member'}});
        return;
      }

      Profile.update({'accounts._id': account._id}, {
        $addToSet: {'accounts.$.members.manager': ObjectId(memberId)}},
      function(err, updated) {
        if (err) {
          var msg = 'Failed to add queue manager '+memberId+' to queue '+accountId+' members';
          log.error(msg, {error: err});
          res.status(500).send({error: {message: msg}});
        } else
        if (dbUpdatedCount(updated)) {
          account.members = account.members || {};
          account.members.manager = account.members.manager || [];
          account.members.manager.push(memberId);

          res.status(200).send({
            account: account
          });
        } else {
          res.status(404).send({error: {code: 'NOT_FOUND', message: 'Queue '+accountId+' to add manager member not found.'}});
        }
      });
    }, '_id use members accounts');
  });

  router.delete('/1/account/:accountId/members/:memberId', tools.tokenRequired, function(req, res) {
    var accountId = req.params.accountId,
        memberId = req.params.memberId,
        user = req.user;

    if (!memberId) {
      res.status(400).send({error: {message: 'Team member not defined'}});
      return;
    }

    auth.rest.onlyAccountManager(res, user, accountId, function(user, profile, account) {

      if (!user.canManageProfile(profile)) {
        res.status(403).send({error: {message: 'Only team manager can remove team member from the list of queue managers'}});
        return;
      }

      Profile.collection.update({'accounts._id': account._id}, {
        $pull: {'accounts.$.members.manager': new ObjectId(memberId)}},
      function(err, updated) {
        if (err) {
          var msg = 'Failed to remove queue manager '+memberId+' from queue '+accountId+' members';
          log.error(msg, {error: err});
          res.status(500).send({error: {message: msg}});
        } else
        if (dbUpdatedCount(updated)) {
          account.members = account.members || {};
          account.members.manager = account.members.manager || [];
          account.members.manager = _.filter(account.members.manager, function(userId) {
            return memberId === userId.toString() ? false : true;
          });

          Post.update({
            aid: account._id,
            state: {$lt: States.post.published.code}
          }, {
            $pull: {'extension.publishers': new ObjectId(memberId)}
          }, function(err, updated) {
            if (err) {
              log.error('Failed to remove publisher from account posts', {
                accountId: account._id.toString(),
                memberId: memberId,
                updated: updated && updated.result,
                error: err});
            }
          });

          res.status(200).send({
            account: account
          });
        } else {
          res.status(404).send({error: {code: 'NOT_FOUND', message: 'Manager member '+memberId+' to remove from queue '+accountId+' not found.'}});
        }
      });
    }, '_id use members accounts');
  });

  router.delete('/1/account/:id', tools.tokenRequired, (req, res) => {
    const id = req.params.id;
    auth.rest.onlyAccountManager(res, req.user, id, (user, profile, account) => {
      accountManager.removeAccount(profile, account, user, (err, updatedProfile) => {
        if (err) {
          return res.status(500).send({ error: { message: `Failed to remove queue ${account._id.toString()} from team ${profile._id.toString()}` } });
        }

        return res.status(200).send({
          user: {
            accounts: secureAccounts(updatedProfile.accounts),
            routes: updatedProfile.routes,
            profiles: updatedProfile.profiles
          }
        });
      });
    }, '_id use members accounts profiles routes hashtags plan subscription');
  });

  router.put('/1/account/:id/:op', tools.tokenRequired, (req, res) => {
    const id = req.params.id;
    const op = req.params.op;
    const body = req.body;
    let save = false;
    let includeRoutes = false;
    let reschedule = false;
    let enableAccount = false;
    let disableAccount = false;

    function respond(user, profile, account) {
      res.status(200).send({
        account: secureAccount(account),
        routes: includeRoutes ? profile.routes : undefined
      });
    }

    function rescheduleAccount(user, profile, account) {
      if (!reschedule) {
        return respond(user, profile, account);
      }

      Post.unblockAll(account);

      let tm = new Date();
      postScheduler.rescheduleAll(account._id, (err, acc, updatedPosts) => {
        tm = new Date() - tm;
        if (err) {
          log.error('Failed to reschedule posts after account update', {
            time: tm,
            userId: user._id.toString(),
            profileId: profile._id.toString(),
            accountId: account._id.toString(),
            error: err });
        } else {
          log.info('Reschedule posts after account update', {
            time: tm,
            userId: user._id.toString(),
            profileId: profile._id.toString(),
            accountId: account._id.toString(),
            updatedPosts: (updatedPosts && updatedPosts.length) || 0
          });
        }
        respond(user, profile, account);
      });
    }

    auth.rest.onlyAccountManager(res, req.user, id, (user, profile, account) => {
      let i;
      let route;
      const accountId = account._id.toString();

      switch (op) {
        case 'enable':
          if (profile.isAccountDisabled(account)) {
            if (account.ng) {
              return queueManager.enableQueue({ queueId: account._id }).then(() => {
                account.state = States.account.enabled.code;
                respond(user, profile, account);
              }).catch(error => {
                log.error('Failed to enable queue', {
                  queueId: account._id.toString(),
                  message: error.toString(),
                  stack: error.stack
                });
                res.status(500).send({ error: { message: 'Failed to enable queue' } });
              });
            }
            save = true;
            enableAccount = true;
            reschedule = true;
            profile.enableAccount(account);
          }
          break;
        case 'disable':
          if (profile.isAccountEnabled(account)) {
            if (account.ng) {
              return queueManager.pauseQueue({ queueId: account._id, inactiveReason: 'Manually paused by user' }).then(() => {
                account.state = States.account.disabled.code;
                respond(user, profile, account);
              }).catch(error => {
                log.error('Failed to pause queue', {
                  queueId: account._id.toString(),
                  message: error.toString(),
                  stack: error.stack
                });
                res.status(500).send({ error: { message: 'Failed to pause queue' } });
              });
            }
            save = true;
            disableAccount = true;
            profile.disableAccount(account);
          }
          break;
        case 'preset':
          save = true;

          account.preset = body.preset;
          account.appendLink = profile.accountPresetIs(account, 'google-growth','google-growth-controlled');

          // if (account.network === Types.network.google.code) {
          //   route = profile.findProfileAccountRoutes(account);
          //   if (route) {
          //     includeRoutes = true;
          //
          //     profile.markModified('routes');
          //
          //     if (profile.accountPresetIs(account, 'google-growth','mirroring')) {
          //       // add to default destination group
          //       route.ddg = route.allowed;
          //     } else {
          //       route.ddg = [];
          //     }
          //   }
          // }
          break;
        case 'source':
          includeRoutes = true;

          const sourceAccount = profile.findAccountById(body.src);

          route = profile.findProfileAccountRoutes(sourceAccount || { _id: '' });

          if (sourceAccount && sourceAccount._id.toString() === accountId) {
            res.status(400).send({ error: { message: `Queue ${body.src} cannot be source and destination of itself` } });
          } else
          if (route) {
            // remove from already added control hashtag groups
            if (route.chdg && route.chdg.length) {
              for (i = 0; i < route.chdg.length; i++) {
                route.chdg[i].dst = _.without(route.chdg[i].dst, accountId);
              }
            }

            // remove from default destination group
            route.ddg = _.without(route.ddg, accountId);

            profile.markModified('routes');
            save = true;

            if (body.allow) {
              if (!_.contains(route.allowed, accountId)) {
                route.allowed.push(accountId);
              }

              // add to control hashtag groups
              const assignedToHts = _.chain(profile.hashtags).pairs().filter(pair => pair[1].dst && _.contains(pair[1].dst, accountId)).map(pair => pair[0]).value();

              let pushed;

              for (let j = 0; j < assignedToHts.length; j++) {
                pushed = false;

                if (route.chdg && route.chdg.length) {
                  for (i = 0; i < route.chdg.length; i++) {
                    if (_.contains(route.chdg[i].hashtag, assignedToHts[j])) {
                      if (!_.contains(route.chdg[i].dst, accountId)) {
                        route.chdg[i].dst.push(accountId);
                      }
                      pushed = true;
                    }
                  }
                } else
                if (!route.chdg) {
                  route.chdg = [];
                }
                if (!pushed) {
                  route.chdg.push({
                    hashtag: [assignedToHts[j]],
                    noshare: false,
                    dst: [accountId]
                  });
                }
              }

              if (profile.accountPresetIs(sourceAccount, 'google-growth', 'mirroring')) {
                // add to default destination group
                route.ddg.push(accountId);
              }
            } else {
              route.allowed = _.without(route.allowed, accountId);
            }
          } else {
            return res.status(400).send({ error: { message: `Route or source queue ${body.src} not found` } });
          }
          break;
        case 'scheduling':
          save = true;

          if (!body.schedules) {
            body.schedules = [];
          }

          // zjistit jestli je nutne preplanovani casu repostu cekajicich na odeslani
          reschedule = account.scheduling.tz !== body.tz ||
                       account.scheduling.schedules.length !== body.schedules.length;

          if (!reschedule && body.schedules.length) {
            let aList;
            let bList;
            for (i = 0; i < body.schedules.length; i++) {
              aList = account.scheduling.schedules[i];
              bList = body.schedules[i];
              if (aList.length !== bList.length || _.difference(aList, bList).length) {
                reschedule = true;
                break;
              }
            }
          }

          account.scheduling.tz = body.tz || user.tz || 'UTC';
          account.scheduling.stype = body.stype || 'd';
          account.scheduling.delay = body.delay === undefined || body.delay === null || body.delay < 0 ? 60 : body.delay;
          account.scheduling.schedules = body.schedules || [];

          if (profile.plan.name === 'FREE' && account.scheduling.delay < 60) {
            account.scheduling.delay = 60;
          }

          postScheduler._scheduleReset(account, false);
          break;
        case 'shortener':
          switch (body.type) {
          // case 'fplusme':
          // case 'fpmelink':
          // case 'fpmegoogl':
          case 'none':
            save = true;
            account.shortener.type = body.type;
            break;
          case 'bitly':
            if (profile.use.bitly) {
              save = true;
              account.shortener.type = body.type;
              if (body.username && body.apiKey) {
                account.shortener.bitly = {
                  username: body.username,
                  apiKey: body.apiKey
                };
              }
            }
            break;
          default:
            return res.status(400).send({ error: { message: 'Unknown link shortener' } });
          }
          break;
        case 'setup':
          /* jshint -W041 */
          if (body.twForceLink !== undefined && body.twForceLink !== null) {
            save = true;
            account.twForceLink = body.twForceLink;
          }
          if (body.appendLink !== undefined && body.appendLink !== null) {
            save = true;
            account.appendLink = body.appendLink;
          }
          if (body.appendHashtag !== undefined && body.appendHashtag !== null) {
            save = true;
            account.appendHashtag = body.appendHashtag;
          }
          if (body.noBackLink !== undefined && body.noBackLink !== null) {
            save = true;
            account.noBackLink = body.noBackLink;
          }
          if (body.photoAsLink !== undefined && body.photoAsLink !== null) {
            save = true;
            account.photoAsLink = body.photoAsLink;
          }
          if (body.privacy !== undefined && body.privacy !== null) {
            save = true;
            account.privacy = body.privacy;
          }
          if (body.repCommunity !== undefined && body.repCommunity !== null) {
            save = true;
            account.repCommunity = body.repCommunity;
          }
          if (body.limitMsgLen !== undefined && body.limitMsgLen !== null) {
            save = true;
            account.limitMsgLen = body.limitMsgLen;
          }
          break;
        default:
          return res.status(400).send({ error: { message: 'Unknown operation' } });
      }

      if (!save) {
        return res.status(200).send({ account: secureAccount(account) });
      }

      profile.markModified('accounts');
      profile.save(function(err, savedProfile) {
        if (err || !savedProfile) {
          log.error('Failed to update profile', {
            userId: user._id.toString(),
            profileId: profile._id.toString(),
            accountId: id,
            op: op,
            data: req.body ? JSON.stringify(req.body) : req.body,
            error: err });
          res.status(500).send({error: {message: 'Failed to update profile '+profile._id.toString()}});
        } else {

          log.debug('Successfully updated profile', {
            userId: user._id.toString(),
            profileId: profile._id.toString(),
            accountId: id,
            op: op});

          if (disableAccount) {
            Post.blockAll(account);
          }

          if ((enableAccount || disableAccount) && account && account.network === Types.network.google.code) {
            FetchAccount[enableAccount ? 'enable' : 'disable'](account, function(err) {
              if (err) {
                log.error('Failed to en/disable FetchAccount', {
                  accountId: account._id.toString(),
                  enableAccount: enableAccount,
                  disableAccount: disableAccount,
                  error: err});
              }
              rescheduleAccount(user, profile, account);
            });
          } else {
            rescheduleAccount(user, profile, account);
          }
        }
      });
    });
  });

  function findOp(ops, opName) {
    if (ops) {
      for (var i = 0; i < ops.length; i++) {
        var o = ops[i];
        if (o.name === opName) {
          return o;
        }
      }
    }
    return null;
  }

  function convertActivityToReposts(activity, account) {

    var op, error, dst,
        a = activity,
        aid = account ? account._id.toString() : null,
        result = {
          tm: (a.tm || a.created).valueOf(),
          src: a.src ? a.src.toString() : null,
          _id: a._id.toString(),
          activity: {
            id: a.activity.id,
            url: a.activity.url,
            title: tools.prepareText(a.activity.title)
          },
          dsts: [/*{
            ok: false,
            tried: false,
            url: t.url;
            tm: t.tm.valueOf();
            dst: r.dst.toString(),
            account: r.account,
            network: r.network,
            errors: [{
              tm: op.tm.valueOf(),
              msg: error
            }]
          }*/]
        };

    (a.reposts || []).forEach(function(r) {

      /*jshint -W041*/
      if (account === undefined || account === null || (account && (r.dst.toString() === aid || result.src === aid))) {

        dst = {
          ok: false,
          tried: false,
          id: r.dst.toString(),
          account: r.account,
          network: r.network,
          stat: r.stat,
          errors: []
        };

        if (r.tries && r.tries.length > 0) {

          dst.tried = true;

          r.tries.forEach(function(t) {

            // vysledek repostu je vysledek posledniho pokusu
            dst.ok = t.ok;
            dst.url = t.url;
            dst.tm = (t.tm || moment.utc()).valueOf();

            op = null;

            switch (r.network) {
              case Types.network.facebook.code:
                op = findOp(t.ops, 'FBFeedPost') ||
                     findOp(t.ops, 'FBLinkPost') ||
                     findOp(t.ops, 'FBPhotoPost') ||
                     findOp(t.ops, 'FBGroupPost');
                error = t.ok ? null :
                          (op && op.error && op.error.error ? op.error.error.message : '') ||
                          (op && op.warn ? op.warn.message : '') || '???';
                break;
              case Types.network.twitter.code:
                op = findOp(t.ops, 'TwitterPost');
                if (t.ok) {
                  error = null;
                } else {
                  error = '';

                  var i;

                  if (op && op.error && _.isArray(op.error) && op.error.length > 0) {
                    for (i = 0; i < op.error.length; i++) {
                      if (op.error[i].message) {
                        error += (error ? ' ' : '') + op.error[i].message;
                      }
                    }
                  } else
                  if (op && op.error && op.error.errors && _.isArray(op.error.errors) && op.error.errors.length) {
                    for (i = 0; i < op.error.errors.length; i++) {
                      if (op.error.errors[i].message) {
                        error += (error ? ' ' : '') + op.error.errors[i].message;
                      }
                    }
                  } else
                  if (op && op.error && op.error.message) {
                    error = op.error.message;
                  } else
                  if (op && op.warn && op.warn.message) {
                    error = op.warn.message;
                  }
                  if (!error) {
                    error = '???';
                  }
                }
                break;
              case Types.network.linkedin.code:
                op = findOp(t.ops, 'LinkedinPost');
                error = t.ok ? null :
                          (op && op.error ? op.error.message : '') ||
                          (op && op.warn ? op.warn.message : '') || '???';
                break;
              case Types.network.appnet.code:
                op = findOp(t.ops, 'AppnetPost');
                error = t.ok ? null :
                          (op && op.error ? op.error.message : '') ||
                          (op && op.warn ? op.warn.message : '') || '???';
                break;
              case Types.network.tumblr.code:
                op = findOp(t.ops, 'TumblrPost');
                error = t.ok ? null :
                          (op && op.error ? op.error.message : '') ||
                          (op && op.warn ? op.warn.message : '') || '???';
                break;
              case Types.network.google.code:
                op = findOp(t.ops, 'GooglePost');
                error = t.ok ? null :
                          (op && op.error ? op.error.message : '') ||
                          (op && op.warn ? op.warn.message : '') || '???';
                break;
            }

            if (error && op) {
              dst.errors.unshift({
                tm: op.tm.valueOf(),
                msg: error
              });
            }
          });
        }

        result.dsts.push(dst);
      }
    });

    return result;
  }

  router.get('/1/account/:id/timeline/:direction', tools.tokenRequired, function(req, res) {

    var id = req.params.id,
        direction = req.params.direction,
        user = req.user,
        result = {
          reposts: []
        };

    if (!id || !direction) {
      res.json(result);
      return;
    }

    auth.rest.onlyAccountManager(res, user, id, function(user, profile, account) {
      var tasks = [],
          query = {};

      switch (direction.toLowerCase()) {
        case 'in':
          query.src = account._id.toString();
          break;
        case 'out':
          query.dst = account._id.toString();
          break;
      }

      if (account.network === Types.network.google.code) {
        tasks.push(function(cb) {
          FetchAccount.findById(account._id, 'interval nextFetch prevFetch', function(err, faccount) {
            if (err) {
              log.error('Failed to find FetchAccount record', {
                id: account._id.toString(),
                error: err});
              cb(err);
            } else {
              if (faccount) {
                result.detail = {
                  interval: faccount.interval,
                  nextFetch: faccount.nextFetch ? faccount.nextFetch.valueOf() : null,
                  prevFetch: faccount.nextFetch ? faccount.prevFetch.valueOf() : null
                };
              }
              cb();
            }
          });
        });
      }

      tasks.push(function(cb) {
        ActivityLock.find(query).sort('-tm').limit(20).exec(function(err, activities) {
          if (err) {
            log.error('Failed to fetch reposts for account '+account._id.toString(), {
              error: err});
            cb(err);
          } else {

            var reposts;

            if (activities && activities.length > 0) {
              for (var i = 0; i < activities.length; i++) {
                reposts = convertActivityToReposts(activities[i], account);
                if (reposts) {
                  result.reposts.push(reposts);
                }
              }
            }

            cb();
          }
        });
      }.bind(this));

      async.parallel(tasks, function(err) {
        if (err) {
          res.status(500).json({});
        } else {
          res.json(result);
        }
      }.bind(this));
    }, '_id use members accounts created');
  });

  // router.get('/1/account/:accountId/insights', tools.tokenRequired, function(req, res) {
  //   var accountId = req.params.accountId,
  //       user = req.user;
  //
  //   auth.rest.onlyAccountManager(res, user, accountId, function(user, profile, account) {
  //
  //     async.parallel({
  //       faccount: async.apply(FetchAccount.findOne.bind(FetchAccount), {_id: account._id}, '_id circlecount'),
  //       stat: async.apply(GoogleAccountStat.findOne.bind(GoogleAccountStat), {actorId: account.uid}, 'records')
  //     }, function(err, results) {
  //       if (err) {
  //         var msg = 'Failed to fetch Google account '+account._id.toString()+' insight data from database';
  //         log.error(msg, {error: err});
  //         res.status(500).send({error: {message: msg}});
  //       } else {
  //         // tento kod nepocita s vice zaznamy za jeden den!
  //
  //         var rec, day,
  //             stat = results.stat,
  //             faccount = results.faccount,
  //             cc = faccount ? faccount.circlecount : null,
  //             notOlderThan = moment.utc().subtract(90, 'days'),
  //             result = {
  //               days: [],
  //               lastUpdate: null,
  //               blocked: false
  //             };
  //
  //         if (cc && cc.last) {
  //           result.lastUpdate = moment.utc(cc.last).valueOf();
  //         }
  //
  //         if (cc && !cc.next) {
  //           result.blocked = true;
  //         }
  //
  //         if (stat && stat.records && stat.records.length) {
  //           for (var i = stat.records.length - 1; i >= 0; i--) {
  //             rec = stat.records[i].toObject();
  //             day = moment.utc(rec.updatedAt);
  //             if (day.isBefore(notOlderThan)) {
  //               break;
  //             } else {
  //               rec.ts = day.valueOf();
  //               delete rec.updatedAt;
  //               result.days.unshift(rec);
  //             }
  //           }
  //         }
  //
  //         res.json(result);
  //       }
  //     });
  //   }, '_id use members accounts');
  // });
};
