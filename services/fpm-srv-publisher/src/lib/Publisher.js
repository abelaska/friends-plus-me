/* jshint node: true, esversion: 6 */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { Types, States } = require('@fpm/constants');
const { dbNotUpdated, dbUpdatedCount, Post, FetchAccount, Profile } = require('@fpm/db');
const { accountRequiresReconnect } = require('@fpm/events');
const _ = require('lodash');
const async = require('async');
const uuid = require('uuid');
const Monitor = require('./Monitor');

var Publisher = (module.exports = function Publisher(
  name,
  accountCodes,
  shortenerBitly,
  postScheduler,
  PostConvertorClass
) {
  this.name = name;
  this.id = name.toLowerCase();
  this.accountCodes = accountCodes;
  this.shortenerBitly = shortenerBitly;
  this.postScheduler = postScheduler;
  this.PostConvertor = PostConvertorClass || require('./convertors/PostConvertor' + name);

  this.isFake = config.get('system:fake') || false;

  this.skipLinkShorteningForRegEx = _.map(config.get('publisher:linkshortener:skip') || [], function(regExStr) {
    return new RegExp(regExStr, 'g');
  });

  this.q = async.queue(this._processPost.bind(this), config.get('publisher:workers'));

  Monitor.registerKeys(
    'posts:dequeued',
    'posts:' + this.id + ':dequeued',
    'posts:completed',
    'posts:' + this.id + ':completed',
    'posts:failed',
    'posts:' + this.id + ':failed'
  );

  log.info('Initialized ' + this.name + ' publisher');

  return this;
});

// callback(err, result)
// result: {
//   ok : boolean,
//   disableAccount: boolean,
//   blockPublishingUntil: moment,
//   isRecoverable: boolean,
//   postId: string,
//   postUrl: string,
//   failure: 'error message' || {
//     tm: date,
//     message: string,
//     error: {...}
//   }
// }
Publisher.prototype.publishPost = function(req, post, profile, account, callback) {
  throw new Error('Not implemented');
};

Publisher.prototype.start = function(callback) {
  this._startToDequeuePosts(
    function(err) {
      if (err) {
        log.error('Failed to start ' + this.name + ' publisher', err);
      } else {
        log.info('Started ' + this.name + ' publisher');
      }

      if (callback) {
        callback(err);
      }
    }.bind(this)
  );
};

Publisher.prototype.stop = function(callback) {
  this._stop(
    function(err) {
      log.info('Stopped ' + this.name + ' publisher');

      if (callback) {
        callback(err);
      }
    }.bind(this)
  );
};

Publisher.prototype._stop = function(callback) {
  if (this.timer) {
    clearTimeout(this.timer);
    this.timer = null;
  }

  this.q.pause();

  if (!this.q.idle()) {
    this.q.resume();
    this.q.drain = callback;
  } else {
    if (callback) {
      callback();
    }
  }
};

Publisher.prototype._dequeuePosts = function(callback) {
  this.timer = null;

  // dequeue posts and put them into the queue this.q
  Post.acquirePostsByAccountCodes(
    this.accountCodes,
    config.get('publisher:maxPostsPerRun'),
    function(err, posts) {
      if (err) {
        var ignoreError = err.name === 'VersionError';
        log[ignoreError ? 'warn' : 'error']('Failed to acquire posts to publish', {
          publisher: this.name,
          error: err
        });
      }

      if (posts && posts.length) {
        this.q.push(posts);
      }

      this._startToDequeuePosts();

      if (callback) {
        callback(err, posts);
      }
    }.bind(this)
  );
};

Publisher.prototype._startToDequeuePosts = function(callback) {
  this.timer = setTimeout(this._dequeuePosts.bind(this), config.get('publisher:delay'));
  if (callback) {
    callback();
  }
};

Publisher.prototype._monitor = function(op) {
  Monitor.inc('posts:' + op);
  Monitor.inc('posts:' + this.id + ':' + op);
};

Publisher.prototype._postDequeued = function(post) {
  this._monitor('dequeued');
};

