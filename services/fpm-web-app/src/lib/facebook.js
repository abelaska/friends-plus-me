const config = require('@fpm/config');
const rp = require('request-promise');
const request = require('request').defaults({ pool: { maxSockets: Infinity } });

const apiVersion = 'v2.11';

exports.extendAccessToken = function extendAccessToken(accessToken, callback, timeout) {
  request.get(
    {
      url: `https://graph.facebook.com/${apiVersion}/oauth/access_token`,
      qs: {
        client_id: config.get('facebook:clientId'),
        client_secret: config.get('facebook:clientSecret'),
        grant_type: 'fb_exchange_token',
        fb_exchange_token: accessToken
      },
      timeout: timeout || config.get('defaults:network:timeout'),
      json: true
    },
    function(err, rsp, extBody) {
      if (err) {
        callback(err);
      } else if (rsp && rsp.statusCode === 200 && extBody) {
        callback(null, extBody);
      } else {
        callback({
          message: 'Failed to extend Facebook access token',
          error: extBody,
          responseCode: rsp ? rsp.statusCode : null
        });
      }
    }
  );
};

exports.userInfo = function userInfo(accessToken, uid, callback, timeout) {
  request.get(
    {
      url: `https://graph.facebook.com/${apiVersion}/${uid}`,
      qs: {
        access_token: accessToken
      },
      timeout: timeout || config.get('defaults:network:timeout'),
      json: true
    },
    function(err, rsp, extBody) {
      if (err) {
        callback(err);
      } else if (rsp && rsp.statusCode === 200 && extBody) {
        callback(null, extBody);
      } else {
        callback({
          message: 'Failed to fetch Facebook user "' + account.uid + '" info',
          error: extBody,
          responseCode: rsp ? rsp.statusCode : null
        });
      }
    }
  );
};

exports.findTimelinePhotoAlbumId = function(uid, accessToken, callback, timeout) {
  var id, tm = new Date();

  var get = function(url) {
    request.get(
      {
        url: url + '&access_token=' + accessToken,
        json: true,
        timeout: timeout || config.get('facebook:timeout') || config.get('defaultTimeout')
      },
      function(err, rsp, data) {
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
          for (var i = 0; i < data.data.length; i++) {
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

  get(`https://graph.facebook.com/${apiVersion}/${uid}/albums?fields=id,type`);
};

var graph = (exports.graph = function graph(path, accessToken, callback, timeout) {
  var tm = new Date();

  request.get(
    {
      url: `https://graph.facebook.com/${apiVersion}/${path}&access_token=${accessToken}`,
      json: true,
      timeout: timeout || config.get('facebook:timeout') || config.get('defaultTimeout')
    },
    function(err, rsp, data) {
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

      callback(null, data, new Date() - tm);
    }
  );
});

var graphList = (exports.graphList = function graphList(path, accessToken, callback, timeout) {
  var result = [], tm = new Date();

  var get = function(url) {
    request.get(
      {
        url: url + '&access_token=' + accessToken,
        json: true,
        timeout: timeout || config.get('facebook:timeout') || config.get('defaultTimeout')
      },
      function(err, rsp, data) {
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
          result = result.concat(data.data);

          if (data.paging && data.paging.next) {
            get(data.paging.next);
          } else {
            callback(null, result, new Date() - tm);
          }
        } else {
          callback(null, result, new Date() - tm);
        }
      }
    );
  };

  get(`https://graph.facebook.com/${apiVersion}/${path}`);
});

exports.listGroups = function listGroups(uid, accessToken, callback, timeout) {
  graphList(uid + '/groups?fields=id,name,description,cover', accessToken, callback, timeout);
};

exports.listPages = function listPages(uid, accessToken, callback, timeout) {
  graphList(uid + '/accounts?fields=id,access_token,name,description', accessToken, callback, timeout);
};

exports.group = function group(groupUid, token, callback) {
  graph(groupUid + '?fields=id,name,description,cover', token, callback);
};

exports.page = function page(pageUid, token, callback) {
  graph(pageUid + '?fields=id,access_token,name,description', token, callback);
};
