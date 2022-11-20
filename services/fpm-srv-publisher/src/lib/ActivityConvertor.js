/* jshint node: true, esversion: 6 */
'use strict';

const { Types } = require('@fpm/constants');
const S = require('string');
const util = require('util');
const Convertor = require('./Convertor');
const utils = require('./utils');

var ActivityConvertor = module.exports = function ActivityConvertor(post, profile, account, linkShortenerFce) {

  Convertor.call(this, post, profile, account, linkShortenerFce);

  this.activity = this.post.repost.activity;
  this.removeHashtags = this.post.repost.removeHashtags;
  this.uid = this.account.uid || null;

  this.video = this._findActivityAttachment('video');
  this.foundAttachment = this._isAttachmentPresent();

  this.isVideo = this.video && true || false;
  this.isShare = this.activity.verb === 'share';
  this.isPost = this.activity.verb === 'post';
  this.isCheckin = this.activity.verb === 'checkin';
  this.isPostNote = this.isPost && this.activity.object.objectType === 'note' && !this.foundAttachment;

  return this;
};
util.inherits(ActivityConvertor, Convertor);

// callback(err, req)
ActivityConvertor.prototype.convertActivity = function(callback) {
  throw new Error('Not implemented');
};

// callback(err, req)
ActivityConvertor.prototype.convert = function(callback) {

  var error;

  switch (this.activity.verb) {
    case 'post':
      if (this.activity.object.objectType !== 'note') {
        error = 'Not supported post objectType "'+this.activity.object.objectType+'"';
      }
      break;
    case 'share':
      if (this.activity.object.objectType !== 'activity') {
        error = 'Not supported share objectType "'+this.activity.object.objectType+'"';
      }
      break;
    case 'checkin':
      if (this.activity.object.objectType !== 'note') {
        error = 'Not supported checkin objectType "'+this.activity.object.objectType+'"';
      }
      break;
    default:
      error = 'Not supported activity verb "'+this.activity.verb+'"';
      break;
  }

  if (error) {
    return callback({
      error: {
        message: error
      }
    });
  }

  this.convertActivity(callback);
};

ActivityConvertor.prototype._findActivityAttachments = function(objectType) {
  return utils.findActivityAttachments(this.activity.object.attachments, objectType);
};

ActivityConvertor.prototype._findActivityAttachment = function(objectType, requiredProperty) {
  return utils.findActivityAttachment(this.activity.object.attachments, objectType, requiredProperty);
};

ActivityConvertor.prototype._isAttachmentPresent = function() {
  var attachment,
      present = false;
  if (this.activity.object.attachments && this.activity.object.attachments.length > 0) {
    // pokud se najde alespon jedena priloha s url, tak se to povazuje za prispevek s prilohou
    for (var i = 0; i < this.activity.object.attachments.length; i++) {
      attachment = this.activity.object.attachments[i];
      if (attachment.url && attachment.url.length > 0) {
        present = true;
        break;
      }
    }
  }
  return present;
};

ActivityConvertor.prototype._checkIfAttachContent = function(attachment) {
  // pokud content obsahuje nazev souboru, je text nahrazen za Photo nebo Photo Album
  if (utils.isNotEmptyString(attachment.content)) {
    var s = S(attachment.content.toLowerCase()).collapseWhitespace().trim();
    return !(s.endsWith('.jpg') || s.endsWith('.jpeg') || s.endsWith('.gif') || s.endsWith('.png') || s.endsWith('.bmp'));
  }
  return false;
};