Publisher.prototype._postProcessed = function(post, err, completed) {
  this._monitor(completed && !err ? 'completed' : 'failed');
};

Publisher.prototype._processPost = function(post, callback) {
  this._postDequeued(post);

  this._publishPost(
    post,
    function(err, completed) {
      this._postProcessed(post, err, completed);

      callback(err, completed);
    }.bind(this)
  );
};

Publisher.prototype._isUrlNotShortenable = function(url) {
  if (url && this.skipLinkShorteningForRegEx.length) {
    for (var i = 0; i < this.skipLinkShorteningForRegEx.length; i++) {
      if (url.match(this.skipLinkShorteningForRegEx[i])) {
        return true;
      }
    }
  }
  return false;
};

Publisher.prototype._convertPost = function(post, profile, account, callback) {
  var convertor = new this.PostConvertor(
    post,
    profile,
    account,
    function(url, lsCallback) {
      if (this._isUrlNotShortenable(url)) {
        log.debug('Skipping link shortening for ' + url, {
          postId: post._id.toString()
        });
        return lsCallback(null, url, 'none');
      }

      this.shortenUrl(
        url,
        account,
        function(err, shortenedUrl, shortenerType) {
          var urlShortened = shortenedUrl && url && shortenedUrl !== url ? true : false;
          if (urlShortened) {
            // link shortened, save it to post

            var set = {},
              setCount = 0,
              short = {
                type: shortenerType,
                url: shortenedUrl,
                aid: account._id
              };

            if (post.repost && post.repost.url === url) {
              setCount++;
              post.repost.short = short;
              set['repost.short'] = short;
            }
            if (post.attachments && post.attachments.link && post.attachments.link.url === url) {
              setCount++;
              post.attachments.link.short = short;
              set['attachments.link.short'] = short;
            }
            if (setCount) {
              post._optimisticUpdate({ $set: set }, function(err, updated) {
                if (err || !updated) {
                  log.error('Failed to update post with shortened link', {
                    postId: post._id.toString(),
                    updated: updated,
                    url: url,
                    short: short,
                    set: set,
                    error: err
                  });
                }
              });
            }
          }

          lsCallback(err, shortenedUrl, shortenerType);
        }.bind(this)
      );
    }.bind(this)
  );
  convertor.convert(callback);
};

