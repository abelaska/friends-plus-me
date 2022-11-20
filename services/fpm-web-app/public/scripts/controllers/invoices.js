'use strict';

angular.module('fpmApp')
  .controller('InvoicesCtrl', ['$rootScope', '$scope', '$q', '$window', '$apply', 'flash', 'moment', 'Google', function($rootScope, $scope, $q, $window, $apply, flash, moment, Google) {

    $scope.Google = Google;
    $scope.loading = true;
    $scope.transactions = [];

    function priceToString(fixedPrice) {
      return '$'+(Math.abs(fixedPrice) / 100);
    }

    $scope.transactionPrice = function(t) {
      return priceToString(t.amount);
    };

    $scope.transactionDesc = function(t) {
      var discount,
          refund = 0;

      if (t.coupon && t.coupon.discount) {
        discount = ' (Discount '+priceToString(t.coupon.discount)+')';
      }

      if (t.refunds && t.refunds.length) {
        for (var i = 0; i < t.refunds.length; i++) {
          refund += t.refunds[i].amount;
        }
        if (refund) {
          refund = '<strong>(REFUNDED '+priceToString(refund)+')</strong> ';
        }
      }

      return (refund ? refund : '') + t.desc + (discount ? discount : '');
    };

    $scope.transactionDate = function(t) {
      return moment.utc(t.tm).local().format('YYYY-MM-DD');
    };

    $scope.showDiscount = function(t) {
      return t.coupon && t.coupon.discount;
    };

    $scope.load = function() {

      $scope.loading = true;

      Google.profileTransactions(function(err, result) {

        var txs = result || [];

        txs.reverse();

        $scope.loading = false;
        $scope.transactions = txs;

        $apply($scope);
      });
    };

    $scope.load();
  }]);
