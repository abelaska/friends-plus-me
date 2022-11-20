/* jshint node: true, esversion: 6, -W014 */
const config = require("@fpm/config");
const log = require("@fpm/logging").default;
const { Types } = require("@fpm/constants");
const util = require("util");
const Publisher = require("../Publisher");
const _ = require("lodash");
const moment = require("moment");
const Agents = require("../Agents");
const request = require("request").defaults({ pool: Agents("linkedin") });

// https://docs.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin?context=linkedin/marketing/context#creating-a-share-on-linkedin
// https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/share-api

// urn:li:person:{id}
// urn:li:organization:{id}
// urn:li:organizationBrand:{id}

// All API requests are represented in protocol 2.0.0 and require the header X-Restli-Protocol-Version: 2.0.0.

const PublisherLinkedin = (module.exports = function PublisherLinkedin(
  shortenerBitly,
  postScheduler
) {
  Publisher.call(
    this,
    "Linkedin",
    [
      Types.createCodeByName("linkedin", "profile"),
      Types.createCodeByName("linkedin", "group"),
      Types.createCodeByName("linkedin", "page"),
    ],
    shortenerBitly,
    postScheduler
  );
  this.timeout =
    config.get("linkedin:timeout") || config.get("defaults:network:timeout");
  return this;
});
util.inherits(PublisherLinkedin, Publisher);

PublisherLinkedin.prototype.publishPost = function (
  req,
  post,
  profile,
  account,
  callback
) {
  let result = { ok: false },
    tm = new Date(),
    isGroup = account.account === Types.account.group.code,
    isPage = account.account === Types.account.page.code,
    activityUrl =
      post.repost && post.repost.activity && post.repost.activity.url;

  // if (this._isMessageEmpty(req, account)) {
  //   log.debug('Skipping Linkedin empty post!', {
  //     postId: post._id.toString(),
  //     accountId: account._id.toString(),
  //     profileId: profile._id.toString(),
  //     activityUrl
  //   });

  //   return callback({
  //     isFatal: true,
  //     error: {
  //       message: 'Empty message, skipped.'
  //     }
  //   });
  // }

  this._send(req, account, (err, res, json) => {
    tm = new Date() - tm;

    if (
      res &&
      (res.statusCode === 200 ||
        res.statusCode === 201 ||
        res.statusCode === 202)
    ) {
      result.postId = res.headers["x-restli-id"] || "";
      result.postUrl =
        (result.postId &&
          `https://www.linkedin.com/feed/update/${result.postId}`) ||
        account.url;
      result.ok = true;

      // if (isGroup) {
      //   // res.statusCode === 202 znamena, ze byl prispevek akceptovan a ceka na schvaleni
      //   let postId = (res.headers.location || '').substr('http://api.linkedin.com/v1/posts/'.length);
      //   if (postId) {
      //     result.postId = postId;
      //     postId = postId.split('-');
      //     if (postId.length === 4) {
      //       result.postUrl = `http://www.linkedin.com/groupItem?view=&type=member&gid=${postId[1]}&item=${postId[3]}`;
      //     }
      //   } else {
      //     result.postId = '';
      //     result.postUrl = account.url;
      //   }
      // } else {
      //   result.postId = json.updateKey;
      //   result.postUrl = json.updateUrl;
      // }

      log.info("Linkedin post successfull published", {
        time: tm,
        postId: post._id.toString(),
        accountId: account._id.toString(),
        profileId: profile._id.toString(),
        activityUrl,
        id: result.postId,
        url: result.postUrl,
        data: json || null,
        headers: res.headers,
      });
    } else {
      const isTimeout = !res || !json;

      if (!json) {
        json = {};
      }

      let isLimitThrottle =
          (res && res.statusCode == 429) ||
          (json.status === 403 &&
            json.message ===
              "Throttle limit for calls to this resource is reached."),
        isAccessDenied =
          json.status === 403 &&
          json.message === "Access to write groups denied",
        isMemberRestricted =
          json.status === 401 && json.message === "Member is restricted",
        isInvalidAccessToken =
          (json.status === 401 &&
            json.message === "Unable to verify access token") ||
          (json.status === 401 && json.message === "Invalid access token."),
        isRevokedToken =
          json.status === 401 &&
          json.message ===
            "Then token used in this request has been revoked by the user.",
        // isDuplicate = json.status === 400 && json.message === 'Do not post duplicate content',
        isServerError =
          json.status === 500 &&
          (json.message === "Internal service error" ||
            json.message === "Internal API server error"),
        isUnauthorized =
          json.status === 401 &&
          json.message &&
          json.message.indexOf("[unauthorized]") === 0,
        isExpiredtoken =
          json.status === 401 &&
          json.message === "The token used in the request has expired.",
        isDuplicateContent =
          json.status === 400 &&
          json.message === "Do not post duplicate content",
        isUnknownError = _.isString(json),
        ignoreError =
          isUnknownError ||
          isDuplicateContent ||
          isLimitThrottle ||
          isServerError ||
          isUnauthorized ||
          isMemberRestricted ||
          isAccessDenied ||
          isInvalidAccessToken ||
          isRevokedToken ||
          isExpiredtoken;

      result.isRecoverable =
        !isMemberRestricted &&
        !isAccessDenied &&
        !isRevokedToken &&
        (isServerError ||
          isTimeout ||
          isLimitThrottle ||
          isInvalidAccessToken ||
          isUnknownError);
      result.disableAccount =
        isUnauthorized ||
        isMemberRestricted ||
        isAccessDenied ||
        isInvalidAccessToken ||
        isRevokedToken ||
        isExpiredtoken;
      result.failure = {
        message:
          (isTimeout && `Timeouted (${this.timeout}ms)`) ||
          (err && err.toString()) ||
          (json && json.message) ||
          "Unknown error",
        error: err || json,
      };

      if (isLimitThrottle) {
        result.blockPublishingUntil = moment
          .utc()
          .add(1, "days")
          .startOf("day");
      }

      (ignoreError ? log.warn : log.error)("Failed to publish Linkedin post", {
        time: tm,
        postId: post._id.toString(),
        accountId: account._id.toString(),
        profileId: profile._id.toString(),
        activityUrl,
        isRecoverable: result.isRecoverable,
        disableAccount: result.disableAccount,
        blockPublishingUntil:
          result.blockPublishingUntil && result.blockPublishingUntil.format(),
        statusCode: (res && res.statusCode) || -1,
        headers: (res && res.headers) || null,
        isTimeout,
        failure: result.failure,
        data: json || null,
        error: err,
      });
    }

    callback(err, result);
  });
};

// PublisherLinkedin.prototype._isMessageEmpty = function (data, account) {
//   let isGroup = account.account === Types.account.group.code,
//     isEmpty = isGroup
//       ? utils.isEmptyString(data.title) || (data.content && utils.isEmptyString(data.content.title))
//       : /* jshint -W041 */
//         utils.isEmptyString(data.comment) && (data.content == null || utils.isEmptyString(data.content.title));
//   return isEmpty;
// };

// cb(err, body, res)
PublisherLinkedin.prototype._send = function (data, account, callback) {
  const req = {
    url: "https://api.linkedin.com/v2/ugcPosts",
    body: data,
    json: true,
    timeout: this.timeout,
    headers: {
      Accept: "*/*",
      "x-li-format": "json",
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
      "User-Agent": `FriendsPlusMe/${config.get("version")}`,
      Authorization: `Bearer ${account.token}`,
    },
    agentOptions: {
      ciphers: "ALL",
      secureProtocol: "TLSv1_2_method",
    },
  };
  request.post(req, callback);
};
