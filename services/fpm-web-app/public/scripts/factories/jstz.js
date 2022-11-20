'use strict';

angular.module('jstz', []).factory('jstz', ['$window', function($window) {
  return $window.jstz;
}]);