'use strict';

angular.module('fpmApp')
  .controller('PickAccountPanelCtrl', ['$mdPanel', '$scope', 'types', 'states', 'moment', 'accountsList', 'getRef', 'resolve', function($mdPanel, $scope, types, states, moment, accountsList, getRef, resolve) {

    $scope.types = types;
    $scope.search = '';

    function listAccountsToShow() {
      var search = $scope.search && $scope.search.toLowerCase() || '';
      var showAccounts = accountsList.filter(function(a) {
        return search ? a.name.toLowerCase().indexOf(search) > -1 : true;
      });
      return showAccounts;
    }

    $scope.showAccounts = listAccountsToShow();

    $scope.searchUpdated = function(search) {
      $scope.search = search;
      $scope.showAccounts = listAccountsToShow();
    };

    $scope.accountsLoader = {
      getItemAtIndex: function(index) {
        return $scope.showAccounts && $scope.showAccounts.length > index && $scope.showAccounts[index] || null;
      },
      getLength: function() {
        return $scope.showAccounts && $scope.showAccounts.length || 0;
      }
    };

    $scope.isExpired = function(account) {
      return account.expire ? (moment.utc(account.expire).unix() < moment.utc().unix() ? true : false) : false;
    };

    $scope.accountTypeNameFull = function(account, showFull) {
      var state = account && ($scope.isExpired(account) ? 'Expired' :
            (account.state === states.account.enabled.code ? '' :
              (account.state === states.account.disabled.code ? 'Paused' :
                (account.state === states.account.blocked.code ? 'Blocked' :
                  (account.state === states.account.reconnectRequired.code ? 'Reconnect Required' : '???')))));
      return account && (types.typeNameOfAccount(account) + (showFull ? (state ? ' <strong class="deactivated">'+state+'</strong>' : '') : ''));
    };

    $scope.accountTitle = function(account) {
      return account && ($scope.accountTypeNameFull(account)+' - '+account.name + ' ('+account.uid+')');
    };

    $scope.close = function() {
      var ref = getRef();
      if (ref) {
        ref.close();
      }
    };

    $scope.pickAccount = function(account) {
      $scope.close();
      resolve(account);
    };
  }]);