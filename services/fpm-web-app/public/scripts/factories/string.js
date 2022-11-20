'use strict';

angular.module('S', []).factory('S', ['$window', function($window) {
  return $window.S;
}]);