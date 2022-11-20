/* jshint node: true, esversion: 6 */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const util = require('util');
const _ = require('lodash');
const S = require('string');
const async = require('async');
const utils = require('./utils');
const Convertor = require('./Convertor');

var PostConvertor = module.exports = function PostConvertor(post, profile, account, linkShortenerFce) {
  Convertor.call(this, post, profile, account, linkShortenerFce);

	this.videoUrlRegEx = _.map(config.get('convertor:video:urls') || [], function(regExStr) {
    return new RegExp(regExStr, 'g');
  });
	this.youtubeVideoUrlRegEx = _.map(config.get('convertor:video:youtube') || [], function(regExStr) {
    return new RegExp(regExStr, 'g');
  });

  return this;
};
util.inherits(PostConvertor, Convertor);

// callback(err, req)
PostConvertor.prototype.convertPost = function(callback) {
  throw new Error('Not implemented');
};

// callback(err, req)
PostConvertor.prototype.convert = function(callback) {
  this.convertPost(function(err, req) {
  	if (err) {
  		return callback(err);
  	}
  	this._shortenObj(req, callback);
  }.bind(this));
};

PostConvertor.prototype._shortenObjScan = function(obj, urls, foundUrls, path) {

	var v, i,
	    pairs = {};

	path = path || '/';

	_.chain(obj).keys().forEach(function(key) {
		v = obj[key];
		if (_.isString(v) && key.indexOf('_') !== 0) {
			for (i = 0 ; i < urls.length; i++) {
				if (v.indexOf(urls[i]) > -1) {
					foundUrls[urls[i]] = foundUrls[urls[i]] || true;
					pairs[path+key] = [obj, key];
				}
			}
		} else
		if (_.isObject(v)) {
			var _pairs = this._shortenObjScan(v, urls, foundUrls, path+key+'/');
			if (_.size(_pairs)) {
				for (var k in _pairs) {
					pairs[k] = _pairs[k];
				}
			}
		}
	}.bind(this)).value();

	return pairs;
};

PostConvertor.prototype._shortenObj = function(obj, callback) {

	var urls = [],
	    foundUrls = {};

	if (this.post.repost && this.post.repost.url) {
		urls.push(this.post.repost.url);

		if (this.post.repost.short && this.post.repost.short.url) {
			foundUrls[this.post.repost.url] = this.post.repost.short.url;
		}
	}
	if (this.post.attachments && this.post.attachments.link && this.post.attachments.link.url) {
		urls.push(this.post.attachments.link.url);

		if (this.post.attachments.link.short && this.post.attachments.link.short.url) {
			foundUrls[this.post.attachments.link.url] = this.post.attachments.link.short.url;
		}
	}

	if (!urls.length) {
		return callback(null, obj);
	}

	var foundPairs = _.values(this._shortenObjScan(obj, urls, foundUrls));

	if (!_.size(foundPairs)) {
		return callback(null, obj);
	}

	urls = _.keys(foundUrls);

	// shorten detected urls
	async.eachLimit(urls, 8, function(url, cb) {
		if (foundUrls[url] && foundUrls[url] !== true) {
			return cb();
		}
		this.linkShortener(url, function(err, shortenedUrl, shortenerType) {
			foundUrls[url] = shortenedUrl;
			cb();
		});
	}.bind(this), function(err) {
		if (err) {
			return callback(err);
		}

		var reUrl;

		_.forEach(urls, function(url) {
            reUrl = new RegExp(utils.escapeRegExp(url)+'\\/?(?=\\s|$)', 'g');
			_.forEach(foundPairs, function(pair) {
				pair[0][pair[1]] = pair[0][pair[1]].replace(reUrl, foundUrls[url]);
			});
		});

		callback(null, obj);
	}.bind(this));
};

PostConvertor.prototype._isVideoUrl = function(url) {
  if (url && this.videoUrlRegEx.length) {
    for (var i = 0; i < this.videoUrlRegEx.length; i++) {
      if (url.match(this.videoUrlRegEx[i])) {
        return true;
      }
    }
  }
  return false;
};

PostConvertor.prototype._isYoutubeVideoUrl = function(url) {
  if (url && this.youtubeVideoUrlRegEx.length) {
    for (var i = 0; i < this.youtubeVideoUrlRegEx.length; i++) {
      if (url.match(this.youtubeVideoUrlRegEx[i])) {
        return true;
      }
    }
  }
  return false;
};
