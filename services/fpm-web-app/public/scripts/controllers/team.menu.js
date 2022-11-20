'use strict';

angular.module('fpmApp')
  .controller('TeamMenuCtrl', ['$rootScope', '$scope', '$state', 'dialogs', 'Google', function($rootScope, $scope, $state, dialogs, Google) {

    $scope.deleteProfile = function() {
      if (Google.isSubscribed()) {
        dialogs.confirm('You have to unsubscribe first',
          'You have subscribed to the '+Google.profile.plan.name+' plan. You have to cancel this team subscription first.',
          'I want to unsubscribe',
          function() {
            dialogs.cancelSubscription();
          });
      } else {
        dialogs.deleteProfile();
      }
    };

    function change(name, params) {
      $scope.currentState = name;
      $scope.currentParams = params;
    }

    $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams/*, fromState, fromParams*/) {
      change(toState.name, toParams);
    });

    change($state.current.name, $state.params);
  }]);