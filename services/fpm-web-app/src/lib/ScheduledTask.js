/* jshint node: true */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const ScheduledTaskModel = require('@fpm/db').ScheduledTask;
const moment = require('moment');
const uuid = require('uuid');
const { CronJob } = require('cron');

var ScheduledTask = module.exports = function ScheduledTask(name) {

  this.name = name;
  this.id = config.get('instance-id')+'-'+uuid.v4();
  this.config = config.get('tasks:'+name);

  return this;
};

ScheduledTask.prototype.start = function(runNow, callback) {

  this.cron = new CronJob(this.config.cron, this._process.bind(this), function() {

    if (this.stopCallback) {

      log.info('Stopped scheduled task ' + this.name);

      this.stopCallback();
    }
  }.bind(this), true, 'UTC', this);

  this._init(function(err) {
    if (err && callback) {
      callback(err);
    } else {
      if (runNow) {
        this._process(callback);
      } else {
        if (callback) {
          callback();
        }
      }
    }
  }.bind(this));
};

ScheduledTask.prototype.stop = function(callback) {

  log.info('Stopping scheduled task ' + this.name);

  this.stopCallback = callback;

  if (this.cron) {
    this.cron.stop();
  } else
  if (callback) {
    callback();
  }
};

// callback(err, initialized)
ScheduledTask.prototype._init = function(callback) {

  var now = new Date();

  ScheduledTaskModel.findOneAndUpdate({
    name: this.name
  }, {
    $setOnInsert: {
      lockedUntil: now,
      nextAt: this.cron.cronTime.sendAt()
    }
  }, {
    'new': true,
    upsert: true
  }, callback);
};

// callback(err, finished)
ScheduledTask.prototype._finished = function(callback) {

  var now = new Date();

  ScheduledTaskModel.update({
    name: this.name,
    worker: this.id
  }, {
    lockedUntil: now,
    nextAt: this.cron.cronTime.sendAt(),
    finishedAt: now
  }, callback);
};

// callback(err, locked)
ScheduledTask.prototype._lock = function(callback) {
  if (this.config.lock.enabled) {

    var now = moment.utc();

    ScheduledTaskModel.findOneAndUpdate({
      name: this.name,
      lockedUntil: { $lt: now.toDate() }
    }, {
      worker: this.id,
      startedAt: now.toDate(),
      finishedAt: null,
      lockedUntil: now.clone().add(this.config.lock.timeoutSecs, 'seconds').toDate()
    }, {
      'new': true
    }, callback);
  } else {
    if (callback) {
      callback(null, true);
    }
  }
};

ScheduledTask.prototype._process = function(callback) {

  log.debug('Processing scheduled task ' + this.name);

  this._lock(function(err, lockAcquired) {
    if (err && callback) {
      callback(err);
    } else
    if (lockAcquired) {

      log.debug('Running scheduled task ' + this.name);

      try {
        this.run(function(err, data) {
          if (err && callback) {
            callback(err);
          } else {

            log.debug('Finishing scheduled task ' + this.name);

            this._finished(function(err/*, finished*/) {
              if (err && callback) {
                callback(err);
              } else {
                if (callback) {
                  callback(null, data);
                }
              }
            }.bind(this));
          }
        }.bind(this));
      } catch(e) {
        if (callback) {
          callback(e);
        }
      }
    } else {

      log.debug('Skipping scheduled task ' + this.name+', lock is not released yet');

      if (callback) {
        callback();
      }
    }
  }.bind(this));
};

ScheduledTask.prototype.run = function(/*callback*/) {
  throw new Error(this.name + ' function not implemented');
};
