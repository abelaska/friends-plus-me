/* jshint node: true, esversion: 6 */
const log = require('@fpm/logging').default;
const { PostText } = require('@fpm/post');
const { Profile } = require('@fpm/db');
const util = require('util');
const PostConvertor = require('../PostConvertor');
const utils = require('../utils');
const querystring = require('querystring');

const facebook = require('../facebook');

const PostConvertorFacebook = (module.exports = function PostConvertorFacebook(
  post,
  profile,
  account,
  linkShortenerFce
) {
  PostConvertor.call(this, post, profile, account, linkShortenerFce);

  this.messageMaxLength = 10000;
  this.isPrivacyAllowed = this.isProfile;

  this.fbPrefixUrl = `https://graph.facebook.com/${facebook.apiVersion}/`;
  this.fbUrl = {
    feed: `${this.fbPrefixUrl + this.account.uid}/feed`
  };

  return this;
});
util.inherits(PostConvertorFacebook, PostConvertor);

// callback(err, req)
PostConvertorFacebook.prototype.convertPost = function (callback) {
  let post = this.post,
    attachments = post.attachments,
    isRepost = (post.repost && post.repost.is) || false,
    photo = attachments && attachments.photo,
    link = attachments && attachments.link,
    photoUrl = utils.photoUrl(photo),
    linkUrl = link && link.url,
    isYoutubeVideo = linkUrl && this._isYoutubeVideoUrl(linkUrl),
    urlType = 'feed',
    text = PostText.htmlToPlain(
      utils
        .replaceAutocompletedInputWithValue(post.html, true)
        .replace(/<\s*\/\s*p[^>]*\s*>\s*<\s*p[^>]*\s*>/g, '\n')
        .replace(/<\s*\/?\s*p[^>]*\s*>/g, '')
    ),
    req = {
      url: null,
      req: {
        message: text,
        access_token: this.account.token
      }
    };

  if (isYoutubeVideo) {
    linkUrl = `https://crawler.friendsplus.me/video/proxy?${querystring.stringify({ url: linkUrl })}`;
  }

  if (this.isPrivacyAllowed && this.account.privacy) {
    req.req.privacy = `{"value": "${this.account.privacy}"}`;
  }

  if (linkUrl) {
    req.req.link = linkUrl;
    // not possible to modify these parameters for if not owner of the domain since API v2.11
    // req.req.description = link.description && utils.prepareText(link.description);
    // req.req.name = link.title && utils.prepareText(link.title);
    // if (req.req.name && req.req.name.length > 255) {
    //   req.req.name = `${utils.textShortener(req.req.name, 254)}…`;
    // }
    // let picture = photo || link.photo,
    //   pictureUrl = utils.photoUrl(picture);
    // req.req.picture = this._fixPhotoUrl(pictureUrl);
  } else if (photoUrl) {
    if (this.isGroup) {
      req.req.picture = this._fixPhotoUrl(photoUrl);
      // je nove vyzadovano od v2.5, pouze message uz nestaci
      req.req.link = req.req.picture;
    } else {
      urlType = 'photo';
      req.req.url = this._fixPhotoUrl(photoUrl);
      // apparently in violation of https://developers.facebook.com/docs/apps/review/prefill
      // Your app Friends+Me (395022180558081) appears to be pre-filling its captions which is a violation of Section 2.3 of the Facebook Platform Policies
      // This policy prohibits apps from pre-filling the caption for any photo published on behalf of a user unless the user created the content earlier in the workflow. (Note: including default text is against our policies even if users are able to edit the content your app created.)
      // Please address this issue and remove the default caption as soon as possible in order to avoid enforcement. We appreciate your commitment to creating a positive experience for users.
      // req.req.name = text;
      // tak vyzkousime pouzit parameter message namisto name
    }
  }

  const realLen = (text && text.length) || 0;
  if (realLen > this.messageMaxLength) {
    return callback({
      isFatal: true,
      error: {
        message: `Message is too long, ${realLen} > max. ${this.messageMaxLength}`,
        code: 'MESSAGE_TOO_LONG'
      }
    });
  }

  if (urlType === 'photo') {
    this._getAlbumUrl((err, url) => {
      req.url = url;
      callback(null, req);
    });
  } else {
    req.url = this.fbUrl[urlType];
    callback(null, req);
  }
};

PostConvertorFacebook.prototype._fixPhotoUrl = function (photoUrl) {
  return photoUrl && encodeURI(photoUrl);
};

PostConvertorFacebook.prototype._formatAlbumUrl = function (albumId) {
  return `${this.fbPrefixUrl + albumId}/photos`;
};

PostConvertorFacebook.prototype._getAlbumUrl = function (callback) {
  if (this.account.albumId) {
    return callback(null, this._formatAlbumUrl(this.account.albumId));
  }

  facebook.findTimelinePhotoAlbumId(this.account.uid, this.account.token, (err, albumId, tm) => {
    if (err || !albumId) {
      log.warn('Failed to detect Facebook timeline photo album id, fallbacking to the default Friends+Me album', {
        profileId: this.profile._id.toString(),
        accountId: this.account._id.toString(),
        uid: this.account.uid,
        error: err
      });
      return callback(null, this._formatAlbumUrl(this.account.uid));
    }

    this.account.albumId = albumId;

    Profile.update(
      {
        _id: this.profile._id,
        'accounts._id': this.account._id
      },
      {
        $set: {
          'accounts.$.albumId': albumId
        }
      },
      (err, updated) => {
        if (err) {
          log.error('Failed to set Facebook timeline photo album id to account', {
            profileId: this.profile._id.toString(),
            accountId: this.account._id.toString(),
            uid: this.account.uid,
            albumId,
            error: err
          });
        } else {
          log.debug('Detected Facebook timeline photo album id saved to account', {
            profileId: this.profile._id.toString(),
            accountId: this.account._id.toString(),
            uid: this.account.uid,
            updated,
            albumId
          });
        }

        callback(null, this._formatAlbumUrl(albumId));
      }
    );
  });
};
