/* jshint node: true */

const url = require('url');
const _ = require('lodash');
const sizeOf = require('image-size');
const imageType = require('image-type');
const async = require('async');
const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const Rest = require('./Rest');

const rest = new Rest();
const userAgent = config.get('image:fetch:userAgent');

const GoogleusercontentHostRegExp = /lh[0-9]*.googleusercontent.com/;
const BlogspotHostRegExp = /[0-9]+.bp.blogspot.com/;

const fixImageUrl = (exports.fixImageUrl = function fixImageUrl(imageUrl, sizeOption) {
  if (!imageUrl) {
    return imageUrl;
  }
  let parts;
  const size = sizeOption || 's0';
  const u = url.parse(imageUrl, true);
  if (u.host && (GoogleusercontentHostRegExp.test(u.host) || BlogspotHostRegExp.test(u.host))) {
    parts = u.pathname.split('/');
    switch (parts.length) {
      case 3: // 2 & parts[0].toLowerCase() === 'proxy'
        if (parts[1].toLowerCase() === 'proxy') {
          const params = parts[2].split('=');
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
      default:
        break;
    }
    u.pathname = parts.join('/');
    imageUrl = url.format(u);
  }
  return imageUrl;
});

const isAnimatedGif = (exports.isAnimatedGif = function isAnimatedGif(buffer) {
  // \x00\x21\xF9\x04
  // skip 4b
  // \x00(\x2C|\x21)

  let i = 0,
    idLen = 4 + 4 + 2,
    seqCount = 0,
    c = buffer;

  while (seqCount < 2 && i <= c.length - idLen) {
    if (
      c[i + 0] === 0x00 &&
      c[i + 1] === 0x21 &&
      c[i + 2] === 0xf9 &&
      c[i + 3] === 0x04 &&
      (c[i + 5 + 4] === 0x21 || c[i + 5 + 4] === 0x2c)
    ) {
      seqCount++;
      i += idLen;
    } else {
      i++;
    }
  }

  return seqCount > 1;
});

const identifyImageByUrl = (exports.identifyImageByUrl = function identifyImageByUrl(url) {
  if (!url) {
    return null;
  }

  url = url.toLowerCase();

  if (/\.jpg$/.test(url) || /\.jpeg$/.test(url)) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  if (/\.gif$/.test(url)) {
    return { mime: 'image/gif', ext: 'gif' };
  }

  if (/\.png$/.test(url)) {
    return { mime: 'image/png', ext: 'png' };
  }

  return null;
});

// rsp: { buffer: ..., fileExt: ..., contentType: ..., isAniGif: true/false }
const identifyImage = (exports.identifyImage = function identifyImage(buffer, url) {
  let result,
    imgType = imageType(buffer) || identifyImageByUrl(url);
  if (imgType && imgType.mime && imgType.ext) {
    result = {
      contentType: imgType.mime,
      fileExt: imgType.ext,
      isAniGif: !!(imgType.mime === 'image/gif' && isAnimatedGif(buffer))
    };
  }
  return result;
});

// callback(err, buffer, contentType, tm, fileExt, isAniGif)
const fetchImageFile = (exports.fetchImageFile = function fetchImageFile(imageUrl, callback, timeout, maxDownloadSize) {
  let lastErr,
    uriEncoded,
    tries = config.get('image:fetch:tries') || 3,
    options = {
      url: imageUrl,
      timeout: timeout || config.get('image:fetch:timeout') || config.get('defaults:network:timeout'),
      maxDownloadSize: maxDownloadSize || -1,
      headers: {
        'User-Agent': userAgent
      }
    },
    result = {
      buffer: null,
      fileExt: null,
      contentType: null,
      contentLength: null,
      isAniGif: false,
      tm: null
    };

  if (maxDownloadSize > 0) {
    options.Range = `bytes=0-${maxDownloadSize}`;
  }

  async.whilst(
    () => {
      return tries-- > 0;
    },
    cb => {
      rest.download(options, (err, rsp, buffer, tm) => {
        if (err) {
          lastErr = {
            code: 'FAILED_TO_FETCH_IMAGE',
            url: imageUrl,
            error: err
          };
        }

        if (!cb) {
          return;
        }

        result.tm = tm;

        if (err && _.includes([1, 'ECONNREFUSED', 'ESOCKETTIMEDOUT', 'EAI_AGAIN', 'HPE_INVALID_CONSTANT'], err.code)) {
          lastErr = {
            code: 'FAILED_TO_FETCH_IMAGE_CONNECTION_ERROR',
            url: imageUrl,
            error: err
          };
          setTimeout(cb, 500);
          cb = null;
        } else if (rsp && _.includes([404, 403, 500, 502, 522], rsp.statusCode)) {
          // HTTP NOT FOUND
          lastErr = {
            code: 'FAILED_TO_FETCH_IMAGE_SOURCE_ERROR',
            statusCode: rsp && rsp.statusCode,
            url: imageUrl,
            error: err
          };
          if (!uriEncoded) {
            uriEncoded = true;
            imageUrl = encodeURI(imageUrl);
            options.url = imageUrl;
          }
          setTimeout(cb, 500);
          cb = null;
        } else if (rsp && (rsp.statusCode === 301 || rsp.statusCode === 302) && rsp.headers.location) {
          // HTTP REDIRECT
          lastErr = {
            code: 'FAILED_TO_FETCH_IMAGE_REDIRECT',
            url: imageUrl,
            error: err
          };
          options.url = rsp.headers.location;
          cb();
          cb = null;
        } else if (!err && (!buffer || buffer.length === 0)) {
          lastErr = {
            code: 'EMPTY_IMAGE_FILE_WITH_RETRY',
            url: imageUrl
          };
          setTimeout(cb, 500);
          cb = null;
        } else if (!err && rsp && buffer && buffer.length > 0) {
          if (rsp && rsp.statusCode === 200) {
            const ii = identifyImage(buffer, imageUrl);
            if (ii) {
              const contentLength = rsp.headers['content-length'];

              result.buffer = buffer;
              result.contentType = ii.contentType;
              result.contentLength = (contentLength && parseInt(contentLength)) || buffer.length;
              result.fileExt = ii.fileExt;
              result.isAniGif = ii.isAniGif;
              tries = 0;
              lastErr = null;
              return cb();
            }
            return cb({
              code: 'UNKNOWN_IMAGE_FORMAT',
              url: imageUrl
            });
          }

          log.warn('Failed to fetch image file', {
            time: tm,
            statusCode: (rsp && rsp.statusCode) || null,
            url: imageUrl
          });

          cb({
            code: 'FAILED_TO_FETCH_IMAGE_STATUS_NOT_OK',
            statusCode: (rsp && rsp.statusCode) || null,
            url: imageUrl
          });
        } else {
          log.warn('Failed to download image', {
            time: tm,
            url: imageUrl,
            error: err,
            statusCode: rsp ? rsp.statusCode : null
          });

          cb({
            code: 'FAILED_TO_FETCH_IMAGE',
            url: imageUrl,
            error: err || lastErr
          });
          cb = null;
        }
      });
    },
    err => {
      callback(
        err || lastErr,
        result.buffer,
        result.contentType,
        result.contentLength,
        result.tm,
        result.fileExt,
        result.isAniGif
      );
    }
  );
});

// callback(err, width, height, contentType, contentLength, isAnimatedGif, buffer, downloadTime, sizeTime)
const fetchImageForDimensions = (exports.fetchImageForDimensions = function fetchImageForDimensions(
  imageUrl,
  callback,
  timeout,
  maxDownloadSize,
  times
) {
  maxDownloadSize = maxDownloadSize || 1024;

  fetchImageFile(
    imageUrl,
    (err, buffer, contentType, contentLength, tm0, fileExt, isAniGif) => {
      if (err || !buffer || !buffer.length || !contentType) {
        if (callback) {
          callback(err, null, null, null, null, null, null, {
            fetch: tm0 + ((times && times.fetch) || 0),
            sizeOf: (times && times.sizeOf) || 0
          });
          callback = null;
        }
      } else {
        var size,
          err,
          tm1 = new Date();

        try {
          size = sizeOf(buffer);
        } catch (e) {
          err = e;
        }

        tm1 = new Date() - tm1;

        if (err || !size) {
          if (err && maxDownloadSize < 256 * 1024) {
            return fetchImageForDimensions(imageUrl, callback, timeout, 3 * maxDownloadSize);
          }
          return callback(err, null, null, null, null, null, null, {
            fetch: tm0 + ((times && times.fetch) || 0),
            sizeOf: tm1 + ((times && times.sizeOf) || 0)
          });
        }

        callback(null, size.width, size.height, contentType, contentLength, isAniGif, buffer, {
          fetch: tm0 + ((times && times.fetch) || 0),
          sizeOf: tm1 + ((times && times.sizeOf) || 0)
        });
      }
    },
    timeout,
    maxDownloadSize
  );
});

// fetchImageForDimensions('https://lh3.googleusercontent.com/-Blre_ddi0E0/VZ-TIgmQ0xI/AAAAAAAA_lQ/CZ13z_mHhkc/s600/IMG_20150709_121145.jpg', function(err, width, height, contentType, contentLength, isAniGif, buffer, times) {
//   console.log('complete',err,'width',width,'height',height,'contentType',contentType,'contentLength',contentLength,'isAniGif',isAniGif,'buffer.length',buffer.length,'times',times);
// });
// fetchImageForDimensions('http://www.kizoa.com/img/e8nZC.gif', function(err, width, height, contentType, isAniGif, buffer, times) {
//   console.log('complete',err,'width',width,'height',height,'contentType',contentType,'isAniGif',isAniGif,'buffer.length',buffer.length,'times',times);
// });
