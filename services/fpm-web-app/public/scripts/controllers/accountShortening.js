'use strict';

angular.module('fpmApp')
  .controller('AccountShorteningCtrl', ['$rootScope', '$scope', 'dialogs', 'flash', 'Google', 'types', function($rootScope, $scope, dialogs, flash, Google, types) {

    var profile = Google.profile,
        account = $scope.account;

    $scope.Google = Google;
    $scope.profile = profile;
    $scope.isPinterest = account.network === types.network.pinterest.code ? true : false;

    var oldType = account.shortener && account.shortener.type || 'none';

    function restore() {
      account.shortener = account.shortener || {};
      account.shortener.type = oldType;
    }

    $scope.useBitly = function(/*account*/) {
      if (profile.use.bitly) {
        dialogs.bitly(null, null, restore);
      } else {
        dialogs.premiumRequired({
          lines: function() {
            return [
              'It\'s great to see that you want to use Bitly shortener but this feature is not a part of your current plan.',
              'You can upgrade to use <strong>Bitly shortener</strong>.'
            ];
          },
          featureName: function() {return 'connect-bitly';}
        });
      }
    };

    $scope.useGoogl = function(/*account*/) {
      dialogs.googl(null, null, restore);
    };

    $scope.useNone = function(account) {
      Google.profileShortenerAccount(account, {
        type: 'none'
      }, function(err, updated) {
        if (updated) {
          account.shortener.type = 'none';
          flash.success('Link shortener disabled', 'Link shortener was successfully disabled for queue.');
        } else {
          flash.error('Link shortener disabled', 'Failed to disable link shortener for queue. Please try again.');
        }
      });
    };
  }]);