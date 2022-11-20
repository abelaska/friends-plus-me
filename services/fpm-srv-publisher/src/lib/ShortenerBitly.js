/* jshint node: true, esversion: 6 */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const async = require('async');
const utils = require('./utils');
const bitly = require('./bitly');

var ShortenerBitly = module.exports = function ShortenerBitly() {

  this.queue = async.queue(
    this._process.bind(this),
    config.get('bitly:workers'));

  return this;
};

ShortenerBitly.prototype.shortenUrl = function(url, bitlyConfig, callback) {
  this.shortenUrlExtended(url, bitlyConfig, null, null, callback);
};

ShortenerBitly.prototype.shortenUrlExtended = function(url, bitlyConfig, title, note, callback) {
  this.queue.push({
    url: url,
    queuedAt: new Date(),
    bitlyToken: bitlyConfig.token,
    title: title,
    note: note,
    callback: callback
  });
};

ShortenerBitly.prototype._process = function(task, next) {
  this._shortenUrl(task.url, task.bitlyToken, task.title, task.note, task.queuedAt, task.callback, next);
};

ShortenerBitly.prototype._shortenUrl = function(url, bitlyToken, title, note, queuedAt, callback, next) {

  var stat = {
        name: 'URLShortener',
        type: 'bit.ly',
        time: new Date(),
        usedToken: bitlyToken ? true : false,
        queuedFor: new Date() - queuedAt
      };

  var shortenCallback = function(err, rsp) {

    var statusTxt = rsp ? rsp.status_txt || '' : '';

    stat.tm = new Date();
    stat.time = stat.tm - stat.time;

    if (rsp && rsp.status_code === 200) {
      log.debug('Bit.ly shortened', {time:stat.time, data:rsp});
    } else
    if (statusTxt === 'ALREADY_A_BITLY_LINK' || statusTxt === 'LINK_ALREADY_EXISTS') {
      log.debug('Bit.ly already shortened', {time:stat.time, data:rsp});
    } else {

      stat.error = rsp || {};
      stat.statusCode = stat.error.status_code || 'unknown';

      log.warn('Bit.ly shortener failure ('+stat.statusCode+')', {
        time: stat.time,
        usedToken: bitlyToken ? true : false,
        error: rsp});
    }

    if (rsp && rsp.data && utils.isNotEmptyString(rsp.data.url)) {
      process.nextTick(function() {
        callback(rsp.data.url, stat);
      });
    } else
    if (rsp && rsp.data && rsp.data.link_save && utils.isNotEmptyString(rsp.data.link_save.link)) {
      process.nextTick(function() {
        callback(rsp.data.link_save.link, stat);
      });
    } else {
      process.nextTick(function() {
        callback(url, stat);
      });
    }

    process.nextTick(next);
  }.bind(this);

  if (title) {
    bitly.shortenUrlExtended(url, bitlyToken, title, note, shortenCallback);
  } else {
    bitly.shortenUrl(url, bitlyToken, shortenCallback);
  }
};