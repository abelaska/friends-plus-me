/* jshint node: true, esversion: 6 */

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { dbConnect } = require('@fpm/db');
const _ = require('lodash');
const async = require('async');
const Monitor = require('./Monitor');
const gae = require('./gae');

const App = (module.exports = function App(createServicesCallback) {
  require('http').globalAgent.maxSockets = 64 * 1024;
  require('https').globalAgent.maxSockets = 64 * 1024;

  process.on('SIGINT', this.stop.bind(this));
  process.on('SIGTERM', this.stop.bind(this));

  Monitor.setKeyPrefix(config.get('app'));

  if (config.get('app:maxMemory')) {
    setInterval(() => {
      const memMB = process.memoryUsage().rss / 1048576;
      if (memMB > config.get('app:maxMemory')) {
        log.error(`Too big memory consumption (${memMB}MB). Killing application!`);
        this.stop(1);
      }
    }, 15 * 1000);
  }

  this.services = [this.i('ClusterManager')].concat(
    _.isArray(createServicesCallback) ? createServicesCallback : createServicesCallback(this, config, log) || []
  );

  const self = this;

  dbConnect().then(db => {
    db.on('error', err => {
      log.error('Mongoose error, killing application', { error: err });
      self.stop(-1);
    });

    if (self.services.length > 0) {
      self.start();
    }
  });

  return this;
});

App.prototype.registerServices = function (services) {
  this.services = services || [];
  return this;
};

App.prototype.i = function () {
  let args = [].slice.call(arguments),
    cls = require(`./${args.shift()}`),
    newCls = Object.create(cls.prototype);
  return cls.apply(newCls, args);
};

App.prototype.start = function () {
  this.services.forEach(service => {
    service.start();
  });
  return this;
};

App.prototype.stop = function (exitCode) {
  log.info('Stopping application...');

  if (exitCode === undefined) {
    exitCode = 0;
  }

  if (exitCode !== 0) {
    setTimeout(() => {
      log.info('Killing application!');
      process.kill(process.pid, 'SIGKILL');
    }, 30000);
  }

  async.eachLimit(
    this.services || [],
    3,
    (service, cb) => {
      service.stop(cb);
    },
    err => {
      setTimeout(() => {
        log.info(`Timeouted exit(${exitCode})!`);
        process.exit(exitCode);
      }, 2000);

      log.info(`Application is stopped, exiting(${exitCode})...`, (err, level, msg, meta) => {
        process.exit(exitCode);
      });
    }
  );

  return this;
};
