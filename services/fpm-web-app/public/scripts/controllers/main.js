'use strict';

angular.module('fpmApp')
  .controller('MainMenuCtrl', ['$rootScope', '$scope', '$state', '$window', '$timeout', '$apply', '$mdSidenav', '$mdDialog', '$cookies', '_', 'Google', 'config', 'moment', 'accounts', 'types', 'states', 'dialogs', 'flash', 'Online', 'Intercom', function($rootScope, $scope, $state, $window, $timeout, $apply, $mdSidenav, $mdDialog, $cookies, _, Google, config, moment, accounts, types, states, dialogs, flash, Online, Intercom) {

    $scope.selectedAccount = function(accountId) {
      var account = accountId && Google.profile && Google.profile.accounts && Google.profile.accounts.filter(function(a) {
        return a._id === accountId;
      }) || [];
      $scope.account = account.length && account[0] || null;
    };

    $scope.Google = Google;
    $scope.isOffline = Online.isNot();
    $scope.menuName = $state.current && $state.current.menu && $state.current.menu.name;
    $scope.profile = Google.profile;
    $scope.account = $scope.selectedAccount($state.params.aid);
    $scope.notificationsCount = 0;
    $scope.search = '';
    // $scope.accounts = accounts.groupedByNetwork();
    // $scope.accountsByState = accounts.groupedByState();

    $scope.creatingProfile = false;

    $scope.extensionAvailable = false;
    $scope.existsFileReader = $window.FileReader ? true : false;

    var pinsCookie = $cookies.getObject('pins') || {};

    $scope.mainMenuPinned = pinsCookie.mm || false;
    $scope.accountsMenuPinned = ((pinsCookie.am === null || pinsCookie.am === undefined) && $window.innerWidth >= 580) || pinsCookie.am || false;

    var lastProfileId;

    function checkForcePinAccountsMenu() {
      var forcePinAccountsMenu = $window.innerWidth >= 580 && Google.profile.accounts.length === 0;
      var forceUnpinAccountsMenu = $window.innerWidth < 580;
      if (forcePinAccountsMenu && !$scope.accountsMenuPinned) {
        $scope.accountsMenuPinned = true;
      }
      if (forceUnpinAccountsMenu && $scope.accountsMenuPinned) {
        $scope.accountsMenuPinned = false;
      }
      if (!forcePinAccountsMenu && !forceUnpinAccountsMenu && $scope.accountsMenuPinned !== pinsCookie.am) {
        $scope.accountsMenuPinned = ((pinsCookie.am === null || pinsCookie.am === undefined) && $window.innerWidth >= 580) || pinsCookie.am || false;
      }
    }

    window.addEventListener('resize', checkForcePinAccountsMenu, true);

    function onProfileUpdated() {
      if (!Google.profile) {
        return;
      }
      $scope.isSubscribed = Google.isSubscribed();
      $scope.isOwner = _.contains(Google.profile.members.owner, Google.user._id);
      $scope.isManager = _.contains(Google.profile.members.manager, Google.user._id);
      $scope.isAccountManager = _.contains(Google.profile.members.amanager, Google.user._id);
      $scope.isContributor = _.contains(Google.profile.members.contributor, Google.user._id);
      $scope.isOwnerOrManager = $scope.isOwner || $scope.isManager;

      checkForcePinAccountsMenu();
    }

    $scope.toggleHelp = function() {
    };

    $scope.canManageAccount = function(account) {
      return account && account.members && account.members.manager ?
        _.contains(account.members.manager, Google.user._id): false;
    };

    $scope.canManagePostAccount = function(post) {
      return $scope.canManageAccount(post.account);
    };

    $scope.isAdmin = function() {
      return Google.user && Google.user.role === 'admin';
    };

    function isSubscribed() {
      return Google.isSubscribed();
    }

    function isSubscriptionGw(gw) {
      return Google.profile && Google.profile.subscription && Google.profile.subscription.gw === gw ? true : false;
    }

    function isPayPal() {
      return isSubscriptionGw('PAYPAL');
    }

    function isBraintree() {
      return isSubscriptionGw('BRAINTREE');
    }

    $scope.isDowngradePossible = function() {
      return isSubscribed() && (isPayPal() || isBraintree());
    };

    $scope.isAnualPrePayPossible = function() {
      var sub = Google.profile && Google.profile.subscription;
      return isBraintree() && isSubscribed() && sub.interval === 'MONTH' && moment.utc(sub.nextPay).diff(moment.utc(), 'months') === 0;
    };

    $scope.isTrial = function () {
      var plan = Google.profile && Google.profile.plan && Google.profile.plan.name;
      return plan && plan === 'TRIAL';
    };

    $scope.isFreeForever = function () {
      var plan = Google.profile && Google.profile.plan && Google.profile.plan.name;
      return plan && plan === 'FREEFOREVER';
    };

    $scope.isFree = function () {
      var plan = Google.profile && Google.profile.plan && Google.profile.plan.name;
      return plan && plan === 'FREE';
    };

    $scope.trialExpirationText = function () {
      var validUntil = Google.profile && Google.profile.plan && Google.profile.plan.validUntil;
      return validUntil && 'Trial expires '+moment.utc(validUntil).fromNow();
    };

    $scope.isPaywyum = function () {
      var plan = Google.profile && Google.profile.plan && Google.profile.plan.name;
      return plan && (plan === 'PAYWYUM' || plan === 'TRIAL');
    };

    $scope.signout = function() {
      Google.signout();
    };

    $scope.queuedPostsCount = function() {
      var count = null,
          accounts = Google.profile && Google.profile.accounts || [];
      if (accounts.length) {
        count = 0;
        for (var i = 0; i < accounts.length; i++) {
          count += accounts[i].queue && accounts[i].queue.size || 0;
        }
      }
      return count;
    };

    ///////////////////////////////////////////////////

    $scope.isGoogle = function(account) {
      return account.network === types.network.google.code;
    };

    $scope.isGooglePage = function(account) {
      return account.network === types.network.google.code && account.account === types.account.page.code ? true : false;
    };

    $scope.isGoogleProfile = function(account) {
      return account.network === types.network.google.code && account.account === types.account.profile.code ? true : false;
    };

    $scope.isGoogleCollection = function(account) {
      return account.network === types.network.google.code && account.account === types.account.collection.code ? true : false;
    };

    $scope.googleChannel = function(account) {
      var parentAccount = account.parentUid && Google.profile && Google.profile.accounts && _.findWhere(Google.profile.accounts, { uid: account.parentUid, network: types.network.google.code });
      var isApi = $scope.isGooglePage(account) || account.publishViaApi || (parentAccount && parentAccount.publishViaApi && $scope.isGoogleCollection(account));
      return isApi ? 'API' : 'Extension';
    };

    $scope.isPublishingAvailable = function(account) {
      return Google.isPublishingAvailable(account);
    };

    $scope.isSchedulingSupported = function(account) {
      return Google.isPublishingAvailable(account);
    };

    $scope.isReconnectVisible = function(account) {
      var isInstagram = account && account.network === types.network.instagram.code,
          isGoogle = account && account.network === types.network.google.code,
          isCommunity = account && account.account === types.account.community.code,
          isCollection = account && account.account === types.account.collection.code;
      return isInstagram || (isGoogle && (isCommunity || isCollection)) ? false : true;
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

    $scope.accountTypeName = function(account, showFull) {
      if (!account) {
        return '';
      }

      var state = (account.state === states.account.enabled.code ? '' :
                  (account.state === states.account.disabled.code ? '' :
                  (account.state === states.account.blocked.code ? 'Blocked' :
                  (account.state === states.account.reconnectRequired.code || $scope.isExpired(account) ? '<a class="deactivated" href="/queues/'+account._id+'/reconnect">Reconnect Required</a>' : '???'))));
      return /*types.typeNameOfAccount(account) +*/ (showFull ? (state ? ' <strong class="deactivated">'+state+'</strong>' : '') : '');
    };

    $scope.accountPreset = function(account) {
      var preset = account && account.preset || null;
      switch (preset) {
        case 'google-growth':
          return 'Grow';
        case 'google-growth-controlled':
          return 'Grow#';
        case 'mirroring':
          return 'Mirror';
        case 'mirroring-controlled':
          return 'Mirror#';
        default:
          return 'Custom';
      }
    };

    $scope.searchUpdated = function(search) {
      $scope.search = search;
    };

    $scope.accountsToShowLoader = {
      getItemAtIndex: function(index) {
        return $scope.accountsToShow && $scope.accountsToShow.length > index && $scope.accountsToShow[index] || null;
      },
      getLength: function() {
        return $scope.accountsToShow && $scope.accountsToShow.length || 0;
      }
    };

    $scope.listAccountsToShow = function(accs) {
      var list = [];
      for (var i = 0; i< accs.length; i++) {
        list.push({
          type: 'group',
          name: $scope.accounsInStateTitle(accs[i].state),
          accountsCount: accs[i].accounts.length
        });
        for (var j = 0; j < accs[i].accounts.length; j++) {
          list.push({
            type: 'account',
            val: accs[i].accounts[j]
          });
        }
      }
      return list;
    };

    $scope.accountsGroupedByState = function() {
      var accountsByState = accounts.groupedByState();
      var search = $scope.search && $scope.search.toLowerCase() || '';
      var filter = function(a) {
        return (search ? a.name.toLowerCase().indexOf(search) > -1 : true) && ($scope.isOwnerOrManager || ($scope.isAccountManager && $scope.canManageAccount(a)));
      };
      for (var state in accountsByState) {
        accountsByState[state].accounts = accountsByState[state].accounts.filter(filter);
      }
      accountsByState = accountsByState.filter(function(a) { return a.accounts.length; });
      $scope.accountsToShow = $scope.listAccountsToShow(accountsByState);
      return accountsByState;
    };

    $scope.removeAccount = function(account) {
      dialogs.confirm('Remove Queue',
        'Please, confirm the removal of '+account.name+' ('+types.typeNameOfAccount(account)+') queue.',
        'Remove queue',
        function() {
          Google.profileRemoveAccount(account, function(err, removed) {
            if (removed) {
              var network = types.networkTypeNameOfAccount(account);
              Intercom.event('queue_removed', { network: network, team_id: Google.profile._id, queue_id: account.aid });
              Intercom.event('queue_'+network+'_removed', { team_id: Google.profile._id, queue_id: account.aid });

              flash.success('Queue removal', 'The queue <strong>'+account.name+'</strong> was successfully removed.');
              // $scope.accounts = accounts.groupedByNetwork();
              // $scope.accountsByState = accounts.groupedByState();
              $scope.accountsByState = $scope.accountsGroupedByState();
              Google.updateAccountsQueueSize();
              $state.go('profiles.pid.accounts-add', { pid: Google.profile._id });
            } else {
              flash.error('Queue removal', 'The removal of the queue <strong>'+account.name+'</strong> has failed. Please try again.');
            }
          });
        });
    };

    $scope.selectAccount = function(account) {
      if (!account) {
        return;
      }

      if (account.state === states.account.reconnectRequired.code) {
        $state.go('profiles.pid.queues.aid.reconnect', { aid: account._id, pid: Google.profile._id });
      } else {
        $state.go('profiles.pid.queues.aid.queue', { aid: account._id, pid: Google.profile._id });
      }
    };

    function checkQueueSize() {
      if ($scope.account) {
        Google.updateAccountQueueSize($scope.account);
      }
    }

    function checkAvailability() {
      if ($scope.account) {
        // if ($scope.isGoogleProfile($scope.account)) {
        //   Google.profileAccountExtension($scope.account, function(err, data) {
        //     $scope.account.available = data && data.extensions > 0 ? true : false;
        //   });
        // } else {
          $scope.account.available = true;
        // }
      }
    }

    function updatePinsCookie() {
      var expires = new Date();
      expires.setDate(new Date().getDate() + 365);
      $cookies.putObject('pins', { mm: $scope.mainMenuPinned, am: $scope.accountsMenuPinned }, { secure: true,
      expires: expires });
    }

    $scope.togglePinMainMenu = function() {
      $scope.mainMenuPinned = !!!$scope.mainMenuPinned;
      updatePinsCookie();
    };

    $scope.togglePinAccountsMenu = function() {
      $scope.accountsMenuPinned = !!!$scope.accountsMenuPinned;
      updatePinsCookie();
    };

    $scope.toggleMainMenu = function(ignoreIfPinned) {
      if ($scope.mainMenuPinned) {
        if (ignoreIfPinned) {
          return;
        }
        $scope.mainMenuPinned = false;
        updatePinsCookie();
        $mdSidenav('menu', true).then(function(instance) {
          instance.close();
        });
      } else {
        $mdSidenav('menu').toggle();
      }
    };

    $scope.toggleAccountsMenu = function(ignoreIfPinned) {
      if ($scope.accountsMenuPinned) {
        if (ignoreIfPinned) {
          return;
        }
        $scope.accountsMenuPinned = false;
        updatePinsCookie();
        $mdSidenav('accounts', true).then(function(instance) {
          instance.close();
        });
      } else {
        $mdSidenav('accounts').toggle();
      }
    };

    $scope.accounsInStateTitle = function(state) {
      switch (state) {
        case states.account.reconnectRequired.code: return 'Queues you should reconnect';
        case states.account.enabled.code: return 'Active Queues';
        case states.account.disabled.code: return 'Disabled Queues';
        case states.account.blocked.code: return 'Blocked Queues';
      }
    };

    $scope.createProfile = function($event) {
      var confirm = $mdDialog.prompt()
        .title('Create New Team')
        .textContent('How would you like to name your new team?')
        .placeholder('New Team Name')
        .ariaLabel('New Team Name')
        .initialValue('Team #' + (Google.profiles.length + 1))
        .targetEvent($event)
        .ok('Create Team')
        .cancel('Cancel');
      $mdDialog.show(confirm).then(function(newProfileName) {
        if (newProfileName) {
          $scope.creatingProfile = true;
          Google.createProfile(newProfileName, function(err, data) {
            if (err) {
              var msg = err.error && err.error.message;
              flash.error('Create Team', msg || 'We are sorry but we have not been able to create new team. Please try again.');
            } else {
              flash.success('Create Team', 'New team successfully created.');

              var profile = data && data.profile;
              if (profile) {
                Intercom.event('team_created', { team_id: profile._id });

                Google.user.profiles.owner.push(profile._id);
                Google.profiles.push(profile);
                $scope.switchToProfile(profile);
              }
            }
            $scope.creatingProfile = false;
          });
        }
      }, function() {});
    };

    $scope.myProfilesFilter = function(p) {
      return p.members && p.members.owner && _.contains(p.members.owner, Google.user._id);
    };

    $scope.notMyProfilesFilter = function(p) {
      return p.members && p.members.owner && !_.contains(p.members.owner, Google.user._id);
    };

    $scope.areMyAndNotMyProfiles = function() {
      var myCount = 0;
      for (var i = 0; i < Google.profiles.length; i++) {
        if ($scope.myProfilesFilter(Google.profiles[i])) {
          myCount++;
        }
      }
      return myCount !== Google.profiles.length;
    };

    $rootScope.switchToProfile = $scope.switchToProfile = function(profile) {

      Google.profile = profile;
      config.plans = profile.plans;

      Intercom.updateWithData();

      onProfileUpdated();

      // $scope.accounts = accounts.groupedByNetwork();
      // $scope.accountsByState = accounts.groupedByState();
      $scope.accountsByState = $scope.accountsGroupedByState();

      Google.updateAccountsQueueSize();

      if ($state.current.name.indexOf('queues.aid') > -1) {
        if ($scope.isOwnerOrManager) {
          $state.go('profiles.pid.queue', { pid: profile._id });
        } else {
          $state.go('profiles.pid.drafts', { pid: profile._id });
        }
      } else {
        if ($scope.isOwnerOrManager) {
          $state.go($state.current.name, { pid: profile._id });
        } else {
          $state.go('profiles.pid.drafts', { pid: profile._id });
        }
      }

      $scope.$broadcast('queue:refresh');

      $apply($rootScope);
    };

    /////////////////

    $scope.$watch('accountsMenuPinned', function(newValue/*, oldValue*/) {
      var bodyClass = $rootScope.bodyClass || '';

      if (newValue) {
        if (bodyClass.indexOf('rightPinned') === -1) {
          bodyClass = bodyClass + (bodyClass ? ' ': '') + 'rightPinned';
        }
      } else {
        if (bodyClass.indexOf('rightPinned') > -1) {
          bodyClass = bodyClass.replace(' rightPinned').replace('rightPinned');
        }
      }

      if ($rootScope.bodyClass !== bodyClass) {
        $rootScope.bodyClass = bodyClass;
      }
    });

    $scope.$watch('Google.profile._id', function(/*newValue, oldValue*/) {
      $scope.accountsByState = $scope.accountsGroupedByState();

      if ($state.params.aid) {
        $scope.selectedAccount($state.params.aid);
      }

      onProfileUpdated();
    });

    $rootScope.$on('accounts:refresh', function() {
      // $scope.accounts = accounts.groupedByNetwork();
      // $scope.accountsByState = accounts.groupedByState();
      $scope.accountsByState = $scope.accountsGroupedByState();
      $apply($scope);
    });

    $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState/*, fromParams*/) {
      $scope.stateNameFixed = toState.name.replace(/\./g, '-');
      $scope.menuName = toState.menu && toState.menu.name;

      if (lastProfileId !== Google.profile._id) {
        // $scope.accounts = accounts.groupedByNetwork();
        // $scope.accountsByState = accounts.groupedByState();
        $scope.accountsByState = $scope.accountsGroupedByState();
        lastProfileId = Google.profile._id;
        checkAvailability();
        checkQueueSize();
      }

      if (toState && toState.name.indexOf('queues.aid.queue') > -1 && !Google.isGoogleProfile(toParams.aid)) {
        checkAvailability();
        checkQueueSize();
      }

      if (toState && toState.name.indexOf('queues.aid') > -1 && toParams && toParams.aid) {
        // $scope.accounts = accounts.groupedByNetwork();
        // $scope.accountsByState = accounts.groupedByState();
        $scope.accountsByState = $scope.accountsGroupedByState();
        $scope.selectedAccount(toParams.aid);
      } else {
        $scope.selectedAccount();
      }

      if (fromState && !fromState.name && toState && toState.name) {
        Google.updateAccountsQueueSize();
      }
    });

    Google.updateAccountsQueueSize(function() {
      $apply($scope);
    });

    angular.element($window).bind('resize', function () {
      $apply($scope);
    });

    $rootScope.$on('intercom:onUnreadCountChange', function(event, unreadCount) {
      $scope.notificationsCount = unreadCount;
      $apply($scope);
    });

    $rootScope.$on('online', function() {
      $scope.isOffline = Online.isNot();
      $apply($scope);
    });

    $scope.$watch('search', function() {
      $scope.accountsByState = $scope.accountsGroupedByState();
    });
  }]);
