'use strict';

angular.module('async', []).factory('async', ['$window', function($window) {
  return $window.async;
}]);