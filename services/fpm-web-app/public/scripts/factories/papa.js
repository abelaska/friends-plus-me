'use strict';

angular.module('papa', []).factory('papa', ['$window', function($window) {
  return $window.Papa;
}]);