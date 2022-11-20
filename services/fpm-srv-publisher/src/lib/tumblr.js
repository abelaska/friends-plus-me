/* jshint node: true, esversion: 6 */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const qs = require('querystring');
const Agents = require('./Agents');
const request = require('request').defaults({pool: Agents('tumblr')});

exports.post = function(account, data, callback, timeout) {

  var tm = new Date();

  request.post({
    url: 'https://api.tumblr.com/v2/blog/'+account.uid+'.tumblr.com/post',
    form: data,
    json: true,
    timeout: timeout || config.get('tumblr:timeout') || config.get('defaults:network:timeout'),
    headers: {
      'Accept': '*/*',
      'User-Agent': 'FriendsPlusMe/'+config.get('version')
    },
    oauth: {
      consumer_key: config.get('tumblr:consumerKey'),
      consumer_secret: config.get('tumblr:consumerSecret'),
      token: account.token,
      token_secret: account.secret
  }}, function (error, rsp, data) {

    tm = new Date() - tm;

    if (rsp && (rsp.statusCode === 200 || rsp.statusCode === 201)) {
      callback(null, data, tm);
    } else {
      callback({
        statusCode: rsp ? rsp.statusCode : null,
        errors: data && data.response ? (data.response.errors || data.response) : []
      }, null, tm);
    }
  });
};