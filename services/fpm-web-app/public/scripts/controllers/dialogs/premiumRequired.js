'use strict';

angular.module('fpmApp')
  .controller('PremiumRequiredCtrl', ['$scope', '$state', '$mdDialog', 'Events', 'featureName', 'upgradeStateId', 'upgradeStateParams', 'lines', function($scope, $state, $mdDialog, Events, featureName, upgradeStateId, upgradeStateParams, lines) {

    Events.push('show-premium-dialog', {feature: featureName});

    $scope.lines = lines || [];

    $scope.cancel = function() { $mdDialog.cancel(); };

    $scope.upgrade = function() {
      Events.push('accept-premium-dialog', {feature: featureName});
      $mdDialog.hide();
      if (upgradeStateId) {
        $state.go(upgradeStateId, upgradeStateParams);
      }
    };
  }]);