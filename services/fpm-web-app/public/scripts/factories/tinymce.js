'use strict';

angular.module('tinymce', []).factory('tinymce', ['$window', function($window) {
  return $window.tinymce;
}]);