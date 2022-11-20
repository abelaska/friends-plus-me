'use strict';

angular.module('fpmApp')
  .controller('AccountReconnectCtrl', ['$rootScope', '$scope', '$state', 'states', 'types', 'Google', 'dialogs', 'Auth', function($rootScope, $scope, $state, states, types, Google, dialogs, Auth) {

    // https://developers.google.com/identity/protocols/OAuth2WebServer

    if (!$scope.account) {
      return;
    }

    if ($scope.account.network === types.network.instagram.code) {
      return $state.go('profiles.pid.accounts-add-network-reconnect', { pid: Google.profile._id, network: 'instagram', reconnectAccount: $scope.account._id });
    }

    $scope.Google = Google;
    $scope.profile = Google.profile;
    $scope.isDisabled = $scope.account.state === states.account.blocked.code;

    $scope.reconnect = function() {
      if ($scope.account.state === states.account.blocked.code) {
        dialogs.premiumRequired({
          lines: function() {
            return [
              'It\'s great to see that you want to unblock this queue, you\'ll have to remove some other queue to unblock this one.',
              '<strong>You can upgrade to unblock all queues immediately.</strong>'
            ];
          },
          featureName: function() {return 'unblock-queue';}
        });
        return;
      }

      Auth.show($scope.account, function() {
        var isGoogle = $scope.account.network === types.network.google.code;
        var isProfileOrPage = $scope.account.account === types.account.profile.code || $scope.account.account === types.account.page.code;
        $scope.account.state = Google.findProfileAccountById($scope.account._id).state;
      });
    };
  }]);
