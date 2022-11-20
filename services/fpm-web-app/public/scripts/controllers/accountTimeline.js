'use strict';

angular.module('fpmApp')
  .controller('AccountTimelineCtrl', ['$scope', 'Google', function($scope, Google) {
    $scope.Google = Google;
    $scope.profile = Google.profile;
  }]);