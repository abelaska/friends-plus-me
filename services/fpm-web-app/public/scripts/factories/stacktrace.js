'use strict';

angular.module('stacktrace', []).factory('stacktrace', ['$window', function($window) {
  return {
    print: $window.printStackTrace
  };
}]);