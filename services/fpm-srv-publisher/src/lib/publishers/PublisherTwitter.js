/* jshint node: true, esversion: 6 */
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
const Twitter = require('../Twitter');

var PublisherTwitter = (module.exports = function PublisherTwitter(shortenerBitly, postScheduler) {
  Publisher.call(
    this,
    'Twitter',
    [Types.createCodeByName('twitter', 'profile')],
    shortenerBitly,
    postScheduler
  );

  this.tw = new Twitter();

  return this;
});
util.inherits(PublisherTwitter, Publisher);

PublisherTwitter.prototype.publishPost = function(req, post, profile, account, callback) {
  var result = {
    ok: false
  },
    activityUrl = post.repost && post.repost.activity && post.repost.activity.url;

  if (utils.isEmptyString(req.status) && !req.photo) {
    log.debug('Skipping Twitter empty post!', {
      accountId: account._id.toString(),
      profileId: profile._id.toString(),
      activityUrl: activityUrl
    });

    return callback({
      isFatal: true,
      error: {
        message: 'Empty message, skipped.'
      }
    });
  }

  var twitterCallback = function(err, data, tm) {
    if (err) {
      var isECONNRESET = err.code === 'ECONNRESET',
        isECONNREFUSED = err.code === 'ECONNREFUSED',
        isETIMEDOUT = err.code === 'ESOCKETTIMEDOUT' || err.code === 'ETIMEDOUT',
        isDuplicate = this._isError(err, 403, 'Status is a duplicate.'), // code 187
        isMalware = this._isError(err, 403, 'Status contains malware'),
        isAutomatedAndIgnored = this._isError(
          err,
          403,
          "This request looks like it might be automated. To protect our users from spam and other malicious activity, we can't complete this action right now. Please try again later."
        ),
        isAuthError = this._isError(err, 401, 'Could not authenticate you'),
        isInvalidOrExpired = this._isError(err, 401, 'Invalid or expired token.'),
        isErrorCreating =
          this._isError(err, 403, 'Error creating status.') ||
          this._isError(err, 403, 'Status creation failed: Tweet creation failed.'),
        isAccountSuspended =
          this._isError(err, 403, 'Your account is suspended and is not permitted to access this feature.') ||
          this._isError(
            err,
            403,
            'To protect our users from spam and other malicious activity, this account is temporarily locked. Please log in to https://twitter.com to unlock your account.'
          ),
        isNotAuthenticate =
          isInvalidOrExpired ||
          this._isError(err, 401, 'Could not authenticate with OAuth') ||
          this._isError(err, 401, 'Could not authenticate you.'),
        isDailyLimitHit = this._isError(err, 403, 'User is over daily status update limit.'),
        isTooLong = this._isError(err, 403, 'Status is over 280 characters.'),
        isInternalError = this._isError(err, 500),
        isOverCapacity = this._isError(err, 503),
        isTryAgainLater = this._isError(err, 226), // #226 This request looks like it might be automated. To protect our users from spam and other malicious activity, we can't complete this action right now. Please try again later.
        ignoreError =
          isDuplicate ||
          isMalware ||
          isNotAuthenticate ||
          isDailyLimitHit ||
          isOverCapacity ||
          isInternalError ||
          isAuthError ||
          isAccountSuspended ||
          isErrorCreating ||
          isInvalidOrExpired ||
          isECONNRESET ||
          isECONNREFUSED ||
          isETIMEDOUT ||
          isTryAgainLater ||
          isAutomatedAndIgnored ||
          isTooLong;

      result.isRecoverable =
        isECONNRESET ||
        isECONNREFUSED ||
        isETIMEDOUT ||
        isOverCapacity ||
        isInternalError ||
        isTryAgainLater ||
        isDailyLimitHit;
      result.disableAccount = isAccountSuspended || isInvalidOrExpired;
      result.failure = {
        message: (isETIMEDOUT && 'Timeouted (' + this.tw.timeout + 'ms)') || this._errorMessage(err) || 'Unknown error',
        error: err || data
      };

      if (isDailyLimitHit) {
        result.blockPublishingUntil = moment.utc().add(1, 'days').startOf('day');
      }

      (ignoreError ? log.warn : log.error)('Failed to publish Twitter post', {
        time: tm,
        postId: post._id.toString(),
        accountId: account._id.toString(),
        profileId: profile._id.toString(),
        activityUrl: activityUrl,
        isRepost: (post.repost && post.repost.is) || false,
        isRecoverable: result.isRecoverable,
        disableAccount: result.disableAccount,
        blockPublishingUntil: result.blockPublishingUntil && result.blockPublishingUntil.format(),
        failure: result.failure,
        data: data,
        error: err
      });
    } else if (data && data.id_str) {
      result.ok = true;
      result.postId = data.id_str;
      result.postUrl = 'https://twitter.com/' + account.uid + (result.postId ? '/status/' + result.postId : '');

      log.info('Twitter post successfull published', {
        time: tm,
        postId: post._id.toString(),
        accountId: account._id.toString(),
        profileId: profile._id.toString(),
        activityUrl: activityUrl,
        id: result.postId,
        url: result.postUrl,
        isRepost: (post.repost && post.repost.is) || false,
        data: data
      });
    } else {
      result.isRecoverable = true;
      result.failure = {
        message: 'Reply is missing required data',
        error: data
      };

      log.warn('Twitter post publish reply do not contain expected data', {
        time: tm,
        postId: post._id.toString(),
        accountId: account._id.toString(),
        profileId: profile._id.toString(),
        activityUrl: activityUrl,
        data: data
      });
    }

    callback(err, result);
  }.bind(this);

  if (req.photo) {
    this.tw.tweetPic(
      req.status,
      req.photo,
      account.token,
      account.secret,
      function(err, data, tm) {
        var isImageUnavailable = err && (err.code === 'UNKNOWN_IMAGE_FORMAT' || err.code === 'HPE_INVALID_CONSTANT'),
          isErrorCreating =
            this._isError(err, 403, 'Error creating status.') ||
            this._isError(err, 403, 'Status creation failed: Tweet creation failed.'),
          failover = isImageUnavailable || isErrorCreating;

        if (failover) {
          log.warn('Twitter picture repost failed, retrying as a normal tweet', {
            time: tm,
            postId: post._id.toString(),
            error: err,
            data: data
          });

          this.tw.tweet({ status: req.status }, account.token, account.secret, twitterCallback);
        } else {
          twitterCallback(err, data, tm);
        }
      }.bind(this)
    );
  } else {
    this.tw.tweet({ status: req.status }, account.token, account.secret, twitterCallback);
  }
};

