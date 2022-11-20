'use strict';

angular.module('fpmApp')
  .controller('AccountsCtrl', ['$rootScope', '$scope', '$state', 'types', 'Google', function($rootScope, $scope, $state, types, Google) {

    function change(name, params) {
      $scope.currentState = name;
      $scope.currentParams = params;

      var isAccountAid = $state.current.name.indexOf('queues.aid') > -1;
      if (isAccountAid) {
        $scope.account = params.aid && Google.findProfileAccountById(params.aid);
        if (!$scope.account) {
          $state.go('profiles.pid.accounts-add', { pid: Google.profile._id });
        }
      }
    }

    $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams/*, fromState, fromParams*/) {
      change(toState.name, toParams);
    });

    change($state.current.name, $state.params);
  }]);