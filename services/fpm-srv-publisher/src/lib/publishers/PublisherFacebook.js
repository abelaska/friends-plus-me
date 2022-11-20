/* jshint node: true, esversion: 6 */

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { ActivityLock } = require('@fpm/db');
const { Types } = require('@fpm/constants');
const util = require('util');
const Publisher = require('../Publisher');
const utils = require('../utils');
const moment = require('moment');
const Agents = require('../Agents');
const facebook = require('../facebook');
const request = require('request').defaults({ pool: Agents('facebook') });

const PublisherFacebook = (module.exports = function PublisherFacebook(shortenerBitly, postScheduler) {
  Publisher.call(
    this,
    'Facebook',
    [
      Types.createCodeByName('facebook', 'profile'),
      Types.createCodeByName('facebook', 'group'),
      Types.createCodeByName('facebook', 'page')
    ],
    shortenerBitly,
    postScheduler
  );
  this.timeout = config.get('facebook:timeout') || config.get('defaults:network:timeout');
  return this;
});
util.inherits(PublisherFacebook, Publisher);

PublisherFacebook.prototype.publishPost = function (req, post, profile, account, callback) {
  const result = { ok: false };
  const isGroup = account.account === Types.account.group.code;
  const isPage = account.account === Types.account.page.code;
  const activityUrl = post.repost && post.repost.activity && post.repost.activity.url;

  if (this._isMessageEmpty(req)) {
    log.debug('Skipping Facebook empty post!', {
      postId: post._id.toString(),
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

  const facebookCallback = function facebookCallback(err, rsp, response, tm) {
    try {
      if (rsp && typeof rsp === 'string') {
        rsp = JSON.parse(rsp);
      }
    } catch (ignore) {
      /* */
    }

    const postId = (rsp && rsp.id) || '';
    const isStatusCode200 = response && response.statusCode === 200;
    const isInvalidSuccess = isStatusCode200 && (!post || postId === '0' || postId === 0);

    if (isStatusCode200) {
      result.ok = true;
      result.postId = postId;
      result.postUrl = `https://www.facebook.com/${postId.replace('_', '/posts/')}`;

      log.info('Facebook post successfull published', {
        time: tm,
        postId: post._id.toString(),
        accountId: account._id.toString(),
        profileId: profile._id.toString(),
        activityUrl,
        id: result.postId,
        url: result.postUrl,
        data: rsp || null
      });

      if (post.appendNoShare && result.postId) {
        ActivityLock.update(
          { pid: post.pid, id: result.postId },
          { $set: { pid: post.pid, id: result.postId }, $setOnInsert: { created: new Date() } },
          { upsert: true },
          err2 => {
            if (err2) {
              log.error(`Failed to save new FB change ${result.postId} lock`, {
                postId: post._id.toString(),
                fbPostId: result.postId,
                message: err2.toString(),
                stack: err2.stack
              });
            } else {
              log.info(`FB change ${result.postId} successfully locked`, {
                postId: post._id.toString(),
                fbPostId: result.postId
              });
            }
          }
        );
      }
    } else {
      const isTimeout = !response;

      let // An unknown error has occurred.
        isUnknownError = this._isError(rsp, 1),
        // Page ID 1485487885015398 was migrated to page ID 806777136069965.  Please update your API calls to the new ID
        isMigrated = this._isError(rsp, 21),
        // An unexpected error has occurred. Please retry your request later.
        isRetryRequired =
          this._isError(rsp, 2) ||
          this._isError(rsp, 500) ||
          // An error occurred while processing this request. Please try again later.
          this._isErrorCode(rsp, 368, 1404006) ||
          this._isError(rsp, 368, 'An error occurred while processing this request. Please try again later.'),
        // (#341) Feed action request limit reached
        isRequestLimitReached =
          this._isError(rsp, 341) ||
          this._isError(rsp, 17, '(#17) User request limit reached') ||
          this._isError(rsp, 32, '(#32) Page request limited reached'),
        // It looks like you were misusing this feature by going too fast. You’ve been blocked from using it.\n\nLearn more about blocks in the Help Center.
        isBlockedForPublishingTooFast =
          // It looks like you were misusing this feature by going too fast. You’ve been blocked from using it.\n\nLearn more about blocks in the Help Center.
          this._isErrorCode(rsp, 368, 1390008) ||
          this._isErrorPartial(rsp, 368, 'It looks like you were misusing this feature by going too fast.'),
        // ex. You're temporarily restricted from joining and posting to groups until today at 5:36pm.
        isRestrictedFromPublishingToGroups =
          // You're temporarily restricted from joining and posting to groups until today at 5:36pm.
          this._isErrorCode(rsp, 368, 1404078) ||
          this._isErrorPartial(rsp, 368, "You're temporarily restricted from joining and posting to groups"),
        // Warning: This Message Contains Blocked Content: Some content in this message has been reported as abusive by Facebook users.
        isContentBlocked = this._isError(rsp, 368),
        // (#324) Missing or invalid image file
        isMissingOrInvalidImageFile = this._isError(rsp, 324),
        // (#200) The user hasn't authorized the application to perform this action
        isAppNotAuthorized = this._isError(rsp, 200),
        // (#220) Album or albums not visible
        isAlbumNotVisible = this._isError(rsp, 220, '(#220) Album or albums not visible'),
        // (#282) Requires extended permission: share_item
        isNotGrantedExtendedPermissions = this._isError(rsp, 282),
        // subcode:458 Error validating access token: User 100001614400654 has not authorized application 395022180558081.
        // subcode:459 Error validating access token: You cannot access the app till you log in to www.facebook.com and follow the instructions given.
        // subcode:460 Error validating access token: Session does not match current stored session. This may be because the user changed the password since the time the session was created or Facebook has changed the session for security reasons.
        // subcode:461 Error validating access token: Session is invalid. This could be because the application was uninstalled after the session was created.
        isInvalidAccessTokenDelay = this._isError(rsp, 190) && rsp.error.error_subcode === 459,
        isInvalidAccessToken = this._isError(rsp, 190) && !isInvalidAccessTokenDelay,
        // (#1376025) You do not have permission to post in this group.
        isMissingGroupPermissions = this._isError(rsp, 1376025, 'You do not have permission to post in this group.'),
        // (#100) Required extended permission: share_item
        isMissingShareItemPermission = this._isError(rsp, 100, '(#100) Required extended permission: share_item'),
        isDuplicit = this._isError(rsp, 506, 'Duplicate status message'),
        // (#100) The status you are trying to publish is a duplicate of, or too similar to, one that we recently posted to Twitter
        isDuplicitTwitterPost = this._isError(
          rsp,
          100,
          '(#100) The status you are trying to publish is a duplicate of, or too similar to, one that we recently posted to Twitter'
        ),
        // Your photos couldn't be uploaded. Photos should be less than 4 MB and saved as JPG, PNG, GIF or TIFF files.
        isInvalidParameter = this._isError(rsp, 100, 'Invalid parameter'),
        // (#120) Invalid album id
        isInvalidAlbumId = this._isError(rsp, 120, '(#120) Invalid album id'),
        // (#240) Requires a valid user to be specified (either via the session or via the API parameter for specifying the user.
        isInvalidUser = this._isError(rsp, 240),
        // (#368) It looks like you were misusing this feature by going too fast. You’ve been blocked from using it.\n\nLearn more about blocks in the Help Center.
        isGoingTooFast = this._isError(
          rsp,
          368,
          'It looks like you were misusing this feature by going too fast. You’ve been blocked from using it.\n\nLearn more about blocks in the Help Center.'
        ),
        // (#1500) The url you supplied is invalid
        isUrlInvalid = this._isError(rsp, 1500),
        // There was a problem with the image file.
        isProblemWithImage = this._isError(rsp, 1366046),
        // Unsupported post request. Object with ID '255700597875420' does not exist, cannot be loaded due to missing permissions, or does not support this operation. Please read the Graph API documentation at https://developers.facebook.com/docs/graph-api
        isUnsupportedPostRequest = this._isErrorCode(rsp, 100, 33),
        // if ignore error
        ignoreError =
          isRetryRequired ||
          isContentBlocked ||
          isAppNotAuthorized ||
          isInvalidAccessToken ||
          isDuplicitTwitterPost ||
          isUrlInvalid ||
          isNotGrantedExtendedPermissions ||
          isRequestLimitReached ||
          isTimeout ||
          isMissingGroupPermissions ||
          isInvalidUser ||
          isMissingShareItemPermission ||
          isInvalidAlbumId ||
          isProblemWithImage ||
          isUnknownError ||
          isAlbumNotVisible ||
          isMigrated ||
          isInvalidAccessTokenDelay ||
          isInvalidParameter ||
          isInvalidSuccess ||
          isDuplicit ||
          isBlockedForPublishingTooFast ||
          isRestrictedFromPublishingToGroups ||
          isUnsupportedPostRequest;

      if (isInvalidSuccess) {
        result.failure = {
          message: 'FB API returned ok instead of error'
        };
      } else if (isRestrictedFromPublishingToGroups) {
        result.blockPublishingUntil = moment.utc().add(6, 'hours');
        result.failure = {
          message:
            'Facebook temporarily restricted user from joining and posting to groups, delaying queue by 6 hours.',
          error: err || rsp
        };
      } else if (isInvalidAccessTokenDelay) {
        result.blockPublishingUntil = moment.utc().add(1, 'days');
        result.failure = {
          message:
            'Facebook requests the user to log in before the use of Friends+Me app is allowed again, delaying queue by 1 day.',
          error: err || rsp
        };
      } else if (isRequestLimitReached) {
        result.blockPublishingUntil = moment.utc().add(3, 'hours');
        result.failure = {
          message: 'User or feed request limit reached, delaying queue by 3 hours.',
          error: err || rsp
        };
      } else {
        result.failure = {
          message:
            (isTimeout && `Timeouted (${this.timeout}ms)`) ||
            (err && err.toString()) ||
            this._readableErrorMessage(rsp) ||
            'Unknown error',
          error: err || rsp
        };
      }

      result.isRecoverable =
        (isInvalidAccessTokenDelay ||
          isUnknownError ||
          isRetryRequired ||
          isGoingTooFast ||
          isRetryRequired ||
          isRequestLimitReached ||
          isMissingOrInvalidImageFile ||
          isTimeout ||
          isProblemWithImage ||
          isInvalidSuccess) &&
        !isMissingGroupPermissions &&
        !isMissingShareItemPermission &&
        !isInvalidAlbumId &&
        !isInvalidParameter &&
        !isDuplicit &&
        !isBlockedForPublishingTooFast &&
        !isUnsupportedPostRequest;
      result.disableAccount =
        isMigrated ||
        isAlbumNotVisible ||
        isAppNotAuthorized ||
        isInvalidAccessToken ||
        isNotGrantedExtendedPermissions ||
        isMissingGroupPermissions ||
        isInvalidUser ||
        isMissingShareItemPermission ||
        isInvalidAlbumId ||
        isBlockedForPublishingTooFast ||
        isUnsupportedPostRequest;

      (ignoreError ? log.warn : log.error)('Failed to publish Facebook post', {
        time: tm,
        postId: post._id.toString(),
        accountId: account._id.toString(),
        profileId: profile._id.toString(),
        activityUrl,
        isRecoverable: result.isRecoverable,
        disableAccount: result.disableAccount,
        blockPublishingUntil: result.blockPublishingUntil && result.blockPublishingUntil.format(),
        failure: result.failure,
        statusCode: (response && response.statusCode) || -1,
        headers: (response && response.headers) || null,
        isTimeout,
        data: rsp,
        error: err
      });
    }

    callback(err, result);
  }.bind(this);

  this._send(req.url, req.req, post, facebookCallback);
};

PublisherFacebook.prototype._readableErrorMessage = function (rsp) {
  return rsp && rsp.error && (rsp.error.error_user_msg || rsp.error.message);
};

PublisherFacebook.prototype._errorMessage = function (rsp) {
  return rsp && rsp.error && rsp.error.message;
};

PublisherFacebook.prototype._isErrorPartial = function (rsp, code, message) {
  return (
    rsp && rsp.error && rsp.error.code === code && (message ? this._errorMessage(rsp).indexOf(message) > -1 : true)
  );
};

PublisherFacebook.prototype._isErrorCode = function (rsp, code, subCode) {
  return rsp && rsp.error && rsp.error.code === code && rsp.error.error_subcode === subCode;
};

PublisherFacebook.prototype._isError = function (rsp, code, message) {
  return rsp && rsp.error && rsp.error.code === code && (message ? this._errorMessage(rsp) === message : true);
};

PublisherFacebook.prototype._isMessageEmpty = function (data) {
  return (
    utils.isEmptyString(data.req.link) &&
    utils.isEmptyString(data.req.message) &&
    utils.isEmptyString(data.req.url) &&
    utils.isEmptyString(data.req.name)
  );
};

// callback(err, body, res, tm)
PublisherFacebook.prototype.__send = function (url, req, callback) {
  let tm = new Date();
  request.post(
    {
      url,
      json: true,
      timeout: this.timeout,
      form: req
    },
    (error, response, body) => {
      tm = new Date() - tm;
      callback(error, body, response, tm);
    }
  );
};

// force facebook to scrape the link before the post is published
PublisherFacebook.prototype.scrape = function (url, accessToken, post, callback) {
  let tm = new Date();
  request.get(
    {
      url: `https://graph.facebook.com/${facebook.apiVersion}/`,
      qs: {
        id: url,
        scrape: true,
        access_token: accessToken
      },
      json: true,
      timeout: this.timeout
    },
    (error, response, body) => {
      tm = new Date() - tm;
      const reply = (body && (typeof body === 'string' ? body : JSON.stringify(body))) || null;
      const statusCode = (response && response.statusCode) || null;
      log.info('Facebook scrape', { postId: post._id.toString(), url, tm, statusCode, reply });
      setTimeout(callback, 1500);
    }
  );
};

// callback(err, body, res, tm)
PublisherFacebook.prototype._send = function (url, req, post, callback) {
  const tm = new Date();
  if (req.link) {
    // 21.2.2018 U youtube videii to prestalo fungovat
    // req.link = utils.enhanceFacebookLink(req.link);
    this.scrape(req.link, req.access_token, post, () => {
      this.__send(url, req, callback);
    });
  } else {
    this.__send(url, req, callback);
  }
};
