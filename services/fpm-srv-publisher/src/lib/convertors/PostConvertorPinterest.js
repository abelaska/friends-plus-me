/* jshint node: true, esversion: 6 */
const { PostText } = require('@fpm/post');
const util = require('util');
const PostConvertor = require('../PostConvertor');
const utils = require('../utils');

const PostConvertorPinterest = (module.exports = function PostConvertorPinterest(
  post,
  profile,
  account,
  linkShortenerFce
) {
  PostConvertor.call(this, post, profile, account, linkShortenerFce);
  return this;
});
util.inherits(PostConvertorPinterest, PostConvertor);

// callback(err, req)
PostConvertorPinterest.prototype.convertPost = function (callback) {
  let post = this.post,
    attachments = post.attachments,
    video = attachments && attachments.video,
    link = attachments && attachments.link,
    photo = (attachments && attachments.photo) || (link && link.photo),
    req = {
      note: PostText.htmlToPlain(
        utils
          .replaceAutocompletedInputWithValue(post.html, true)
          .replace(/<\s*\/\s*p[^>]*\s*>\s*<\s*p[^>]*\s*>/g, '\n')
          .replace(/<\s*\/?\s*p[^>]*\s*>/g, '')
      ),
      photo: !video && utils.photoUrl(photo),
      link: link && link.url
    };

  if (link && link.url && req.note.indexOf(link.url) === -1) {
    if (link.short && link.short.url) {
      if (req.note.indexOf(link.short.url) === -1) {
        req.note += (req.note ? '\n' : '') + link.url;
      }
    } else {
      req.note += (req.note ? '\n' : '') + link.url;
    }
  }

  if (!req.photo) {
    return callback({
      isFatal: true,
      error: {
        message: 'No image detected',
        code: 'IMAGE_NOT_FOUND'
      }
    });
  }

  callback(null, req);
};
