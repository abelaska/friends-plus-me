'use strict';

// curl -X POST 'http://localhost:8086/db/fpm-events/users/ui?u=root&p=root' -d '{"readFrom": "^$","writeTo": ".*"}'

angular.module('events', [])
  .provider('Events', function() {

  var Events = ['$http', '_', 'moment', 'enabled', 'url', 'db', 'username', 'password', 'flushInterval', function($http, _, moment, enabled, url, db, username, password, flushInterval) {

    this.enabled = enabled;
    this.url = url;
    this.db = db;
    this.username = username;
    this.password = password;
    this.flushInterval = flushInterval;

    //this.cid = Storage.clientId();
    this.events = [];

    this.push = function(serieName, data, callback) {
      data = data || {};
      data.cid = this.cid;
      //data.time = moment.utc().valueOf();
      //data.sequence_number = this.events.length;

      if (this.enabled) {
        this.events.push({
          name: 'events.'+serieName,
          columns: _.keys(data),
          points: [_.values(data)]
        });
      }

      if (callback) {
        callback();
      }
    }.bind(this);

    this.startFlush = function() {
      setTimeout(this.flush.bind(this), this.flushInterval);
    }.bind(this);

    this.flush = function() {

      if (this.events.length) {

        var events = this.events;

        this.events = [];

        return $http({
          method: 'POST',
          url: this.url+'/db/'+this.db+'/series?u='+this.username+'&p='+this.password,
          data: events,
          ignoreLoadingBar: true
        }).error(function(/*err*/) {
          this.events = this.events.concat(events);
        }.bind(this)).finally(this.startFlush.bind(this));
      } else {
        this.startFlush();
      }
    }.bind(this);

    this.flush();
  }];

  this.$get = ['$injector', function($injector) {
    return $injector.instantiate(Events, {
      enabled: this.enabled,
      url: this.url,
      db: this.db,
      username: this.username,
      password: this.password,
      flushInterval: this.flushInterval||3000
    });
  }];
});