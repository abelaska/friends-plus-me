/* jshint node: true, esversion: 6, -W030 */
const PostText = require('@fpm/post').PostText;
const util = require('util');
const PostConvertor = require('../PostConvertor');
const utils = require('../utils');
const twitterText = require('twitter-text');

const PostConvertorTwitter = (module.exports = function PostConvertorTwitter(post, profile, account, linkShortenerFce) {
  PostConvertor.call(this, post, profile, account, linkShortenerFce);

  (this.linkLength = 23), (this.postLinkLength = this.linkLength + 1); // t.co link (22-http, 23-https) // space + t.co link

  return this;
});
util.inherits(PostConvertorTwitter, PostConvertor);

// callback(err, req)
PostConvertorTwitter.prototype.convertPost = function (callback) {
  let post = this.post,
    attachments = post.attachments,
    isRepost = (post.repost && post.repost.is) || false,
    isNotRepost = !isRepost,
    link = attachments && attachments.link,
    photo = (attachments && attachments.photo) || (link && !this.account.twForceLink && link.photo),
    isVideo = (attachments && attachments.video) || (link && this._isVideoUrl(link.url)),
    checkLength =
      isNotRepost ||
      ((post.createdAt && post.createdAt.valueOf()) || 0) !== ((post.modifiedAt && post.modifiedAt.valueOf()) || 0),
    req = {
      status: PostText.htmlToPlain(utils.replaceAutocompletedInputWithValue(post.html, true)),
      photo: !isVideo && photo
    };

  if (isNotRepost && link && link.url && req.status.indexOf(link.url) === -1) {
    if (link.short && link.short.url) {
      if (req.status.indexOf(link.short.url) === -1) {
        req.status += (req.status ? ' ' : '') + link.url;
      }
    } else {
      req.status += (req.status ? ' ' : '') + link.url;
    }
  }

  callback(null, req);
};

PostConvertorTwitter.prototype._realStatusLength = function (msg) {
  let realMessageLength = msg ? msg.length : 0,
    links = msg ? twitterText.extractUrlsWithIndices(msg) : [];
  links.forEach(l => {
    realMessageLength += this.linkLength - l.url.length;
  });
  return realMessageLength;
};
