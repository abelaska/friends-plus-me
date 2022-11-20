'use strict';

angular.module('$apply', []).factory('$apply', ['_', function(_) {

  // http://davidburgosonline.com/dev/2014/correctly-fix-angularjs-error-digest-already-in-progress/

  return function apply(scope, callback) {
    _.defer(function(){
      if (!scope.$$phase) {
        scope.$apply(callback);
      } else if (callback) {
        callback();
      }
    });
  };
}]);