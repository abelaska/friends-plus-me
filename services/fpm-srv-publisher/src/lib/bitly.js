/* jshint node: true, esversion: 6 */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const qs = require('querystring');
const Agents = require('./Agents');
const request = require('request').defaults({pool: Agents('bitly')});

exports.shortenUrl = function(url, token, callback) {
  var tm = new Date();

  request.get({
    url: 'https://api-ssl.bitly.com/v3/shorten?'+qs.stringify({
      access_token: token,
      longUrl: url
    }),
    json: true,
    timeout: config.get('bitly:timeout') || config.get('defaults:network:timeout')
  }, function (error, rsp, data) {

    tm = new Date() - tm;

    if (rsp && (rsp.statusCode === 200)) {
      callback(null, data, tm);
    } else {
      callback({
        statusCode: rsp ? rsp.statusCode : null,
        error: error,
        data: data
      }, null, tm);
    }
  });
};

var shortenUrlExtended = exports.shortenUrlExtended = function shortenUrlExtended(url, token, title, note, callback) {

  var tm = new Date();

  request.get({
    url: 'https://api-ssl.bitly.com/v3/user/link_save?'+qs.stringify({
      access_token: token,
      longUrl: url,
      title: title||undefined,
      note: note||undefined
    }),
    json: true,
    timeout: config.get('bitly:timeout') || config.get('defaults:network:timeout')
  }, function (error, rsp, data) {

    tm = new Date() - tm;

    if (rsp && (rsp.statusCode === 200)) {
      callback(null, data, tm);
    } else {
      callback({
        statusCode: rsp ? rsp.statusCode : null,
        error: error,
        data: data
      }, null, tm);
    }
  });
};