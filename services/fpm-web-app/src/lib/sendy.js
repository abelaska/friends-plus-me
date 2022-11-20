/* jshint node: true */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const _ = require('underscore');
const request = require('request').defaults({ pool: { maxSockets: Infinity } });

const isEnabled = config.get('sendy:enabled');

exports.subscribe = function subscribe(user, list, data, callback) {
  var listName = list+(data && data.listName ? ' ('+data.listName+')' : '');
  if (isEnabled) {
    var tm = new Date(),
        form = _.defaults(data||{}, {
          list: list,
          email: user.email,
          name: user.name,
          FirstName: user.fname,
          LastName: user.lname,
          Locale: user.locale,
          'boolean': true
        });
    request({
      method: 'POST',
      url: config.get('sendy:subscribeUrl'),
      encoding: 'utf-8',
      timeout: config.get('sendy:timeout') || config.get('defaultTimeout'),
      headers: {
        'Accept': '*/*',
        'User-Agent': 'fpm-frontend/'+config.get('version')
      },
      form: form
    }, function(err, rsp, body) {

      tm = new Date() - tm;

      if (rsp && (rsp.statusCode === 200 || rsp.statusCode === 201)) {
        log.info('Sendy newsletter '+listName+' subscribed to '+user.email, {
          time: tm,
          statusCode: (rsp?rsp.statusCode:null),
          body: body});
        if (callback) {
          callback();
        }
      } else {
        log.error('Failed to subscribe Sendy newsletter '+listName+' to '+user.email, {
          time: tm,
          statusCode: (rsp?rsp.statusCode:null),
          error: body});
        if (callback) {
          callback(err || body || new Error('Failed to subscribe Sendy newsletter '+listName+' for '+user.email));
        }
      }
    });
  } else {
    log.debug('Skipping subscribe of '+user.email+' to Sendy newsletter '+listName);
    if (callback) {
      callback();
    }
  }
};

exports.unsubscribe = function unsubscribe(user, list, data, callback) {
  var listName = list+(data && data.listName ? ' ('+data.listName+')' : '');
  if (isEnabled) {
    var tm = new Date(),
        form = _.defaults(data||{}, {
          list: list,
          email: user.email,
          'boolean': true
        });
    request({
      method: 'POST',
      url: config.get('sendy:unsubscribeUrl'),
      encoding: 'utf-8',
      timeout: config.get('sendy:timeout') || config.get('defaultTimeout'),
      headers: {
        'Accept': '*/*',
        'User-Agent': 'fpm-frontend/'+config.get('version')
      },
      form: form
    }, function(err, rsp, body) {

      tm = new Date() - tm;

      if (rsp && (rsp.statusCode === 200 || rsp.statusCode === 201)) {
        log.info('Sendy newsletter '+listName+' unsubscribed for '+user.email, {
          time: tm,
          statusCode: (rsp?rsp.statusCode:null)});
        if (callback) {
          callback();
        }
      } else {
        log.error('Failed to unsubscribe Sendy newsletter '+listName+' for '+user.email, {
          time: tm,
          statusCode: (rsp?rsp.statusCode:null),
          error: body});
        if (callback) {
          callback(err || body || new Error('Failed to unsubscribe Sendy newsletter '+listName+' for '+user.email));
        }
      }
    });
  } else {
    log.debug('Skipping unsubscribe of '+user.email+' from Sendy newsletter '+listName);
    if (callback) {
      callback();
    }
  }
};

exports.remove = function remove(user, list, data, callback) {
  var listName = list+(data && data.listName ? ' ('+data.listName+')' : '');
  if (isEnabled) {
    var tm = new Date(),
        form = _.defaults(data||{}, {
          list: list,
          email: user.email,
          'boolean': true
        });
    request({
      method: 'POST',
      url: config.get('sendy:removeUrl'),
      encoding: 'utf-8',
      timeout: config.get('sendy:timeout') || config.get('defaultTimeout'),
      headers: {
        'Accept': '*/*',
        'User-Agent': 'fpm-frontend/'+config.get('version')
      },
      form: form
    }, function(err, rsp, body) {

      tm = new Date() - tm;

      if (rsp && (rsp.statusCode === 200 || rsp.statusCode === 201)) {
        log.info('Remove user '+user.email+' from Sendy newsletter '+listName, {
          time: tm,
          statusCode: (rsp?rsp.statusCode:null)});
        if (callback) {
          callback();
        }
      } else {
        log.error('Failed to remove user '+user.email+' from Sendy newsletter '+listName, {
          time: tm,
          statusCode: (rsp?rsp.statusCode:null),
          error: body});
        if (callback) {
          callback(err || body || new Error('Failed to remove user '+user.email+' from Sendy newsletter '+listName));
        }
      }
    });
  } else {
    log.debug('Skipping removal of user '+user.email+' from Sendy newsletter '+listName);
    if (callback) {
      callback();
    }
  }
};

/*subscribe({
  email: 'ab@gmail.com',
  name: 'Alois Bělaška',
  fname: 'Alois',
  lname: 'Bělaška'
}, '0gLJRrfXolIq4Hz7x0FPmg', {
  Last4: '1234',
  Plan: 'STANDARD'
});*/
