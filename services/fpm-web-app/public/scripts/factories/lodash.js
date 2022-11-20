'use strict';

angular.module('lodash', []).factory('_', ['$window', function($window) {
  return $window._;
}]);