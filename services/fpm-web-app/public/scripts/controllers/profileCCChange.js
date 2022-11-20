/*jshint -W106*/
'use strict';

angular.module('fpmApp')
  .controller('ProfileCCChangeCtrl', ['$rootScope', '$scope', '$q', '$window', '$apply', 'flash', 'Google', 'Braintree', function($rootScope, $scope, $q, $window, $apply, flash, Google, Braintree) {

    $scope.prepared = false;
    $scope.updating = false;
    $scope.updated = false;
    $scope.paymentMethod = null;

    function upgradeCC(paymentMethod) {
      Google.braintreeUpdateCard({
          paymentMethod: paymentMethod
      }, function(err, data) {

        if (err) {
          flash.error('Update Payment Method', err && err.error && err.error.message ? err.error.message : 'Uknown error');
        } else {

          Google.profile.subscription = data.subscription;

          flash.success('Update Payment Method', 'Payment Method Successfully Updated');
        }

        $scope.updating = false;
        $scope.updated = true;

        $apply($scope);
      });
    }

    function enhancePaymentMethod(pm) {
      switch (pm.type) {
      case 'PayPalAccount':
        pm.type = 'paypal';
        break;
      default:
        pm.type = pm.type.toLowerCase();
        break;
      }
      return pm;
    }

    Braintree.autoSetup('dropin-container', function() {
      $scope.prepared = true;
      $apply($scope);
    }, null, function(result) {
      upgradeCC(enhancePaymentMethod(result));
    });
  }]);