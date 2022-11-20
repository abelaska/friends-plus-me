/*jshint -W106*/
'use strict';

angular.module('fpmApp')
  .controller('ProfileDowngradeSuccessCtrl', ['$scope', 'Google', function($scope, Google) {
    $scope.Google = Google;
  }]);