'use strict';

angular.module('fpmApp')
  .controller('TeamProfilesCtrl', ['$rootScope', '$scope', '$apply', 'flash', 'dialogs', 'Google', 'Premium', '_', 'states', 'types', function($rootScope, $scope, $apply, flash, dialogs, Google, Premium, _, states, types) {

    $scope.Google = Google;
    // $scope.billableProfilesValue = 0;
    // $scope.monthlyPriceValue = 0;

    // $scope.activeProfiles = function() {
    //   return (Google.profile && Google.profile.profiles && Google.profile.profiles.length) || 0;
    // };

    // $scope.billableProfiles = function() {
    //   return $scope.billableProfilesValue || (Premium.costs && Premium.costs.metrics && Premium.costs.metrics.profile && Premium.costs.metrics.profile.count) || 0;
    // };

    // $scope.dailyPrice = function() {
    //   return '$'+$scope.money(Premium.costs && Premium.costs.metrics && Premium.costs.metrics.profile && Premium.costs.metrics.profile.daily || 0);
    // };

    // $scope.monthlyPrice = function() {
    //   return '$'+($scope.monthlyPriceValue || ($scope.money(Premium.costs && Premium.costs.metrics && Premium.costs.metrics.profile && Premium.costs.metrics.profile.monthly || 0)));
    // };

    // $scope.dt = function(tm) {
    //   return moment.utc(tm).local().format('YYYY-MM-DD');
    // };

    // $scope.fromNow = function(tm) {
    //   return moment.utc(tm).local().fromNow();
    // };

    // $scope.money = function(credit) {
    //   return Math.floor(credit/10000)/100;
    // };

    // $scope.updateBillableProfilesCount = function() {
    //   var plan = Google.profile && Google.profile.plan && Google.profile.plan.name;
    //   if (plan === 'PAYWYUM') {
    //     Google.billableProfilesCount(function(err, data) {
    //       $scope.billableProfilesValue = data && data.count || 0;
    //       $scope.monthlyPriceValue = data && data.amount || 0;
    //     });
    //   }
    // };

    $scope.accountsCount = function(profile) {
      var count = 0;
      for (var i = 0; i < Google.profile.accounts.length; i++) {
        if (Google.profile.accounts[i].socialProfileId === profile._id) {
          count++;
        }
      }
      return count;
    };

    $scope.removeProfile = function(profile) {
      var accounts = $scope.accountsCount(profile);
      var appendText = '';
      if (accounts) {
        appendText = ' and '+accounts+' dependent queue'+(accounts > 1 ? 's' : '');
      }

      dialogs.confirm('Remove Social Account',
        'Please, confirm the removal of '+profile.name+' '+types.typeNameOfAccount(profile)+appendText+'.',
        'Remove Social Account' + appendText,
        function() {
          Google.profileRemoveSocialProfile(profile._id, function(err, removed) {
            if (removed) {
              flash.success('Social Account Removal', 'Social account <strong>'+profile.name+'</strong> was successfully removed.');
              $apply($scope);

              $rootScope.$broadcast('accounts:refresh');

              setTimeout(function() {
                // $scope.updateBillableProfilesCount();
                $apply($scope);
              }, 1000);
            } else {
              flash.error('Social Account Removal', 'Removal of social account <strong>'+profile.name+'</strong> failed. Please try again.');
            }
          });
        });
    };

    // $scope.updateBillableProfilesCount();
  }]);
