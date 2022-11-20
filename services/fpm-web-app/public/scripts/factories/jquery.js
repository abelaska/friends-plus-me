'use strict';

angular.module('jquery', []).factory('$', ['$window', function($window) {
  return $window.$;
}]);