PublisherTwitter.prototype._fixErrors = function(error) {
  var errors = (error && error.errors && error.errors.errors) || (error && error.errors) || error;

  if (error && error.errors && _.isString(error.errors)) {
    try {
      errors = error.errors = JSON.parse(error.errors);
    } catch (e) {
      error.errors = null;
    }
  }
  if (error && error.errors && error.errors.errors && _.isString(error.errors.errors)) {
    try {
      errors = error.errors.errors = JSON.parse(error.errors.errors);
    } catch (e) {
      error.errors.errors = null;
    }
  }
  if (errors) {
    if (_.isObject(errors)) {
      errors = _.values(errors);
    }
    errors = _.flatten(errors);
  }

  return errors;
};

PublisherTwitter.prototype._errorMessage = function(error) {
  if (error && error.code === 'FAILED_TO_GET_IMAGE') {
    return 'Failed to fetch image';
  }

  var errors = this._fixErrors(error);

  return (
    (errors &&
      _.map(errors, function(err) {
        return err ? ((err.code && '(#' + err.code + ') ') || '') + (err.message || err) : null;
      }).join('. ')) ||
    (error && error.toString())
  );
};

PublisherTwitter.prototype._isError = function(error, statusCode, message) {
  var result = false;

  if (error && error.statusCode === statusCode) {
    if (message) {
      var errors = this._fixErrors(error);
      if (errors && errors.length > 0) {
        for (var i = 0; i < errors.length; i++) {
          if (errors[i] && message.indexOf(errors[i].message) > -1) {
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
