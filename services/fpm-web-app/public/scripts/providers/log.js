'use strict';

angular.module('log', []).provider('Log', function() {

  var Log = ['le', 'token', 'isDebug', function(le, token, isDebug) {

    this.token = token;
    this.isDebug = isDebug;

    le.init(this.token);

    this.warn = function() {
      if (this.isDebug) {
        console.log('WARN',arguments);
      }
      le.warn.apply(le, arguments);
    }.bind(this);

    this.error = function() {
      if (this.isDebug) {
        console.log('ERROR',arguments);
      }
      le.error.apply(le, arguments);
    }.bind(this);

    this.info = function() {
      if (this.isDebug) {
        console.log('INFO',arguments);
      }
      le.info.apply(le, arguments);
    }.bind(this);

    this.debug = function() {
      if (this.isDebug) {
        console.log('DEBUG',arguments);
      }
    }.bind(this);
  }];

  this.$get = ['$injector', function($injector) {
    return $injector.instantiate(Log, {
      token: this.token,
      isDebug: this.debug
    });
  }];
});