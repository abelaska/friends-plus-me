/* jshint node: true */
'use strict';

const { AssetsManager } = require('@fpm/assets');
const log = require('@fpm/logging').default;
const config = require('@fpm/config');
const url = require('url');

const assetsManager = new AssetsManager({
  imageProxyConfig: config.get('image:proxy')
});

var AvatarImage = module.exports = function AvatarImage() {
  return this;
};

// callback(proxyUrl)
AvatarImage.prototype.storeForce = function(url, user, pid, callback) {
	this.store(url, user, pid, (error, newUrl) => {
		if (error || !newUrl) {
      log.warn('Failed to store avatar image', { pid: pid && pid.toString(), url, newUrl, message: error && error.toString() });
		}
		callback(newUrl || url);
	});
};

// callback(err, proxyUrl)
AvatarImage.prototype.store = function(url, user, pid, callback) {
  if (!url) {
    return callback();
  }
  url = this.fixGoogleImageUrl(url, 's50');
  assetsManager.fetchAndStoreAvatar({ url, user, pid }).then(asset => {
    callback(null, `${asset.picture.proxy}=s50`);
  }, callback);
};

AvatarImage.prototype.fixGoogleImageUrl = function(fixUrl, sizeOption) {
  if (!fixUrl) {
    return fixUrl;
  }
  // upravit rozliseni fotky na originalni
  var parts,
      size = sizeOption || 's0',
      googleusercontentHostRegexp = /lh[0-9]*.googleusercontent.com/,
      u = url.parse(fixUrl, true);
  if (u.host && googleusercontentHostRegexp.test(u.host)) {
    parts = u.pathname.split('/');
    switch (parts.length) {
    case 3: // 2 & parts[0].toLowerCase() === 'proxy'
      if (parts[1].toLowerCase() === 'proxy') {
        var params = parts[2].split('=');
        if (params.length === 2) {
          params[1] = size;
          parts[2] = params.join('=');
        }
      }
      break;
    case 6:
      parts.splice(5, 0, size);
      break;
    case 7:
      parts[5] = size;
      break;
    }
    u.pathname = parts.join('/');
    fixUrl = url.format(u);
  }
  return fixUrl;
};