Publisher.prototype._publishPost = function(post, callback) {
  Profile.findOne(
    { _id: post.pid },
    function(err, profile) {
      if (err) {
        log.error('Failed to fetch post profile', {
          publisher: this.name,
          postId: post._id.toString(),
          profileId: post.pid && post.pid.toString(),
          error: err
        });

        return callback(err);
      }

      if (!profile) {
        log.warn('Post profile not found', {
          publisher: this.name,
          postId: post._id.toString(),
          profileId: post.pid && post.pid.toString()
        });

        return post.failed('Destination profile ' + post.pid.toString() + ' not found', callback);
      }

      var account = post.aid && profile.findAccountById(post.aid.toString());
      if (!account) {
        log.error('Failed to find post account', {
          publisher: this.name,
          postId: post._id.toString(),
          profileId: post.pid && post.pid.toString(),
          accountId: post.aid && post.aid.toString()
        });
        return post.failed('Destination queue ' + (post.aid && post.aid.toString()) + ' not found', callback);
      }

      log.info('Publish ' + this.name + ' post', {
        postId: post._id.toString(),
        fake: this.isFake,
        profileId: post.pid && post.pid.toString(),
        accountId: post.aid && post.aid.toString()
      });

      this._convertPost(
        post,
        profile,
        account,
        function(err, req) {
          if (err) {
            log.error('Failed to convert post to request', {
              publisher: this.name,
              isRepost: (post.repost && post.repost.is) || false,
              postId: post._id.toString(),
              profileId: post.pid && post.pid.toString(),
              accountId: post.aid && post.aid.toString(),
              error: err
            });

            var op = err.isFatal ? post.failed : post.retry;

            return op.bind(post)(
              {
                message: (err.error && err.error.message) || null,
                error: err
              },
              function() {
                callback(err, false);
              }.bind(this)
            );
          }

          log.info('Publishing ' + (this.isFake ? 'fake ' : '') + this.name + ' post', req);

          if (this.isFake) {
            var id = uuid.v4().toString();
            return post.published(
              'fake-id-' + id,
              'https://link.to.faked.post/' + id,
              function() {
                callback(null, true);
              }.bind(this)
            );
          }

          this.publishPost(
            req,
            post,
            profile,
            account,
            function(err, result) {
              // result: {
              //   ok : boolean,
              //   disableAccount: boolean,
              //   blockPublishingUntil: moment,
              //   isRecoverable: boolean,
              //   postId: string,
              //   postUrl: string,
              //   failure: 'error message' || {
              //     tm: date,
              //     message: string,
              //     error: {...}
              //   }
              // }

              var isSkip = (result && result.skip) || false,
                isCompleted = (result && result.ok) || false,
                isInvalidImage = (result && result.isInvalidImage) || false,
                isRecoverable = (!isCompleted && result && result.isRecoverable) || false,
                isDisablingAccount = result && result.disableAccount,
                isDisablingLinkShortener = result && result.disableLinkShortener,
                blockPublishingUntil = result && result.blockPublishingUntil;

              log.info(this.name + ' post processed' + (isSkip ? ' and awaiting response' : ''), {
                publisher: this.name,
                postId: post._id.toString(),
                profileId: post.pid && post.pid.toString(),
                accountId: post.aid && post.aid.toString(),
                result: result,
                blockPublishingUntil: blockPublishingUntil && blockPublishingUntil.format(),
                isSkip: isSkip,
                isInvalidImage: isInvalidImage,
                isDisablingLinkShortener: isDisablingLinkShortener,
                isDisablingAccount: isDisablingAccount,
                isRecoverable: isRecoverable,
                isCompleted: isCompleted,
                error: err
              });

              if (isSkip) {
                return callback(null, true);
              }

              var finish = function(isSuccess) {
                var tasks = [];

                if (isDisablingAccount) {
                  tasks.push(async.apply(this._disableAccount.bind(this), profile, account));
                }

                if (blockPublishingUntil) {
                  tasks.push(async.apply(this._blockPublishingUntil.bind(this), account, blockPublishingUntil));
                }

                if (isInvalidImage) {
                  tasks.push(cb => {
                    Post.update(
                      { _id: post._id, 'attachments.link.photo': { $exists: true } },
                      { $set: { 'attachments.link.photo.ignore': true } },
                      (err, updated) => {
                        if (err) {
                          log.error('Failed to set link post photo to be ignored', {
                            profileId: post.pid && post.pid.toString(),
                            accountId: post.aid && post.aid.toString(),
                            postId: post._id.toString(),
                            error: err
                          });
                        } else if (dbUpdatedCount(updated)) {
                          log.info('Link post photo set to be ignored', {
                            profileId: post.pid && post.pid.toString(),
                            accountId: post.aid && post.aid.toString(),
                            postId: post._id.toString()
                          });
                        } else {
                          log.info('Link post with photo to be set to be ignored not found', {
                            profileId: post.pid && post.pid.toString(),
                            accountId: post.aid && post.aid.toString(),
                            postId: post._id.toString()
                          });
                        }
                        cb();
                      }
                    );
                  });
                }

                if (tasks.length) {
                  async.series(tasks, function(err) {
                    // ignore error
                    // if (err) {
                    //   return callback(err);
                    // }
                    callback(null, isSuccess);
                  });
                } else {
                  callback(null, isSuccess);
                }
              }.bind(this);

              if (isCompleted) {
                post.published(
                  result.postId,
                  result.postUrl,
                  function() {
                    finish(true);
                  }.bind(this)
                );
              } else {
                var fail = result && result.failure,
                  failure =
                    (fail && (_.isString(fail) ? fail : fail.message)) ||
                    (err && {
                      message: (err.error && err.error.message) || err.message || null,
                      error: err
                    }) ||
                    'Unspecified ' + (isRecoverable ? '' : 'un') + 'recoverable error',
                  isFailed = (err && err.isFatal) || !isRecoverable ? true : false,
                  opNow = isFailed ? null : blockPublishingUntil,
                  op = isFailed ? post.failed : post.retry;

                op.bind(post)(
                  failure,
                  function() {
                    finish(false);
                  }.bind(this),
                  opNow
                );
              }
            }.bind(this)
          );
        }.bind(this)
      );
    }.bind(this)
  );
};

