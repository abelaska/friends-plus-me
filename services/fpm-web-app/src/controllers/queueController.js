/* jshint node: true */

const log = require('@fpm/logging').default;
const { States } = require('@fpm/constants');
const { Post, Queue } = require('@fpm/db');
const moment = require('moment');
const _ = require('underscore');
const tools = require('../lib/tools');
const auth = require('../lib/auth');

module.exports = ({ router, postScheduler, queueManager }) => {
  function securePost(req, res, next) {
    const postId = req.params.postId;

    Post.findOne({ _id: postId }, (err, post) => {
      if (err) {
        log.error('Failed to find post', {
          postId,
          error: err
        });
        res.status(404).json({
          success: false,
          error: {
            message: 'Failed to find post.'
          }
        });
      } else if (post) {
        auth.rest.onlyAccountManager(
          res,
          req.user,
          post.aid.toString(),
          (user, profile, account) => {
            req.profile = profile;
            req.account = account;
            req.post = post;
            next();
          },
          '_id members accounts._id accounts.members accounts.network accounts.account'
        );
      } else {
        res.status(404).json({
          success: false,
          error: {
            message: 'Post not found.'
          }
        });
      }
    });
  }

  function ignoreLockedPost(req, res, next) {
    // var now = moment.utc(),
    //     lockedUntil = req.post && req.post.lockedUntil && moment.utc(req.post.lockedUntil) || null;
    // if (lockedUntil && now.isBefore(lockedUntil)) {
    //   return res.status(403).json({
    //     success: false,
    //     code: 'POST_LOCKED',
    //     until: lockedUntil.format(),
    //     error: {
    //       message: 'Post is locked until <b>'+lockedUntil.format('llll')+'</b>. Please, try again later.'
    //     }
    //   });
    // }
    next();
  }

  function reschedulePost(req, res, publishAt) {
    const { post, user, profile, account } = req;

    function save() {
      post.save(err => {
        if (err) {
          log.error(`Failed to save post re-scheduled to ${publishAt.format()}`, {
            postId: post._id.toString(),
            profileId: profile._id.toString(),
            accountId: account._id.toString(),
            userId: user._id.toString(),
            message: err.toString(),
            stack: err.stack
          });
          return res.json({
            success: false,
            error: {
              message: `Failed to save post re-scheduled to ${publishAt.format('llll')}.`
            }
          });
        }
        return res.json({ success: true, publishAt: publishAt.format() });
      });
    }

    post.tries = 0;
    post.publishAt = publishAt.toDate();

    if (post.ng) {
      post.blockedAt = new Date();
      post.lockedUntil = moment.utc().add(10, 'years').toDate();
      post.state = States.post.scheduled.code;
      return queueManager
        .reschedulePost({ post })
        .then(save)
        .catch(error => {
          log.error(`Failed to re-schedule ng post to ${publishAt.format()}`, {
            postId: post._id.toString(),
            profileId: profile._id.toString(),
            accountId: account._id.toString(),
            userId: user._id.toString(),
            message: error.toString(),
            stack: error.stack
          });
          res.json({
            success: false,
            error: {
              message: `Failed to re-schedule post to ${publishAt.format('llll')}.`
            }
          });
        });
    } else {
      post.blockedAt = null;
    }

    post.state = States.post.scheduledByUser.code;
    post.lockedUntil =
      post.lockedUntil && moment.utc(post.lockedUntil).isAfter(moment.utc())
        ? moment
            .utc()
            .add(1, 'minutes')
            .toDate()
        : moment.utc().toDate();
    return save();
  }

  // account queue size
  router.get('/1/account/:accountId/queue/empty', tools.tokenRequired, (req, res) => {
    auth.rest.onlyAccountManager(
      res,
      req.user,
      req.params.accountId,
      (user, profile, account) => {
        if (account.ng) {
          return queueManager
            .emptyQueue({ queueId: account._id })
            .then(() => res.json({ success: true }))
            .catch(error => {
              log.error('Failed to empty queue', {
                queueId: account._id.toString(),
                message: error.toString(),
                stack: error.stack
              });
              res.json({
                success: false,
                error: {
                  message: 'Failed to empty queue'
                }
              });
            });
        }

        Post.remove(
          {
            aid: account._id
          },
          err => {
            if (err) {
              log.error('Failed to empty account queue', {
                accountId: account._id.toString(),
                message: err.toString(),
                stack: err.stack
              });
              return res.json({
                success: false,
                error: {
                  message: 'Failed to empty account queue.'
                }
              });
            }

            return postScheduler.rescheduleAll(account._id, err2 => {
              if (err2) {
                log.error('Failed to reset account queue', {
                  profileId: profile._id.toString(),
                  accountId: req.account._id.toString(),
                  userId: req.user._id.toString(),
                  message: err2.toString(),
                  stack: err2.stack
                });
                return res.json({
                  success: false,
                  error: {
                    message: 'Failed to reset queue.'
                  }
                });
              }
              return res.json({ success: true });
            });
          }
        );
      },
      '_id members accounts._id accounts.members accounts.ng'
    );
  });

  // account queue size
  router.get('/1/account/:accountId/queue/stat', tools.tokenRequired, (req, res) => {
    const accountId = req.params.accountId;
    auth.rest.onlyAccountManager(
      res,
      req.user,
      accountId,
      (user, profile, account) => {
        if (account.ng) {
          return Queue.findOne({ _id: accountId }, { 'posts.count': 1 })
            .lean()
            .exec((error, q) => {
              if (error) {
                log.error('Failed to determine account queue size', {
                  accountId,
                  message: error.toString(),
                  stack: error.stack
                });
                return res.json({
                  success: false,
                  error: {
                    message: 'Failed to get queue stats.'
                  }
                });
              }
              res.json({
                success: true,
                size: (q && q.posts && q.posts.count) || 0
              });
            });
        }

        return Post.count(
          {
            aid: accountId,
            state: { $lt: States.post.draft.code }
          },
          (error, count) => {
            if (error || count === undefined || count === null) {
              log.error('Failed to determine account queue size', {
                accountId,
                message: error.toString(),
                stack: error.stack
              });
              return res.json({
                success: false,
                error: {
                  message: 'Failed to get queue stats.'
                }
              });
            }
            return res.json({
              success: true,
              size: count
            });
          }
        );
      },
      '_id members accounts._id accounts.members accounts.ng'
    );
  });

  // share now
  router.get('/1/queue/:postId/now', tools.tokenRequired, securePost, ignoreLockedPost, (req, res) => {
    reschedulePost(req, res, moment.utc());
  });

  // reschedule post
  router.get('/1/queue/:postId/reschedule/:unixUTC', tools.tokenRequired, securePost, ignoreLockedPost, (req, res) => {
    const dt = req.params.unixUTC ? moment.unix(parseInt(req.params.unixUTC, 10)) : moment.utc();
    reschedulePost(req, res, dt);
  });

  // delete post
  router.get('/1/queue/:postId/delete', tools.tokenRequired, securePost, (req, res) => {
    const { post, profile, account, user } = req;
    const profileId = profile._id.toString();
    const accountId = account._id.toString();
    const userId = user._id.toString();
    const postId = post._id.toString();

    post.remove(err => {
      if (err) {
        log.error('Failed to remove post', { postId, profileId, accountId, userId, message: err.toString(), stack: err.stack });
        return res.json({ success: false, error: { message: 'Failed to remove post.' } });
      }

      if (post.ng) {
        return queueManager.removePost({ post })
          .then(() => res.json({ success: true }))
          .catch(error => {
            log.error('Failed to reschedule after post remove', { postId, profileId, accountId, userId, message: error.toString(), stack: error.stack });
            return res.json({ success: false, error: { message: 'Failed to reschedule posts after post removal.' } });
          });
      }

      if (post.state === States.post.scheduledByScheduler.code) {
        return postScheduler.rescheduleAll(account._id, (err2, _account, updatedPosts) => {
          if (err2) {
            log.error('Failed to reschedule posts after post remove', { postId, profileId, accountId, userId, message: err2.toString(), stack: err2.stack });
            return res.json({ success: false, error: { message: 'Failed to reschedule posts after post removal.' } });
          }

          const rescheduledPosts = _.reduce(
            updatedPosts,
            (memo, updatedPost) => {
              memo[updatedPost._id.toString()] = moment.utc(updatedPost.publishAt).format();
              return memo;
            },
            {}
          );

          return res.json({ success: true, rescheduledPosts });
        });
      }

      return res.json({ success: true });
    });
  });

  // move post
  router.get('/1/queue/:postId/move/:index', tools.tokenRequired, securePost, ignoreLockedPost, (req, res) => {
    if (req.post.ng) {
      return res.json({ success: false, error: { message: 'Unsupported operation' } });
    }

    const index = Math.max(req.params.index || 0, 0);

    postScheduler.movePost(req.post, index, (err, post, account, updatedPosts) => {
      if (err) {
        log.error(`Failed to move the post to index ${index}`, {
          postId: req.post._id.toString(),
          profileId: req.profile._id.toString(),
          accountId: req.account._id.toString(),
          userId: req.user._id.toString(),
          error: err
        });

        return res.json({
          success: false,
          error: {
            message: `Failed to move the post to index ${index}.`
          }
        });
      }

      const rescheduledPosts = _.reduce(
        updatedPosts,
        (memo, p) => {
          memo[p._id.toString()] = moment.utc(p.publishAt).format();
          return memo;
        },
        {}
      );

      res.json({
        success: true,
        rescheduledPosts
      });
    });
  });
};
