/* global angular  */
angular.module('fpmApp')
  .controller('UserCtrl', ['$rootScope', '$scope', '$state', 'moment', 'Google', function ($rootScope, $scope, $state, moment, Google) {
  function change(name, params) {
    $scope.currentState = name;
    $scope.currentParams = params;
  }

  $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams /* , fromState, fromParams */) {
    change(toState.name, toParams);
  });

  $scope.user = Google.user;
  $scope.signedAgo = moment.utc(Google.user.created).fromNow();
  change($state.current.name, $state.params);
}]);
