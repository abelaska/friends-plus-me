/*jshint -W106*/
'use strict';

angular.module('fpmApp')
  .controller('ProfileCCSuccessCtrl', ['$scope', 'Google', function($scope, Google) {
    $scope.Google = Google;
  }]);