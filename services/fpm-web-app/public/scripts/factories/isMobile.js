'use strict';

angular.module('$isMobile', []).factory('$isMobile', ['$window', function($window) {
  // https://coderwall.com/p/i817wa/one-line-function-to-detect-mobile-devices-with-javascript
  var isMobile = (typeof $window.orientation !== 'undefined') || ($window.navigator && $window.navigator.userAgent && $window.navigator.userAgent.indexOf('IEMobile') !== -1);
  return isMobile;
}]);