/* jshint node: true, esversion: 6 */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const qs = require('querystring');
const async = require('async');
const OAuth = require('oauth').OAuth;
const Agents = require('./Agents');
const request = require('request').defaults({ pool: Agents('twitter') });
const utils = require('./utils');
const image = require('./image');

var Twitter = (module.exports = function Twitter() {
  this.maxImageFileSize = 3145728;
  this.maxImageDimension = 2048;

  this.timeout = config.get('twitter:timeout') || config.get('defaults:network:timeout');

  this.oauth = new OAuth(
    'https://api.twitter.com/oauth/request_token',
    'https://api.twitter.com/oauth/access_token',
    config.get('twitter:consumerKey'),
    config.get('twitter:consumerSecret'),
    '1.0',
    null,
    'HMAC-SHA1'
  );

  return this;
});

// params: {status: status}
Twitter.prototype.tweet = function(params, token, tokenSecret, callback) {
  var tm = new Date(),
    body = qs
      .stringify(params)
      .replace(/[!*()']/g, function(char) {
        return '%' + char.charCodeAt(0).toString(16);
      })
      .replace(/[~]/g, '');

  request.post(
    {
      url: 'https://api.twitter.com/1.1/statuses/update.json',
      body: body,
      json: true,
      timeout: this.timeout,
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
        Accept: '*/*',
        'User-Agent': 'FriendsPlusMe/' + config.get('version')
      },
      oauth: {
        consumer_key: config.get('twitter:consumerKey'),
        consumer_secret: config.get('twitter:consumerSecret'),
        token: token,
        token_secret: tokenSecret
      }
    },
    function(error, rsp, data) {
      tm = new Date() - tm;

      if (rsp && rsp.statusCode !== 200) {
        // https://dev.twitter.com/docs/error-codes-responses

        callback(
          {
            statusCode: rsp.statusCode,
            errors: data ? data.errors || data : []
          },
          null,
          tm
        );
      } else {
        callback(error, data, tm);
      }
    }
  );
};

Twitter.prototype.uploadMedia = function(photo, accessToken, accessTokenSecret, callback) {
  var tm = new Date();
  this._fetchImageFile(
    photo,
    function(err, buffer) {
      if (err || !buffer) {
        callback(err, null, new Date() - tm);
      } else {
        request
          .post(
            {
              url: 'https://upload.twitter.com/1.1/media/upload.json',
              oauth: {
                consumer_key: config.get('twitter:consumerKey'),
                consumer_secret: config.get('twitter:consumerSecret'),
                token: accessToken,
                token_secret: accessTokenSecret
              }
            },
            function(err, rsp, data) {
              tm = new Date() - tm;

              if (rsp && rsp.statusCode !== 200) {
                // https://dev.twitter.com/docs/error-codes-responses

                callback(
                  {
                    statusCode: rsp.statusCode,
                    errors: data ? data.errors || data : []
                  },
                  null,
                  tm
                );
              } else {
                if (data && !err) {
                  try {
                    data = JSON.parse(data);
                  } catch (e) {
                    err = e;
                  }
                }

                callback(err, data, tm);
              }
            }
          )
          .form()
          .append('media_data', buffer.toString('base64'));
      }
    }.bind(this)
  );
};

// callback(err, data, tm)
Twitter.prototype.tweetPic = function(status, photo, token, tokenSecret, callback) {
  this.uploadMedia(
    photo,
    token,
    tokenSecret,
    function(err, data, tm) {
      if (err || !data) {
        return callback(err, null, tm);
      }
      var media_ids = (data && data.media_id_string) || null,
        params = {
          status: status
        };
      if (media_ids) {
        params.media_ids = media_ids;
      }
      this.tweet(params, token, tokenSecret, callback);
    }.bind(this)
  );
};

// callback(err, buffer)
Twitter.prototype._fetchImageFile = function(photo, callback) {
  // TODO Šlo by získat velikost souboru obrázky přes Head a hlavičku content-length? Pro účely publikování obrázku na Twitter?
  let buffer;
  let size = Math.min(this.maxImageDimension, Math.max(photo.width || 0, photo.height || 0)) || this.maxImageDimension;
  const sizeStep = Math.round(size * 0.1);
  async.doWhilst(
    function(cb) {
      buffer = null;
      const url = utils.fixImageUrl(photo.url, `s${size}-nu`);
      image.fetchImageFile(
        url,
        function(err, buf) {
          if (err || !buf || !buf.length) {
            return cb(err);
          }
          buffer = buf;
          cb();
        }.bind(this),
        config.get('twitter:imageFetch:timeout')
      );
    }.bind(this),
    function() {
      size -= sizeStep;
      return buffer && buffer.length > this.maxImageFileSize && size > 0;
    }.bind(this),
    function(err) {
      if (callback) {
        callback(err, !err && buffer);
        callback = null;
      }
    }.bind(this)
  );
};
