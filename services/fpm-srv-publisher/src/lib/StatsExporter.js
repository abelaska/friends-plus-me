/* jshint node: true, esversion: 6 */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const _ = require('underscore');
const express = require('express');
const Monitor = require('./Monitor');

const isNumericRegExp = /^[0-9]+$/;

var StatsExporter = module.exports = function StatsExporter() {
  return this;
};

StatsExporter.prototype.start = function() {
  if (config.get('stats:enabled')) {

    this.app = express();
    this.app.configure(function() {
      // only for POSTs: app.use(express.bodyParser());
    }.bind(this));

    this.app.configure('development', function() {
      this.app.use(express.logger('dev'));
    }.bind(this));

    this.app.configure('production', function() {
    });

    this.app.configure(function(){
      this.app.use(this.app.router);
    }.bind(this));

    this.app.get('/', this.getStat.bind(this));

    var bindAddress = config.get('stats:http:bind') || 'localhost';
    this.app.listen(config.get('stats:http:port'), bindAddress, function() {
      log.info('Stats HTTP server listening on '+bindAddress+':'+config.get('stats:http:port'));
    });
  }
};

StatsExporter.prototype.stop = function(callback) {
  if (callback) {
    callback();
  }
};

StatsExporter.prototype._getStat = function(callback) {

  var tm = new Date(),
      metrics = {
        'memory:used': Math.round(process.memoryUsage().rss / 1048576)
      };

  Monitor.getAll([
    'scheduler:gplus:fetch:activities',
    'scheduler:gplus:fetch:timeouts',
    'scheduler:gplus:refresh:accounts',
    'scheduler:gplus:refresh:timeouts',
    'scheduler:reposts:enqueued',
    'reposter:reposts:dequeued',
    'reposter:reposts:completed',
    'reposter:reposts:failed',
    'reposter:reposts:facebook:dequeued',
    'reposter:reposts:facebook:completed',
    'reposter:reposts:facebook:failed',
    'reposter:reposts:twitter:dequeued',
    'reposter:reposts:twitter:completed',
    'reposter:reposts:twitter:failed',
    'reposter:reposts:linkedin:dequeued',
    'reposter:reposts:linkedin:completed',
    'reposter:reposts:linkedin:failed',
    'reposter:reposts:tumblr:dequeued',
    'reposter:reposts:tumblr:completed',
    'reposter:reposts:tumblr:failed',
    'reposter:posts:dequeued',
    'reposter:posts:completed',
    'reposter:posts:failed'
  ]).then(function(loadedMetrics) {

    metrics = _.extend(metrics, loadedMetrics);

    _.keys(metrics).forEach(function(key) {
      if (isNumericRegExp.test(metrics[key])) {
        metrics[key] = parseInt(metrics[key]);
      }
    });

    if (this.oldMetrics) {

      var oldValue, key, j,
          oldPairs = _.pairs(this.oldMetrics),
          newPairs = _.pairs(metrics);

      this.oldMetrics = _.clone(metrics);

      for (var i = 0; i < newPairs.length; i++) {
        if (!isNaN(newPairs[i][1])) {
          key = newPairs[i][0];
          oldValue = 0;

          for (j = 0; j < oldPairs.length; j++) {
            if (oldPairs[j][0] === key) {
              oldValue = oldPairs[j][1];
              break;
            }
          }

          metrics[key+':diff'] = newPairs[i][1] - oldValue;
        }
      }
    } else {
      this.oldMetrics = _.clone(metrics);
    }

    metrics.tm = new Date() - tm;

    callback(null, metrics);
  }.bind(this)).catch(function(error) {

    log.error('Failed to fetch metrics from database', {
      error: error});

    callback(null, metrics);
  });
};

StatsExporter.prototype.getStat = function(req, res) {
  this._getStat(function(error, metrics) {
    res.json(metrics);
  });
};