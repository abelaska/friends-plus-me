const config = require('@fpm/config');
const Agents = require('./Agents');
const request = require('request').defaults({ pool: Agents('facebook') });

const apiVersion = 'v2.11';

exports.apiVersion = apiVersion;

exports.findTimelinePhotoAlbumId = function (uid, accessToken, callback, timeout) {
  let id,
    tm = new Date();

  var get = function (url) {
    request.get(
      {
        url: `${url}&access_token=${accessToken}`,
        json: true,
        timeout: timeout || config.get('facebook:timeout') || config.get('defaults:network:timeout')
      },
      (err, rsp, data) => {
        if (err || !data || !rsp || (rsp && rsp.statusCode !== 200)) {
          return callback(
            {
              statusCode: rsp && rsp.statusCode,
              error: err || data
            },
            null,
            new Date() - tm
          );
        }

        if (data.data && data.data.length) {
          for (let i = 0; i < data.data.length; i++) {
            if (data.data[i].type === 'wall') {
              id = data.data[i].id;
              break;
            }
          }

          if (!id && data.paging && data.paging.next) {
            get(data.paging.next);
          } else {
            callback(null, id, new Date() - tm);
          }
        } else {
          callback(null, id, new Date() - tm);
        }
      }
    );
  };

  get(`https://graph.facebook.com/${apiVersion}/${uid}/albums?fields=id,type&limit=50`);
};
