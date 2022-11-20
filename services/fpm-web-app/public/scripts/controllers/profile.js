'use strict';

angular.module('fpmApp')
  .controller('ProfileCtrl', ['$rootScope', '$scope', 'Google', function($rootScope, $scope, Google) {

    $rootScope.bodyClass = 'profile';

    $scope.Google = Google;
    $scope.user = Google.user;
  }]);