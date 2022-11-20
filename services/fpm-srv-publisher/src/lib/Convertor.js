/* jshint node: true, esversion: 6 */
'use strict';

const { Types } = require('@fpm/constants');

const Convertor = module.exports = function Convertor(post, profile, account, linkShortenerFce) {

  this.profile = profile;
  this.account = account;
  this.post = post;
  this.linkShortener = linkShortenerFce;

  var isDestinationCollection = post.destinations && post.destinations.length && post.destinations[0].type === 'collection';

  this.isProfile = this.account.account === Types.account.profile.code ? true : false;
  this.isCollection = isDestinationCollection || this.account.account === Types.account.collection.code ? true : false;
  this.isPage = this.account.account === Types.account.page.code ? true : false;
  this.isGroup = this.account.account === Types.account.group.code ? true : false;

  this.collectionId =  (isDestinationCollection && post.destinations[0].id) || (this.isCollection && this.account.uid);

  return this;
};

Convertor.prototype.convert = function(callback) {
  throw new Error('Not implemented');
};