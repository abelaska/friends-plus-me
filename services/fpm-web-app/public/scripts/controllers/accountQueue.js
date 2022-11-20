'use strict';

angular.module('fpmApp')
  .controller('AccountQueueCtrl', ['$scope', '$state', 'Google', 'states', function($scope, $state, Google, states) {

    if ($scope.account.state === states.account.blocked.code) {
      return $state.go('profiles.pid.queues.aid.timeline', {aid: $scope.account._id, pid: Google.profile._id});
    }

    $scope.Google = Google;
    $scope.profile = Google.profile;
  }]);
