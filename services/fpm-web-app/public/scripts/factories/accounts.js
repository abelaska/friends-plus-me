'use strict';

angular.module('accounts', []).factory('accounts', ['Google', '_', 'types', 'states', function(Google, _, types, states) {

  function accountsSortCallback(a, b) {
    return (b && b.name || '').toLowerCase().localeCompare((a && a.name || '').toLowerCase());
  }

  function accountsSortByNameAscCallback(a, b) {
    return (a && a.name || '').toLowerCase().localeCompare((b && b.name || '').toLowerCase());
  }

  function sortAccountsByName(accounts) {
    return accounts.sort(accountsSortByNameAscCallback);
  }

  function groupByCount(list, count) {
    var group = [], groups = [];
    for (var i = 0; i < list.length; i++) {
      group.push(list[i]);
      if ((i + 1) % count === 0) {
        groups.push(group);
        group = [];
      }
    }
    if (group.length > 0) {
      groups.push(group);
    }
    return groups;
  }

  function list(listedAccounts) {
    var listAccounts = [],
        accounts = listedAccounts || Google.profile.accounts;

    if (accounts && accounts.length) {
      var accountsGroupedByNetwork = _.chain(accounts).sortBy('network').groupBy('network').values().value();
      for (var i = 0; i < accountsGroupedByNetwork.length; i++) {
        accountsGroupedByNetwork[i] = accountsGroupedByNetwork[i].sort(accountsSortCallback).reverse();
        listAccounts = listAccounts.concat(accountsGroupedByNetwork[i]);
      }
    }

    return listAccounts;
  }

  function groupedByState(listedAccounts, statesOrder) {
    var listAccounts = [],
        accounts = listedAccounts || Google.profile.accounts;

    statesOrder = statesOrder || [
      states.account.reconnectRequired.code,
      states.account.enabled.code,
      states.account.disabled.code,
      states.account.blocked.code
    ];

    if (accounts && accounts.length) {
      var result = _.groupBy(accounts, 'state');
      listAccounts = statesOrder.map(function(state) {
        return {
          state: state,
          accounts: result[state] && sortAccountsByName(result[state]) || []
        };
      }).filter(function(s) {
        return s.accounts.length;
      });
    }
    return listAccounts;
  }

  function groupedByCount(count) {
    var net, cnt,
        groupedAccounts = [],
        accounts = Google.profile.accounts;

    if (accounts && accounts.length) {
      var accountsGroupedByNetwork = _.chain(accounts).sortBy('network').groupBy('network').values().value();
      for (var i = 0; i < accountsGroupedByNetwork.length; i++) {
        net = accountsGroupedByNetwork[i][0].network;
        cnt = accountsGroupedByNetwork[i].length;
        accountsGroupedByNetwork[i] = accountsGroupedByNetwork[i].sort(accountsSortCallback).reverse();
        if (count) {
          accountsGroupedByNetwork[i] = groupByCount(accountsGroupedByNetwork[i], count);
        }
        groupedAccounts.push({
          name: types.networkName(net),
          network: types.networkTypeName(net),
          count: cnt,
          accounts: accountsGroupedByNetwork[i]
        });
      }
    }

    return groupedAccounts;
  }

  function grouped() {
    return groupedByCount(0);
  }

  function groupedByCountForAllNetworks(listedAccounts) {
    var accountsGroupedByNetwork,
        groupedAccounts = [],
        accounts = listedAccounts || Google.profile.accounts;

    _.chain(types.network).values().each(function(network) {
      accountsGroupedByNetwork = _.where(accounts, {network: network.code});
      accountsGroupedByNetwork = accountsGroupedByNetwork.sort(accountsSortCallback).reverse();
      if (accountsGroupedByNetwork.length) {
        accountsGroupedByNetwork = groupByCount(accountsGroupedByNetwork, accountsGroupedByNetwork.length);
      }
      groupedAccounts.push({
        name: types.networkName(network.code),
        network: types.networkTypeName(network.code),
        count: accountsGroupedByNetwork.length,
        accounts: accountsGroupedByNetwork
      });
    });

    return groupedAccounts;
  }

  // nalezeni dalsiho uctu v groupovane rade
  function next(accountId) {
    var offs,
        l = list();
    for (offs = 0; offs < l.length; offs++) {
      if (l[offs]._id === accountId) {
        break;
      }
    }
    return l[(offs+1)%l.length];
  }

  // nalezeni predchazejiciho uctu v groupovane rade
  function prev(accountId) {
    var offs,
        l = list();
    for (offs = 0; offs < l.length; offs++) {
      if (l[offs]._id === accountId) {
        break;
      }
    }
    return l[--offs < 0 ? l.length-1 : offs];
  }

  return {
    groupedByState: groupedByState,
    groupByCount: groupByCount,
    grouped: grouped,
    groupedByNetwork: list,
    groupedByCount: groupedByCount,
    groupedByCountForAllNetworks: groupedByCountForAllNetworks,
    next: next,
    prev: prev,
    sortAccountsByName: sortAccountsByName
  };
}]);
