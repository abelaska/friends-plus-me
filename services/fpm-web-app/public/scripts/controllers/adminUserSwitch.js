/*jshint -W106*/
'use strict';

angular.module('fpmApp').controller('AdminUserSwitchCtrl', ['$rootScope', '$scope', '$state', '$window', 'flash', 'Google', 'S', function($rootScope, $scope, $state, $window, flash, Google, S) {
    $scope.Google = Google;
    $scope.filter = {};
    $rootScope.bodyClass = 'admin';

    var autoSwitch = false, paramType = $state.params.type, paramValue = S($state.params.value || '').trim().s;

    if (paramType === 'email' && paramValue) {
      $scope.filter.email = paramValue;
      autoSwitch = true;
    } else if (paramType === 'id' && paramValue) {
      $scope.filter._id = paramValue;
      autoSwitch = true;
    } else if (paramType === 'pid' && paramValue) {
      $scope.filter.p_id = paramValue;
      autoSwitch = true;
    } else if (paramType === 'actorid' && paramValue) {
      $scope.filter.actorId = paramValue;
      autoSwitch = true;
    }

    $scope.switch = function() {
      var idRegEx = /ObjectId\(\"([0-9a-fA-F]+)\"\)/, actorIdRegEx = /https:\/\/plus\.google\.com\/(.*\/)?([0-9]+)$/;

      if ($scope.filter._id && idRegEx.test($scope.filter._id)) {
        $scope.filter._id = $scope.filter._id.match(idRegEx)[1];
      }

      if ($scope.filter.pid && idRegEx.test($scope.filter.pid)) {
        $scope.filter.pid = $scope.filter.pid.match(idRegEx)[1];
      }

      if ($scope.filter.actorId && actorIdRegEx.test($scope.filter.actorId)) {
        $scope.filter.actorId = $scope.filter.actorId.match(actorIdRegEx)[2];
      }

      if (!$scope.filter.actorId) {
        $scope.filter.actorId = undefined;
      }
      if (!$scope.filter._id) {
        $scope.filter._id = undefined;
      }
      if (!$scope.filter.pid) {
        $scope.filter.pid = undefined;
      }
      if (!$scope.filter.email) {
        $scope.filter.email = undefined;
      }

      Google.switchUser($scope.filter).then(function(data) {
        if (data && data.url) {
          $window.location = data.url;
        }
      }, function(data) {
        flash.pop({ title: 'Switch User', body: 'Failed to switch user. ' + data.data, type: 'error' });
      });
    };

    if (autoSwitch) {
      $scope.switch();
    }
  }
]);
