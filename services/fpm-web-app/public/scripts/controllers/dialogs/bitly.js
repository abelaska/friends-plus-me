/*jshint -W106*/
'use strict';

angular.module('fpmApp')
  .controller('BitlyCtrl', ['$scope', '$window', '$state', '$mdDialog', 'Google', 'config', '_', 'urls', function($scope, $window, $state, $mdDialog, Google, config, _, urls) {

    var account = Google.findProfileAccountById($state.params.aid);
    if (!account) {
      $mdDialog.cancel();
      return $state.go('profiles.pid.queues.aid.shortening', $state.params);
    }

    $scope.connect = function(connectToAllAccounts) {
      $window.location.href = urls.urlParams(config.api.url+config.api.ops.bitly[connectToAllAccounts ? 'authProfile' : 'authAccount'], {
        profile: Google.profile._id,
        account: account._id
      }, {
        r: config.web.app+'?url=/teams/'+Google.profile._id+'/queues/'+account._id+'/shortening'
      });
    };

    $scope.cancel = function(/*result*/) {
      $mdDialog.cancel();
    };
  }]);