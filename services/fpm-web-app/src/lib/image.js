/*jshint node: true */
'use strict';

const { AssetsManager, createUserFileUploadUrl } = require('@fpm/assets');
const config = require('@fpm/config');

const assetsManager = new AssetsManager({
  imageProxyConfig: config.get('image:proxy')
});

exports.signedUploadUrl = function signedUploadUrl({ user, contentType }, callback) {
  createUserFileUploadUrl({ user, contentType }).then(result => {
    callback(null, result);
  }, callback);
};

exports.fetchAndStoreImage = function fetchAndStoreImage({ url, user, pid }, callback) {
  return assetsManager.fetchAndStorePicture({ url, user, pid }).then(asset => {
    const picture = {
      original: url,
      url: asset.picture.proxy,
      gcs: asset.picture.url,
      width: asset.picture.width,
      height: asset.picture.height,
      aniGif: asset.picture.aniGif,
      contentType: asset.picture.contentType,
      isFullBleed: asset.picture.width >= 506 && asset.picture.height >= 303 && (asset.picture.width / asset.picture.height) <= (5/2) ? true : false
    };
    if (callback) {
      callback(null, picture);
    } else {
      return picture;
    }
  }, callback);
};

exports.identify = function identify(url, callback) {
  return assetsManager.imageProxy.fetchAndStore(url, '').then(detail => {
    callback(null, {
      url,
      width: detail.width,
      height: detail.height,
      aniGif: detail.aniGif,
      contentType: detail.contentType,
      isFullBleed: detail.width >= 506 && detail.height >= 303 && (detail.width / detail.height) <= (5/2) ? true : false
    });
  }, callback);
};
