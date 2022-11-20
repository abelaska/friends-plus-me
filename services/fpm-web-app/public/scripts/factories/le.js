'use strict';

angular.module('le', []).factory('le', ['$window', function($window) {
  return $window.LE;
}]);