Publisher.prototype.shortenUrl = function(url, account, callback) {
  this.shortenUrlExtended(url, null, null, account, callback);
};

Publisher.prototype.shortenUrlExtended = function(url, title, note, account, callback) {
  var shortenerType = (account.shortener && account.shortener.type) || 'none',
    useBitly = shortenerType === 'bitly' && account.shortener.bitly && account.shortener.bitly.token;
  if (useBitly) {
    this.shortenerBitly.shortenUrlExtended(
      url,
      account.shortener.bitly,
      title,
      note,
      function(shortenedUrl, opStat) {
        if (opStat) {
          var code = opStat.error && opStat.error.status_code,
            status = opStat.error && opStat.error.status_txt;

          if (code === 403 || status === 'INVALID_ACCESS_TOKEN' || status === 'MISSING_ARG_ACCESS_TOKEN') {
            this._disableAccountLinkShortener(account);
          }
        }

        callback(null, shortenedUrl, shortenerType);
      }.bind(this)
    );
  } else {
    callback(null, url, shortenerType);
  }
};

Publisher.prototype._blockPublishingUntil = function(account, blockUntil, callback) {
  this.postScheduler.block(
    account._id,
    blockUntil,
    function(err, blockedAccount, updatedPosts) {
      if (err) {
        log.error('Failed to block publishing to account', {
          accountId: account._id.toString(),
          blockUntil: blockUntil.format(),
          error: err
        });
      } else {
        log.info('Publishing to account blocked until', {
          accountId: blockedAccount._id.toString(),
          blockUntil: blockUntil.format(),
          updatedPosts: updatedPosts && updatedPosts.length
        });
      }
      if (callback) {
        callback(err, blockedAccount, updatedPosts);
      }
    }.bind(this)
  );
};

Publisher.prototype._disableAccount = function(profile, account, callback) {
  account.state = States.account.reconnectRequired.code;

  Profile.update(
    {
      'accounts._id': account._id
    },
    {
      $set: {
        'accounts.$.state': account.state,
        'accounts.$.stateUpdatedAt': new Date()
      }
    },
    function(err, updated) {
      if (err || dbNotUpdated(updated)) {
        log.error('Failed to disable account', {
          updated: updated,
          accountId: account._id.toString(),
          profileId: profile._id.toString(),
          error: err
        });
        return callback && callback(err);
      }

      var tasks = [
        async.apply(Post.blockAll.bind(Post), account),
        function(cb) {
          accountRequiresReconnect({ profile, account }).then(
            () => {
              log.info('Account requires reconnect event queued', {
                profileId: profile._id.toString(),
                accountId: account._id.toString()
              });
              cb();
            },
            error => {
              log.error('Failed to queue Account requires reconnect event', {
                profileId: profile._id.toString(),
                accountId: account._id.toString(),
                message: error.toString(),
                error
              });
              cb();
            }
          );
        }
      ];

      async.series(tasks, callback);
    }.bind(this)
  );
};

Publisher.prototype._disableAccountLinkShortener = function(account, callback) {
  account.shortener.type = 'none';

  Profile.update(
    {
      'accounts._id': account._id
    },
    {
      $set: { 'accounts.$.shortener.type': account.shortener.type }
    },
    function(err, updated) {
      if (err || dbNotUpdated(updated)) {
        log.error('Failed to force switch account shortener to ' + account.shortener.type, {
          updated: updated,
          accountId: account._id.toString(),
          error: err
        });
        return callback && callback(err);
      }

      log.info('Forced link shortener switch to ' + account.shortener.type, {
        accountId: account._id.toString()
      });

      if (callback) {
        callback();
      }
    }.bind(this)
  );
};
