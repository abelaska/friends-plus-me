/* jshint node: true, esversion: 6 */
const { PostText } = require('@fpm/post');
const util = require('util');
const PostConvertor = require('../PostConvertor');
const utils = require('../utils');
const S = require('string');

// !!!!! Groups: musi byt definovany title nebo content.title (pokud je definovany neni title vyzadovano) !!!!! UPRAVIT!!!

const PostConvertorLinkedin = (module.exports = function PostConvertorLinkedin(
  post,
  profile,
  account,
  linkShortenerFce
) {
  PostConvertor.call(this, post, profile, account, linkShortenerFce);
  this.messageMaxLength = 1250; // 1300
  return this;
});
util.inherits(PostConvertorLinkedin, PostConvertor);

const toVisibility = ({ privacy }) => {
  switch (privacy) {
    case 'anyone':
      return 'PUBLIC';
    case 'connections-only':
    default:
      return 'CONNECTIONS';
  }
};

// callback(err, req)
PostConvertorLinkedin.prototype.convertPost = function (callback) {
  const post = this.post;
  const attachments = post.attachments;
  const isRepost = (post.repost && post.repost.is) || false;
  const isNotRepost = !isRepost;
  const video = attachments && attachments.video;
  const photo = attachments && attachments.photo;
  const link = attachments && attachments.link;
  const text =
    PostText.htmlToPlain(
      utils
        .replaceAutocompletedInputWithValue(post.html, true)
        .replace(/<\s*\/\s*p[^>]*\s*>\s*<\s*p[^>]*\s*>/g, '\n')
        .replace(/<\s*\/?\s*p[^>]*\s*>/g, '')
    ) || '';
  const visibility = this.isPage ? 'PUBLIC' : toVisibility(this.account);
  const author = `urn:li:${this.isPage ? 'organization' : 'person'}:${this.account.uid}`;

  const linkUrl = link && link.url;
  const photoUrl = photo && photo.url;
  // const shareMediaCategory = (linkUrl && 'ARTICLE') || (photoUrl && 'IMAGE') || 'NONE';
  const shareMediaCategory = ((photoUrl || linkUrl) && 'ARTICLE') || 'NONE';
  const media =
    (linkUrl && {
      status: 'READY',
      description: { text: link.description },
      originalUrl: linkUrl,
      title: { text: link.title }
    }) ||
    (photoUrl && {
      status: 'READY',
      description: { text: '' },
      originalUrl: utils.photoUrl(photo),
      title: { text: 'Photo' }
    }) ||
    undefined;

  const req = {
    author,
    lifecycleState: 'PUBLISHED',
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': visibility
    },
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareMediaCategory,
        shareCommentary: { text },
        ...((media && { media: [media] }) || undefined)
      }
    }
  };

  const realLen = text.length;
  if (realLen > this.messageMaxLength) {
    return callback({
      isFatal: true,
      error: {
        message: `Message is too long, ${realLen} > max. ${this.messageMaxLength}`,
        code: 'MESSAGE_TOO_LONG'
      }
    });
  }

  return callback(null, req);
};
