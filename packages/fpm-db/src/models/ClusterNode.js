/*jshint node: true */
'use strict';

import { registerModel, Schema, dbNotUpdated, dbUpdatedCount } from '../db';
import log from '@fpm/logging';
import config from '@fpm/config';
import moment from 'moment';
import uuid from 'uuid';
import async from 'async';

const nid = config.get('instance-id')+'-'+uuid.v4().replace('-','');

var ClusterNode = new Schema({
  nid: String,  // identifikator nodu a instance aplikace
  lastNotify: Date, // cas provedeni posledni notifikace
  state: Number // 0-active, 1-inactive, 2-dead
});

//ClusterNode.set('autoIndex', false);

ClusterNode.index({
  'nid' : 1,
  'lastNotify': 1 // musi byt prvni, protoze se podle tohoto sloupce sortuje
}, { unique: false });

ClusterNode.index({
  'state' : 1,
  'lastNotify': 1 // musi byt prvni, protoze se podle tohoto sloupce sortuje
}, { unique: false });

ClusterNode.static('nid', function() {
  return nid;
});

ClusterNode.static('notify', function(callback, now) {
  this.findOneAndUpdate({
    nid: nid
  }, {
    lastNotify: moment.utc().toDate(),
    state: 0
  }, {
    'new': true,
    upsert:true
  }, callback || function(err, n) {
    if (err) {

      log.error('Failed to persist cluster node notification', {
        nid: nid,
        error: err
      });

      if (err.err === 'not master') {
        // err.code 10054,10056,10058

        log.warn('Killing application!');

        process.kill(process.pid, 'SIGTERM');
      }
    }
  });
});

ClusterNode.static('clear', function(callback, now) {
  var tm = new Date(),
      state1tm = (now || moment.utc()).subtract(config.get('cluster:notifier:state1afterSeconds'), 'seconds'),
      state2tm = state1tm.clone().subtract(config.get('cluster:notifier:state2afterSeconds'), 'seconds'),
      removeAfterTm = state2tm.clone().subtract(config.get('cluster:notifier:removeDeadAfterSeconds'), 'seconds');

  async.parallel([
    function(cb) {
      this.update({state: 0, lastNotify: {$lt: state1tm.toDate()}}, {state: 1}, {multi: true}, function(err, updated) {
        if (err) {
          log.error('Failed to set inactive cluster node notifications to state 1', {
            error: err
          });
        }
        cb(null, err || dbNotUpdated(updated) ? -1 : dbUpdatedCount(updated));
      }.bind(this));
    }.bind(this),
    function(cb) {
      this.update({state: 1, lastNotify: {$lt: state2tm.toDate()}}, {state: 2}, {multi: true}, function(err, updated) {
        if (err) {
          log.error('Failed to set inactive cluster node notifications to state 2', {
            error: err
          });
        }
        cb(null, err || dbNotUpdated(updated) ? -1 : dbUpdatedCount(updated));
      }.bind(this));
    }.bind(this),
    function(cb) {
      this.remove({state: 2, lastNotify: {$lt: removeAfterTm.toDate()}}, function(err) {
        if (err) {
          log.error('Failed to remove dead cluster node notifications', {
            error: err
          });
        }
        cb(null, err ? -1 : 1);
      }.bind(this));
    }.bind(this)
  ], function(err, results) {
    if (callback) {
      callback(err, results);
    }
  }.bind(this));
});

export default registerModel('ClusterNode', ClusterNode);
