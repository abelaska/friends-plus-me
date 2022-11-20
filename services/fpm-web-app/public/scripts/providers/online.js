'use strict';
/*jshint -W106*/

angular.module('online', []).provider('Online', function() {
  var Online = ['$rootScope', '$window', function($rootScope, $window) {
    this.is = function() {
      return navigator.onLine;
    }.bind(this);

    this.isNot = function() {
      return !this.is();
    }.bind(this);

    this.update = function() {
      $rootScope.$broadcast('online', this.is());
    }.bind(this);

    $window.addEventListener('online',  this.update);
    $window.addEventListener('offline',  this.update);
  }];

  this.$get = ['$injector', function($injector) {
    return $injector.instantiate(Online, {});
  }];
});