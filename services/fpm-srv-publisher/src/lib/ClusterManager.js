/* jshint node: true, esversion: 6 */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { dbNotUpdated, dbUpdatedCount, ClusterNode } = require('@fpm/db');
const cronJob = require('cron').CronJob;

var ClusterManager = module.exports = function ClusterManager() {
  return this;
};

ClusterManager.prototype.start = function() {
  this.notifyCron = new cronJob(config.get('cluster:notifier:notifyCron'), function () {
    ClusterNode.notify();
  }.bind(this), function(){}, true, 'UTC', this);

  this.clearCron = new cronJob(config.get('cluster:notifier:clearCron'), function () {
    ClusterNode.clear();
  }.bind(this), function(){}, true, 'UTC', this);
};

ClusterManager.prototype.stop = function(callback) {

  log.info('Stopping ClusterManager...');

  if (this.notifyCron) {
    this.notifyCron.stop();
  }
  if (this.clearCron) {
    this.clearCron.stop();
  }

  log.info('Stopped ClusterManager...');

  if (callback) {
    callback();
  }
};