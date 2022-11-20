'use strict';

angular.module('twttr', []).factory('twttr', ['$window', function($window) {
  return $window.twttr;
}]);