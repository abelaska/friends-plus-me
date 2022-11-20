/* jshint node: true */
/* jshint -W106 */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const async = require('async');
const BitlyClient = require('bitly').BitlyClient;
const utils = require('./utils');

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

  const bitly = new BitlyClient(bitlyToken);
  bitly
  .shorten(url)
  .then(function(result) {
    stat.tm = new Date();
    stat.time = stat.tm - stat.time;
    
    log.debug('Bit.ly shortened', { time: stat.time, usedToken: bitlyToken ? true : false, url, result });

    process.nextTick(function() {
      callback((result && result.link) || url, stat);
    });
    process.nextTick(next);
  }.bind(this))
  .catch(function(error) {
    stat.tm = new Date();
    stat.time = stat.tm - stat.time;

    log.error('Bit.ly shortener failure', {
      time: stat.time,
      usedToken: bitlyToken ? true : false,
      error});

      process.nextTick(function() {
        callback(url, stat);
      });
      process.nextTick(next);
  }.bind(this));
};
