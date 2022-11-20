'use strict';

angular.module('$initialState', []).factory('$initialState', ['$window', function($window) {
  return $window.__initialState || JSON.parse(document.body.getAttribute('initial-state'));
}]);
