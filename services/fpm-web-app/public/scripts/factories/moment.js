'use strict';

angular.module('moment', []).factory('moment', ['$window', function($window) {
  return $window.moment;
}]);