'use strict';

angular.module('fpmApp')
  .controller('AdminSaaSCtrl', ['$rootScope', '$scope', 'flash', 'Google', '_', function($rootScope, $scope, flash, Google, _) {

    function formatterCurrency(val) {
      return '$'+Math.round(val/10)/10;
    }

    function formatterPercent(val) {
      return val+'%';
    }

    $scope.Google = Google;
    $rootScope.bodyClass = 'admin';
    $scope.months = null;
    $scope.columns = [
      {key: 'month',  name: 'Month', title: 'Month'},
      {key: 'mmr',  name: 'MMR', title: 'Monthly Recurring Revenue', formatter:formatterCurrency},
      {key: 'ac',   name: 'Cus', title: 'Active Customers'},
      {key: 'arpu', name: 'ARPU', title: 'Average Revenue Per User', formatter:formatterCurrency},
      {key: 'arr',  name: 'ARR', title: 'Annual Run Rate', formatter:formatterCurrency},
      {key: 'ltv',  name: 'LTV', title: 'Lifetime Value', formatter:formatterCurrency},
      {key: 'uc',   name: 'Chur', title: 'User Churn', formatter:formatterPercent},
      {key: 'rc',   name: 'RChu', title: 'Revenue Churn', formatter:formatterPercent},
      {key: 'mrl',  name: 'MRL', title: 'Monthly Revenue Loss', formatter:formatterCurrency},
      {key: 'mrg',  name: 'MRG', title: 'Monthly Revenue Gain', formatter:formatterCurrency},
      {key: 'prepay', name: 'Pre', title: 'Prepay', formatter:formatterCurrency},
      {key: 'vat',  title: 'VAT', formatter:formatterCurrency},
      {key: 'fees', title: 'Fees', formatter:formatterCurrency},
      {key: 'refunds', name: 'Refs', title: 'Refunds', formatter:formatterCurrency},
      {key: 'revenue', name: 'Rev', title: 'Revenue', formatter:formatterCurrency},
      {key: 'profit', name: 'Prof', title: 'Revenue-Vat-Fees-Refund', formatter:formatterCurrency},
      {key: 'cancelations', name: 'Cans', title: 'Cancelations'},
      {key: 'downgrades', name: 'Downs', title: 'Downgrades'},
      {key: 'upgrades', name: 'Ups', title: 'Upgrades'}
    ];

    $scope.colName = function(col) {
      return col.name || col.title;
    };

    $scope.colValue = function(month, col) {
      var val = month[col.key];
      if (col.formatter) {
        return col.formatter(val);
      }
      return val;
    };

    Google.saas(function(err, data) {
      if (data) {
        $scope.months = data.system.reverse();
        $scope.pricingPlans = data.pricingPlans;

        if (data.plans) {
          var plans = [];
          _.keys(data.plans).forEach(function(key) {
            data.plans[key].metrics.reverse();
            plans.push(data.plans[key]);
          });
          plans = _.sortBy(plans, function(plan) {
            return -plan.metrics[0].mmr-1000000*(data.pricingPlans[plan.plan].available?1:0);
          });
          $scope.plans = plans;
        }
      }
    });
  }]);
