/* jshint node: true, esversion: 6 */

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { Types, States } = require('@fpm/constants');
const util = require('util');
const Publisher = require('../Publisher');
const utils = require('../utils');
const _ = require('lodash');
const async = require('async');
const moment = require('moment');
const pinterest = require('../pinterest');

const PublisherPinterest = (module.exports = function PublisherPinterest(
  shortenerBitly,
  postScheduler
) {
  Publisher.call(
    this,
    'Pinterest',
    [Types.createCodeByName('pinterest', 'board')],
    shortenerBitly,
    postScheduler
  );

  this.timeout = config.get('pinterest:timeout') || config.get('defaults:network:timeout');

  return this;
});
util.inherits(PublisherPinterest, Publisher);

PublisherPinterest.prototype.publishPost = function (req, post, profile, account, callback) {
  let result = {
      ok: false
    },
    tm = new Date(),
    activityUrl = post.repost && post.repost.activity && post.repost.activity.url;

  if (utils.isEmptyString(req.photo)) {
    log.debug('Skipping Pinterest empty post!', {
      accountId: account._id.toString(),
      profileId: profile._id.toString(),
      activityUrl
    });

    return callback({
      isFatal: true,
      error: {
        message: 'Empty message, skipped.'
      }
    });
  }

  const pinterestCallback = function (err, data) {
    tm = new Date() - tm;

    if (err) {
      let isServerError = this._isError(err, 500) || this._isError(err, 503),
        isAuthorizationFailed =
          this._isError(err, 401, 'Authorization failed.') ||
          this._isError(err, 401, 'Authentication failed.') ||
          this._isError(err, 401, "You don't have permission to edit that board.") ||
          this._isError(err, 400, "Sorry! This site doesn't allow you to save Pins."),
        isImageFetchFailure = this._isError(err, 400, 'Sorry we could not fetch the image.'),
        isTooSmallImage = this._isError(
          err,
          403,
          'Your image is too small. Please choose a larger image and try again.'
        ),
        isPinUploadTimeout = this._isError(err, 408),
        isECONNRESET = err.code === 'ECONNRESET',
        isECONNREFUSED = err.code === 'ECONNREFUSED',
        isETIMEDOUT = err.code === 'ESOCKETTIMEDOUT' || err.code === 'ETIMEDOUT',
        isImageNotFound = err.code === 'IMAGE_NOT_FOUND',
        ignoreError =
          isImageNotFound ||
          isECONNRESET ||
          isECONNREFUSED ||
          isETIMEDOUT ||
          isServerError ||
          isImageFetchFailure ||
          isTooSmallImage ||
          isPinUploadTimeout ||
          isAuthorizationFailed;

      result.isRecoverable =
        isECONNRESET || isECONNREFUSED || isETIMEDOUT || isServerError || isImageFetchFailure || isPinUploadTimeout;
      result.disableAccount = isAuthorizationFailed;
      result.failure = {
        message:
          (isETIMEDOUT && `Timeouted (${this.timeout}ms)`) ||
          (err.message || (err.error && err.error.message)) ||
          'Unknown error',
        error: err || data
      };

      (ignoreError ? log.warn : log.error)('Failed to publish Pinterest post', {
        time: tm,
        postId: post._id.toString(),
        accountId: account._id.toString(),
        profileId: profile._id.toString(),
        activityUrl,
        isRepost: (post.repost && post.repost.is) || false,
        isRecoverable: result.isRecoverable,
        disableAccount: result.disableAccount,
        blockPublishingUntil: result.blockPublishingUntil && result.blockPublishingUntil.format(),
        failure: result.failure,
        data,
        error: err
      });
    } else if (data && data.id) {
      result.ok = true;
      result.postId = data.id;
      result.postUrl = data.url;

      log.info('Pinterest post successfull published', {
        time: tm,
        postId: post._id.toString(),
        accountId: account._id.toString(),
        profileId: profile._id.toString(),
        activityUrl,
        id: result.postId,
        url: result.postUrl,
        isRepost: (post.repost && post.repost.is) || false,
        data
      });
    } else {
      result.isRecoverable = true;
      result.failure = {
        message: 'Reply is missing required data',
        error: data
      };

      log.warn('Pinterest post publish reply do not contain expected data', {
        time: tm,
        postId: post._id.toString(),
        accountId: account._id.toString(),
        profileId: profile._id.toString(),
        activityUrl,
        data
      });
    }

    callback(err, result);
  }.bind(this);

  pinterest.pin(account.uid, req.photo, req.link, req.note, account.token, pinterestCallback, this.timeout, 'id,url');
};

PublisherPinterest.prototype._isError = function (error, statusCode, message) {
  let result = false;

  if (error && (error.statusCode === statusCode || error.responseCode === statusCode)) {
    if (message) {
      const errMsg = error.error && error.error.message;
      result = errMsg && (errMsg === message || errMsg.indexOf(message) > -1);
    } else {
      result = true;
    }
  }
  return result;
};
