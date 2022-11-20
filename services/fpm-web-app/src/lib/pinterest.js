/*jshint node: true */
'use strict';

const config = require('@fpm/config');
const request = require('request').defaults({ pool: { maxSockets: Infinity } });

exports.listBoards = function listBoards(accessToken, callback, timeout) {
  request.get({
    url: 'https://api.pinterest.com/v1/me/boards/',
    qs: {
      /* jshint -W106 */
      access_token: accessToken,
      fields: 'id,name,url,image'
    },
    timeout: timeout || config.get('pinterest:timeout')  || config.get('defaults:network:timeout'),
    json: true
  }, function (err, rsp, extBody) {
    if (err) {
      callback(err);
    } else
    if (rsp && rsp.statusCode === 200 && extBody) {
      callback(null, extBody);
    } else {
      callback({
        message: 'Failed to fetch Pinterest Boards',
        error: extBody,
        responseCode: (rsp ? rsp.statusCode : null)
      });
    }
  });
};

exports.board = function board(boardId, accessToken, callback, timeout) {
  request.get({
    url: 'https://api.pinterest.com/v1/boards/'+boardId+'/',
    qs: {
      /* jshint -W106 */
      access_token: accessToken,
      fields: 'id,name,url,image'
    },
    timeout: timeout || config.get('pinterest:timeout')  || config.get('defaults:network:timeout'),
    json: true
  }, function (err, rsp, extBody) {
    if (err) {
      callback(err);
    } else
    if (rsp && rsp.statusCode === 200 && extBody) {
      callback(null, extBody);
    } else {
      callback({
        message: 'Failed to fetch Pinterest Board '+boardId,
        error: extBody,
        responseCode: (rsp ? rsp.statusCode : null)
      });
    }
  });
};
