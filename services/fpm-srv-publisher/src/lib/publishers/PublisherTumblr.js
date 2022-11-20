/* jshint node: true, esversion: 6, -W014 */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { Types, States } = require('@fpm/constants');
const util = require('util');
const Publisher = require('../Publisher');
const utils = require('../utils');
const _ = require('lodash');
const async = require('async');
const moment = require('moment');
const tumblr = require('../tumblr');

var PublisherTumblr = (module.exports = function PublisherTumblr(shortenerBitly, postScheduler) {
  Publisher.call(
    this,
    'Tumblr',
    [Types.createCodeByName('tumblr', 'blog'), Types.createCodeByName('tumblr', 'privblog')],
    shortenerBitly,
    postScheduler
  );

  this.timeout = config.get('tumblr:timeout') || config.get('defaults:network:timeout');

  return this;
});
util.inherits(PublisherTumblr, Publisher);

PublisherTumblr.prototype.publishPost = function(req, post, profile, account, callback) {
  var result = {
    ok: false
  },
    activityUrl = post.repost && post.repost.activity && post.repost.activity.url;

  tumblr.post(
    account,
    req,
    function(err, data, tm) {
      if (err) {
        var isTimeout = err.statusCode === null && data === null ? true : false,
          isUnauthorized = this._isError(err, 401),
          isBadRequest = this._isError(err, 400),
          isNotFound = this._isError(err, 404),
          isLimitThrottle =
            this._isError(
              err,
              400,
              "Oh no! You've reached your photo upload limit for today. Please come again tomorrow!"
            ) || this._isError(err, 400, "You've exceeded your daily post limit."),
          ignoreError = isTimeout || isNotFound || isUnauthorized || isBadRequest ? true : false;

        result.isRecoverable = isTimeout;
        result.disableAccount = isNotFound;
        result.failure = {
          message: (isTimeout && 'Timeouted (' + this.timeout + 'ms)') || this._errorMessage(err) || 'Unknown error',
          error: err || data
        };

        if (isLimitThrottle) {
          result.blockPublishingUntil = moment.utc().add(1, 'days').startOf('day');
        }

        (ignoreError ? log.warn : log.error)('Failed to publish Tumblr post', {
          time: tm,
          postId: post._id.toString(),
          accountId: account._id.toString(),
          profileId: profile._id.toString(),
          activityUrl: activityUrl,
          isRecoverable: result.isRecoverable,
          disableAccount: result.disableAccount,
          blockPublishingUntil: result.blockPublishingUntil && result.blockPublishingUntil.format(),
          failure: result.failure,
          data: data,
          error: err
        });
      } else if (data && data.response && data.response.id) {
        result.ok = true;
        result.postId = data.response.id;
        result.postUrl = 'http://' + account.uid + '.tumblr.com/post/' + data.response.id;

        log.info('Tumblr post successfull published', {
          time: tm,
          postId: post._id.toString(),
          accountId: account._id.toString(),
          profileId: profile._id.toString(),
          activityUrl: activityUrl,
          id: result.postId,
          url: result.postUrl,
          data: data
        });
      } else {
        result.isRecoverable = true;
        result.failure = {
          message: 'Reply is missing required data',
          error: data
        };

        log.warn('Tumblr post publish reply do not contain expected data', {
          time: tm,
          postId: post._id.toString(),
          accountId: account._id.toString(),
          profileId: profile._id.toString(),
          activityUrl: activityUrl,
          data: data
        });
      }

      callback(err, result);
    }.bind(this),
    this.timeout
  );
};

PublisherTumblr.prototype._errorMessage = function(err) {
  var errors = this._fixErrors(err);
  return errors
    ? errors.join(' ') || ''
    : (err && ((err.error && err.error.message) || err.error || err.toString())) || '';
};

PublisherTumblr.prototype._fixErrors = function(error) {
  var errors = error && error.errors;

  if (errors) {
    if (_.isObject(errors)) {
      errors = _.values(errors);
    }
    errors = _.flatten(errors);
  }

  return errors;
};

PublisherTumblr.prototype._isError = function(error, statusCode, message) {
  var result = false;

  if (error && error.statusCode === statusCode) {
    if (message) {
      var errors = this._fixErrors(error);
      if (errors && errors.length > 0) {
        for (var i = 0; i < errors.length; i++) {
          if (message.indexOf(errors[i]) > -1) {
            result = true;
            break;
          }
        }
      }
    } else {
      result = true;
    }
  }
  return result;
};
