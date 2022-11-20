/*jshint -W106*/
'use strict';

angular.module('fpmApp')
	.controller('ProfileDowngradeCtrl', ['$scope', '$window', 'dialogs', 'flash', 'config', 'Google', function($scope, $window, dialogs, flash, config, Google) {

    var subscription = Google.profile.subscription;

    $scope.config = config;

    function isPayPal() {
      return subscription && subscription.gw === 'PAYPAL' ? true : false;
    }

    function isBraintree() {
      return subscription && subscription.gw === 'BRAINTREE' ? true : false;
    }

    $scope.isDowngradePossible = function() {
      return Google.isSubscribed() && (isPayPal() || isBraintree());
    };

    $scope.downgrade = function() {
      dialogs.cancelSubscription();
    };
  }]);