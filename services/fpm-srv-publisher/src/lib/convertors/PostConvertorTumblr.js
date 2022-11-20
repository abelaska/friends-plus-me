/* jshint node: true, esversion: 6 */
'use strict';

const log = require('@fpm/logging').default;
const util = require('util');
const PostConvertor = require('../PostConvertor');
const utils = require('../utils');
const hashtags = require('../hashtags');

var PostConvertorTumblr = module.exports = function PostConvertorTumblr(post, profile, account, linkShortenerFce) {
  PostConvertor.call(this, post, profile, account, linkShortenerFce);
  return this;
};
util.inherits(PostConvertorTumblr, PostConvertor);

// callback(err, req)
PostConvertorTumblr.prototype.convertPost = function(callback) {
  var req,
      post = this.post,
      attachments = post.attachments,
      isRepost = post.repost && post.repost.is || false,
      video = attachments && attachments.video,
      photo = attachments && attachments.photo,
      link = attachments && attachments.link,
      embedVideoUrl = video && video.embedUrl,
      photoUrl = utils.photoUrl(photo),
      linkUrl = link && link.url,
      tags = hashtags.extractHashtags(post.html, true) || [],
      html = hashtags.removeControlHashtagsHtml(post.html, tags, true);

  if (!isRepost) {
    html = utils.replaceAutocompletedInputWithValue(html, true);
  }

  if (embedVideoUrl) {
    req = {
      type: 'video',
      caption: html,
      embed: embedVideoUrl
    };
  } else
  if (linkUrl) {
    photoUrl = utils.photoUrl(link.photo);
    if (photoUrl) {
      html += '<p>' + linkUrl+'</p>'+'<p><img src="'+photoUrl+'"/></p>';
      req = {
        type: 'text',
        title: utils.prepareText(link.title),
        body: html
      };
    } else {
      req = {
        type: 'link',
        url: linkUrl,
        title: utils.prepareText(link.title),
        description: html
      };
    }
  } else
  if (photoUrl) {
    req = {
      type: 'photo',
      link: linkUrl,
      caption: html,
      source: photoUrl
    };
  } else {
    req = {
      type: 'text',
      //title: ??? prispevek s title neni tak dobry a uzivatelum se to nelibi
      body: html
    };
  }

  req.tags = tags.join(',');

  callback(null, req);
};