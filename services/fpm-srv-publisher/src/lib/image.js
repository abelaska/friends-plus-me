/* jshint node: true, esversion: 6 */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const url = require('url');
const async = require('async');
const Rest = require('./Rest');

const rest = new Rest();
const userAgent = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:40.0) Gecko/20100101 Firefox/40.0';
// const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.130 Safari/537.36'

// callback(err, buffer)
var fetchImageFile = exports.fetchImageFile = function fetchImageFile(imageUrl, callback, timeout, maxDownloadSize) {
  var lastErr, uriEncoded, buffer,
      tries = config.get('image:fetch:tries') || 3,
      options = {
        url: imageUrl,
        timeout: timeout || config.get('image:fetch:timeout') || config.get('defaults:network:timeout'),
        maxDownloadSize: maxDownloadSize || -1,
        headers: {
          'User-Agent': userAgent
        }
      };

  async.whilst(
    function() { return tries-- > 0; },
    function(cb) {
      rest.download(options, function(err, rsp, buf, tm) {

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

        if (err && (err.code === 1 || err.code === 'ECONNREFUSED' || err.code === 'ESOCKETTIMEDOUT' || err.code === 'EAI_AGAIN')) {
          lastErr = {
            code: 'FAILED_TO_FETCH_IMAGE_CONNECTION_ERROR',
            url: imageUrl,
            error: err
          };
          setTimeout(cb, 500);
          cb = null;
        } else
        // HTTP NOT FOUND
        if (rsp && (rsp.statusCode === 403 || rsp.statusCode === 404 || rsp.statusCode === 500 || rsp.statusCode === 502)) {
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
        } else
        // HTTP REDIRECT
        if (rsp && (rsp.statusCode === 301 || rsp.statusCode === 302) && rsp.headers.location) {
          lastErr = {
            code: 'FAILED_TO_FETCH_IMAGE_REDIRECT',
            url: imageUrl,
            error: err
          };
          options.url = rsp.headers.location;
          cb();
          cb = null;
        } else
        if (!err && (!buf || buf.length === 0)) {
          lastErr = {
            code:'EMPTY_IMAGE_FILE_WITH_RETRY',
            url: imageUrl
          };
          setTimeout(cb, 500);
          cb = null;
        } else
        if (!err && rsp && buf && buf.length > 0) {
          if (rsp && rsp.statusCode === 200) {
            buffer = buf;
            tries = 0;
            lastErr = null;
            cb();
          } else {
            log.warn('Failed to fetch image file', {
              time: tm,
              statusCode: rsp && rsp.statusCode || null,
              url: imageUrl});

            cb({
              code:'FAILED_TO_FETCH_IMAGE_STATUS_NOT_OK',
              statusCode: rsp && rsp.statusCode || null,
              url: imageUrl
            });
          }
          cb = null;
        } else {
          log.warn('Failed to download image', {
            time: tm,
            url: imageUrl,
            error: err,
            statusCode: rsp?rsp.statusCode:null});

          cb({
            code: 'FAILED_TO_FETCH_IMAGE',
            url: imageUrl,
            error: err || lastErr
          });
          cb = null;
        }
      });
    },
    function(err) {
      callback(err || lastErr, buffer);
    }
  );
};
