'use strict';

angular.module('fpmApp')
  .controller('CancelSubscriptionCtrl', ['$rootScope', '$scope', '$mdDialog', '$window', '$apply', '$state', 'Google', 'flash', 'config', function($rootScope, $scope, $mdDialog, $window, $apply, $state, Google, flash, config) {

    $scope.downgrading = false;

    var subscription = Google.profile.subscription;

    function isPayPal() {
      return subscription && subscription.gw === 'PAYPAL' ? true : false;
    }

    function isBraintree() {
      return subscription && subscription.gw === 'BRAINTREE' ? true : false;
    }

    $scope.isDowngradePossible = function() {
      return Google.isSubscribed() && (isPayPal() || isBraintree());
    };

    $scope.downgrade = function(/*reason1, reason2, reason3*/) {

      $scope.downgrading = true;

      $apply($scope);

      if (isBraintree()) {

        Google.braintreeSubscribe({
            plan: 'FREE',
            interval: 'MONTH'
          }, function(err, data) {

            $scope.downgrading = false;

            $mdDialog.hide();

            if (err) {
              flash.error('Subscription downgrade', data && data.error && data.error.message ? data.error.message : 'Uknown error');
            } else {

              Google.profile.use = data.use;
              Google.profile.plan = data.plan;
              Google.profile.subscription = data.subscription;
              Google.profile.accounts = data.accounts;

              $rootScope.$broadcast('accounts:refresh');
            }

            $state.go('profiles.pid.queue', { pid: Google.profile._id });
          });
      } else
      if (isPayPal()) {
        $window.location.href = 'https://'+config.paypal.env+'.paypal.com/cgi-bin/webscr?cmd=_subscr-find&alias='+config.paypal.merchantId;
      }
    };

    $scope.answered = function(reason1, reason2) {
      if (reason1 === 'not_using_enough') {
        return reason2 ? true : false;
      }
      return reason1 ? true : false;
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };
  }]);
