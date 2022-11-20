/* jshint node: true */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const async = require('async');
const request = require('request').defaults({ pool: { maxSockets: Infinity } });
const google  = require('./google');

var ShortenerGoogl = module.exports = function ShortenerGoogl() {

  this.isGooglRe = /^https?:\/\/goo.gl\/.*/;
  this.queue = async.queue(
    this._process.bind(this),
    config.get('googl:workers'));

  return this;
};

ShortenerGoogl.prototype.shortenUrl = function(url, googlConfig, callback) {
  this.shortenUrlExtended(url, googlConfig, null, null, callback);
};

ShortenerGoogl.prototype.shortenUrlExtended = function(url, googlConfig, title, note, callback) {

  if (this._isGooglUrl(url)) {
    return callback(null, url, 0);
  }

  this.queue.push({
    url: url,
    queuedAt: new Date(),
    actorId: googlConfig.id,
    token: googlConfig.token,
    secret: googlConfig.secret,
    title: title,
    note: note,
    callback: callback
  });
};

ShortenerGoogl.prototype._process = function(task, next) {
  this._shortenUrl(task.url, task.actorId, task.secret, task.token, task.title, task.note, task.queuedAt, task.callback, next);
};

ShortenerGoogl.prototype._isGooglUrl = function(url) {
  return this.isGooglRe.test(url);
};

ShortenerGoogl.prototype._shortenFailover = function(serviceUrl, url, callback) {
  var retErr, retData, firstErr, unshorteningRequired,
      retry = false,
      tryUntil = new Date().valueOf() + (config.get('googl:retry:timeout') || 5*1000);

  async.doWhilst(function(cb2) {
    google.json({
      url: serviceUrl,
      timeout: config.get('googl:timeout') || config.get('defaults:network:timeout'),
      data: {
        longUrl: url
      }
    }, function(err, data) {
      retErr = err;
      retData = data;
      firstErr = err && err.message && err.message.errors && err.message.errors.length && err.message.errors[0];
      unshorteningRequired = firstErr && err.code === 400 && firstErr.reason === 'invalid' && firstErr.locationType === 'parameter' && firstErr.location === 'resource.longUrl';
      retry = err && (err.code === 500 || (err.code === 403 && err.message  && err.message.message === 'Rate Limit Exceeded')) ? true : false;

      if (unshorteningRequired) {

        request({
          method: 'GET',
          url: url,
          timeout: config.get('googl:timeout') || config.get('defaults:network:timeout'),
          followRedirect: false,
          strictSSL: false
        }, function(err, rsp/*, body*/) {
          var newUrl = rsp && rsp.headers && rsp.headers.location;
          if (newUrl) {
            url = newUrl;
            retry = true;
            setTimeout(cb2, 100);
          } else {
            cb2();
          }
        });
      } else
      if (retry) {
        setTimeout(cb2, (config.get('googl:retry:wait') || 250));
      } else {
        cb2();
      }
    });
  }, function() {
    return retry && tryUntil > new Date().valueOf();
  }, function() {
    callback(retErr, retData);
  });
};

ShortenerGoogl.prototype._finished = function(err, data, tm, url, actorId, callback, next) {

  var shortenedUrl = data && data.id;

  if (err || !data) {
    log.error('Goo.gl(oauth2) shortener failure', {
      time: tm,
      url: url,
      actorId: actorId,
      data: data,
      error: err});
  } else {
    log.debug('Goo.gl(oauth2) shortened', {
      time: tm,
      url: url,
      shortenedUrl: shortenedUrl,
      actorId: actorId,
      data: data});
  }

  process.nextTick(function() {
    callback(err, shortenedUrl, tm);
  });

  if (next) {
    process.nextTick(next);
  }
};

ShortenerGoogl.prototype._shortenUrl = function(url, actorId, secret, token, title, note, queuedAt, callback, next) {

  var tm = new Date();

  google.callWithToken('googl:t:'+actorId, secret, function(accessToken, cb) {
    this._shortenFailover('https://www.googleapis.com/urlshortener/v1/url?alt=json&prettyPrint=false&fields=id&access_token='+accessToken, url, cb);
  }.bind(this), function(err, data) {
    this._finished(err, data, new Date() - tm, url, actorId, callback, next);
  }.bind(this), true);
};

ShortenerGoogl.prototype.shortenUrlWithKey = function(url, callback) {

  var tm = new Date();

  this._shortenFailover('https://www.googleapis.com/urlshortener/v1/url?key='+config.get('googl:key')+'&alt=json&prettyPrint=false&fields=id', url, function(err, data) {
    this._finished(err, data, new Date() - tm, url, null, callback);
  }.bind(this));
};
