'use strict';

angular.module('fpmApp')
  .controller('AccountsAddCtrl', ['$rootScope', '$scope', '$http', '$state', '$initialState', '$window', '$apply', '$mdDialog', '$timeout', 'config', 'types', 'states', 'Google', 'moment', 'accounts', 'dialogs', 'Auth', 'Log', 'async', 'flash', 'Intercom', function($rootScope, $scope, $http, $state, $initialState, $window, $apply, $mdDialog, $timeout, config, types, states, Google, moment, accounts, dialogs, Auth, Log, async, flash, Intercom) {

    $rootScope.bodyClass = 'accounts';

    var profile = Google.profile;

    $scope.Google = Google;
    $scope.profile = profile;
    $scope.instaUsername = '';
    $scope.instaPassword = '';
    $scope.instaSecurityCode = '';
    $scope.showInstagramSecurityCode = false;
    $scope.instaError = '<p class="single">Instagram support is temporarily disabled.</p>';

    function checkAnotherAccountAllowed(networkName, accountName, allowedCallback) {
      var lines;
      if (Google.isAnotherAccountAllowed()) {
        if (!Google.isAnotherAccountAllowedByType(networkName, accountName)) {
          var net = types.network[networkName].name;
          lines = [
            'It\'s great to see that you want to add another '+net+' queue!',
            'You can upgrade to <strong>connect more '+net+' queues</strong> or you can remove one of your already connected '+net+' queues.'
          ];
        }
      } else {
        lines = [
          'It\'s great to see that you want to add another queue!',
          'You can upgrade to <strong>connect more queues</strong> or you can remove one of your already connected queues.'
        ];
      }

      if (lines) {
        return dialogs.premiumRequired({
          lines: function() {
            return lines;
          },
          featureName: function() {return 'add-queue-'+networkName+'-'+accountName;}
        });
      }

      allowedCallback();
    }

    var networkIcon = {
      google: 'fa-google-plus',
      facebook: 'fa-facebook-official',
      twitter: 'fa-twitter',
      linkedin: 'fa-linkedin',
      pinterest: 'fa-pinterest',
      tumblr: 'fa-tumblr',
      instagram: 'fa-instagram'
    };

    var networkSubTypes = {
      google: ['profile', 'page', 'collection', 'community'],
      facebook: ['page', 'group'],
      twitter: ['profile'],
      linkedin: ['profile', 'page'],
      pinterest: ['board'],
      tumblr: ['blog'],
      instagram: ['profile']
    };

    var subTypesMore = $scope.subTypesMore = {
      'profile': 'profiles',
      'page': 'pages',
      'collection': 'collections',
      'community': 'communities',
      'group': 'groups',
      'board': 'boards',
      'blog': 'blogs'
    };

    var subTypes = Object.keys(subTypesMore);

    function sortByNameAsc(a, b) {
      return (a && a.name || '').toLowerCase().localeCompare((b && b.name || '').toLowerCase());
    }

    function listNetworks() {
      var networks = [];
      for (var nn in types.network) {
        if (nn !== 'instagram' && nn !== 'google') {
          networks.push({
            type: nn,
            icon: networkIcon[nn],
            beta: !!types.network[nn].beta,
            code: types.network[nn].code,
            name: types.network[nn].name,
            types: networkSubTypes[nn] || [],
            show: true
          });
        }
      }
      return networks;
    }

    function listProfiles(network) {
      return Google.profile && Google.profile.profiles && Google.profile.profiles.filter(function(p) {
        return p.network === network.code &&
          (network.type === 'google' ?
            p.account === types.account.profile.code || p.account === types.account.page.code:
            p.account === types.account.profile.code);
      }).map(function(p) {
        return {
          _id: p._id,
          uid: p.uid,
          image: p.image,
          name: p.name,
          account: p.account,
          url: p.url,
          show: true
        };
      }).sort(sortByNameAsc) || [];
    }

    function listAccounts(accounts) {
      var list;
      var result = [];
      subTypes.forEach(function(type) {
        list = accounts && accounts[subTypesMore[type]];
        if (list) {
          list.forEach(function(a) {
            result.push({
              id: a.id,
              image: a.image,
              name: a.name,
              url: a.url,
              meta: a.meta,
              type: type,
              show: true
            });
          });
        }
      });
      return result.sort(sortByNameAsc);
    }

    function groupAccounts(accounts) {
      var result = [];
      $scope.network.types.forEach(function(type) {
        result.push({
          type: type,
          collapsed: false,
          accounts: accounts.filter(function(a) { return a.type === type && a.show; })
        });
      });
      return result;
    }

    function searchList(list, search) {
      if (!list) {
        return;
      }
      search = search && search.toLowerCase() || '';
      list.forEach(function(n) {
        n.show = !search || n.name.toLowerCase().indexOf(search) > -1;
      });
    }

    function searchNetworks(search) {
      searchList($scope.networks, search);
    }

    function searchProfiles(search) {
      searchList($scope.profiles, search);
    }

    function searchAccounts(search) {
      searchList($scope.accounts, search);
      $scope.groupedAccounts = groupAccounts($scope.accounts);
    }

    function findInitialNetwork(networks) {
      if (!$state.params.network || !networks || !networks.length) {
        return null;
      }
      var type = $state.params.network.toLowerCase();
      var network = networks.filter(function(n) { return n.type === type; });
      return network.length && network[0] || null;
    }

    function findInitialProfile(profiles) {
      if (!$state.params.profile || !profiles || !profiles.length) {
        return null;
      }
      var profile = profiles.filter(function(p) { return p._id === $state.params.profile; });
      return profile.length && profile[0] || null;
    }

    function addAccount(account, meta) {
      var category =  meta && meta.thread && {
        id: meta.thread.id,
        name: meta.thread.name
      };

      if ($scope.account && $scope.account === account) {
        $scope.account = null;
        $scope.accounts.forEach(function(a) { a.show = true; });
        return;
      }

      account = account || {
        type: 'profile',
        id: $scope.profile.uid,
        name: $scope.profile.name,
        image: $scope.profile.image,
        url: $scope.profile.url,
        token: $scope.profile.token,
        meta: $scope.profile.meta
      };

      $scope.account = account;

      if ($scope.account) {
        $scope.accounts.forEach(function(a) { a.show = $scope.account.id === a.id; });
        $scope.groupedAccounts = groupAccounts($scope.accounts);
      } else {
        $scope.profiles.forEach(function(p) { p.show = $scope.profile.uid === p.uid; });
      }

      // uid, sid, account, image, name, url, token, category
      var req = {
        sid: $scope.profile._id,
        uid: account.id,
        name: account.name,
        account: types.account[account.type].code,
        image: account.image,
        url: account.url,
        token: account.token || (account.meta && account.meta.token),
        category: category
      };

      var isGoogle = $scope.network && $scope.network.code === types.network.google.code;
      var isProfileOrPage = account.type === 'profile' || account.type === 'page';

      Google.connectAccount(req, function(error, data) {
        error = (error && error.error) || error;
        if (error) {
          Log.warn('Failed to connect queue', { message: error.message, error: error });

          flash.error('Add "'+$scope.account.name+'" '+$scope.network.name+' '+$scope.account.type,
            error.message || 'We\'ve failed to add new queue. Please, try again.');

          $scope.account = null;
          $scope.accounts.forEach(function(a) { a.show = true; });
          $scope.groupedAccounts = groupAccounts($scope.accounts);
          $scope.profiles.forEach(function(p) { p.show = true; });
          return;
        }

        Google.profile.accounts = data.accounts;
        Google.profile.profiles = data.profiles;
        Google.profile.routes = data.routes;

        Intercom.event('queue_added', { network: $scope.network.type, team_id: Google.profile._id, queue_id: data.aid });
        Intercom.event('queue_'+$scope.network.type+'_added', { team_id: Google.profile._id, queue_id: data.aid });

        $rootScope.$broadcast('accounts:refresh');

        $state.go('profiles.pid.queues.aid.queue', { pid: Google.profile._id, aid: data.aid });

        flash.success('Connect Queue',
          '"'+$scope.account.name+'" '+$scope.network.name+' '+$scope.account.type+' successfully connected.');
      });
    }

    function fetchAccounts(refresh) {
      $scope.search = '';

      var containsTypeProfile = $scope.network.types.indexOf('profile') > -1;
      var containsOnlyTypeProfile = containsTypeProfile && $scope.network.types.length === 1;
      if (containsTypeProfile && $scope.profile.account === types.account.profile.code) {
        $scope.accounts.push({
          type: 'profile',
          id: $scope.profile.uid,
          image: $scope.profile.image,
          name: $scope.profile.name,
          url: $scope.profile.url,
          show: true
        });
      }

      if (containsOnlyTypeProfile) {
        return;
      }

      $scope.loadingAccounts = true;
      Google.teamProfileAccounts($scope.profile._id, !!refresh, function(error, data) {
        $scope.accounts = $scope.accounts.concat(listAccounts(data));
        $scope.groupedAccounts = groupAccounts($scope.accounts);
        $scope.loadingAccounts = false;
      });
    }

    $scope.search = '';
    $scope.networks = listNetworks();
    $scope.network = findInitialNetwork($scope.networks);

    $scope.profile = null;
    $scope.profiles = [];
    $scope.account = null;
    $scope.accounts = [];
    $scope.groupedAccounts = [];

    $scope.$watch('search', function() {
      if ($scope.network) {
        if ($scope.profile) {
          // filter by group/page/collection/community/... name
          searchAccounts($scope.search);
        } else {
          searchProfiles($scope.search);
        }
      } else {
        searchNetworks($scope.search);
      }
    });

    $scope.isAccountsGroupVisible = function(g) {
      for (var i = 0; i < g.accounts.length; i++) {
        if (g.accounts[i].show) {
          return true;
        }
      }
      return false;
    };

    $scope.typesList = function(network) {
      var t = network.types.slice(0);
      var types = t.length && t[0];
      if (t.length > 1) {
        var last = t.pop();
        types = t.join(', ')+' or '+last;
      }
      return network.name+(types ? ' '+types : '');
    };

    $scope.pickNetworkOrProfile = function() {
      $scope.search = '';
      $scope.account = null;
      $scope.accounts = [];
      $scope.groupedAccounts = [];
      $scope.profiles = $scope.network ? listProfiles($scope.network) : [];
      $scope.profile = findInitialProfile($scope.profiles);

      $scope.networks.forEach(function(n) {
        if ($scope.network) {
          n.show = $scope.network === n;
        } else {
          n.show = true;
        }
      });

      if ($scope.profiles && $scope.profiles.length) {
        $scope.profiles.forEach(function(p) {
          if ($scope.profile) {
            p.show = $scope.profile === p;
          } else {
            p.show = true;
          }
        });
      }

      if ($scope.profile) {
        fetchAccounts();
      }
    };

    if ($scope.network) {
      $scope.pickNetworkOrProfile();
    }

    $scope.pickNetwork = function(network) {
      $scope.search = '';
      $scope.network = $scope.network ? null : network;

      if ($scope.network) {
        if ($scope.network.type === 'instagram') {
          $state.go('profiles.pid.accounts-add-network-profile', { pid: Google.profile._id, network: $scope.network.type, profile: 'new' });
        } else {
          $state.go('profiles.pid.accounts-add-network', { pid: Google.profile._id, network: $scope.network.type });
        }
      } else {
        $state.go('profiles.pid.accounts-add', { pid: Google.profile._id });
      }
    };

    $scope.pickProfile = function(profile) {
      $scope.search = '';
      $scope.profile = $scope.profile ? null : profile;

      if ($scope.profile) {
        var containsTypeProfile = $scope.network.types.indexOf('profile') > -1;
        var containsOnlyTypeProfile = containsTypeProfile && $scope.network.types.length === 1;
        if (containsOnlyTypeProfile) {
          addAccount();
        } else {
          $state.go('profiles.pid.accounts-add-network-profile', { pid: Google.profile._id, network: $scope.network.type, profile: $scope.profile._id });
        }
      } else {
        if ($scope.network) {
          $state.go('profiles.pid.accounts-add-network', { pid: Google.profile._id, network: $scope.network.type });
        } else {
          $state.go('profiles.pid.accounts-add', { pid: Google.profile._id });
        }
      }
    };

    $scope.refreshAccounts = function() {
      $scope.account = null;
      $scope.accounts = [];
      $scope.groupedAccounts = [];

      fetchAccounts(true);
    };

    $scope.pickAccount = function(account) {
      addAccount(account);
    };

    $scope.addNewAccount = function(networkType) {
      checkAnotherAccountAllowed(networkType, 'profile', function() {
        if (networkType === 'instagram') {
            $scope.showInstagramLogin = true;
            return;
        }
        Auth.show(networkType, function(data) {
          if (data && data.sid) {
            if ($scope.network.type === 'twitter') {
              $scope.profiles = listProfiles($scope.network);

              var profiles = $scope.profiles.filter(function(p) { return p._id === data.sid; });
              $scope.profile = profiles.length && profiles[0];

              addAccount();
            } else {
              $state.go('profiles.pid.accounts-add-network-profile', { pid: Google.profile._id, network: $scope.network.type, profile: data.sid });
            }
          } else {
            $scope.profiles = listProfiles($scope.network);
            searchProfiles($scope.search);
          }
        });
      });
    };

    var timeout = 70;
    var progress = 0;
    var progressStart = 30;
    var instaProgressTimer;
    var instaProgressFastTimer;

    if ($state.params.reconnectAccount) {
      $scope.showInstagramLogin = true;
      var account = Google.findProfileAccountById($state.params.reconnectAccount);
      if (account) {
        $scope.instaUsername = account.uid;
      }
    }

    if ($state.params.profile === 'new') {
      $scope.showInstagramLogin = true;
    }

    function instaProgress() {
      instaProgressTimer = $timeout(function() {
        $scope.instaProgress = progressStart + Math.round((++progress * (100 - progressStart)) / timeout);
        if (progress < timeout) {
          instaProgress();
        } else {
          $scope.instaLoading = false;
        }
      }, 1000);
    }

    function instaProgressFast() {
      instaProgressFastTimer = $timeout(function() {
        $scope.instaProgressFast += 4;
        if ($scope.instaProgressFast >= 100) {
          $scope.instaProgressFast = 0;
        }
        instaProgressFast();
      }, 100);
    }

    function startInstaProgress() {
      progress = 0;
      $scope.instaLoading = true;
      $scope.instaProgress = progressStart;
      $scope.instaProgressFast = 0;
      instaProgress();
      instaProgressFast();
    }

    function stopInstaProgress(instaLoading) {
      if (instaProgressFastTimer) {
        $timeout.cancel(instaProgressFastTimer);
        instaProgressFastTimer = null;
      }
      if (instaProgressTimer) {
        $timeout.cancel(instaProgressTimer);
        instaProgressTimer = null;
      }
      $scope.instaLoading = !!instaLoading;
    }

    function instagramAccountDetails(login, callback) {
      if (!login) {
        return callback();
      }
      $http({ method: 'GET', url: 'https://www.instagram.com/'+login+'/?__a=1' })
      .success(function(reply) {
        var user = reply && reply.graphql && reply.graphql.user;
        var isPrivate = (user && user.is_private) || false;
        if (isPrivate) {
          return callback({ message: 'Private Instagram accounts are not supported.' });
        }
        var posts = (user && user.edge_owner_to_timeline_media && user.edge_owner_to_timeline_media.count) || 0;
        var minRequiredPosts = 5;
        if (posts < minRequiredPosts) {
          return callback({ message: 'The Instagram account has to has at least '+minRequiredPosts+' posts.' });
        }

        var name = user && user.full_name;
        var avatar = user && user.profile_pic_url;
        callback(null, avatar && { name: name, avatar: avatar });
      })
      .error(function() { callback(); });
    }

    function isInstagramAllowed() {
      var f = Google.profile.use.instagram;
      if (f === true) {
        return true;
      }
      if (!f) {
        return false;
      }
      try {
        return moment.utc(f).unix() > moment.utc().unix();
      } catch(e) {
        return false;
      }
    }

    function isInstagramDisallowed() {
      return !isInstagramAllowed();
    }

    $scope.connectInstagramAccount = function(login, password, securityCode) {

      $scope.instaError = null;

      if (isInstagramDisallowed()) {
        return dialogs.premiumRequired({
          lines: function() {
            return [
              'It\'s great to see that you want to connect Instagram queue!',
              'You\'ll have to upgrade to <b>Individual</b> or higher premium plan for Instagram support.'];
          },
          featureName: function() { return 'add-instagram-queue'; },
          upgradeStateId: function() { return 'profiles.pid.billing-plan'; },
          upgradeStateParams: function() { return {
            pid: $state.params.pid,
            plan: 'individual'
          }; }
        });
      }

      if (securityCode) {
        if (!/^[0-9]{6}$/.test(securityCode)) {
          return flash.error('Invalid Security Code', 'Instagram security code should be a 6 digit number.');
        }
        login = $scope.savedInstaLogin;
        password = $scope.savedInstaPwd;
      }

      checkAnotherAccountAllowed('instagram', 'profile', function() {
        startInstaProgress();
        instagramAccountDetails(login, function(err, detail) {
          if (err || !detail) {
            stopInstaProgress();

            if (err) {
              $scope.instaError = '<p>'+err.message+'</p>';
              return flash.error('Connect Instagram Account', 'We\'ve failed to add new queue. Please, try again.');
            }

            return flash.error('Connect Instagram Queue', 'Instagram account "'+(login || '')+'" does not exist.');
          }

          Google.connectInstagramQueue(login, password, securityCode, function(error, reply) {
            error = (reply && reply.error) || (error && error.error) || error;

            $scope.showInstagramSecurityCode = false;

            if (error) {
              stopInstaProgress();
              Log.warn('Instagram credential verification invalid', { message: error.message, error: error });

              switch(error.code) {
                case 'SUSPICIOUS_LOGIN_ATTEMPT_WITH_SECURITY_CODE':
                  // save login, password for later use
                  $scope.savedInstaLogin = login;
                  $scope.savedInstaPwd = password;
                  // hide login and show security code form
                  $scope.showInstagramSecurityCode = true;

                  var msg = (error.message || '').toLowerCase();
                  $scope.instaError = '<p>Instagram requires you to verify the account and sent security code to '+msg+'</p><p>You have 3 minutes to enter the security code you\'ve received to the text area below and click <b>VERIFY &amp; CONNECT ACCOUNT</b> to continue.</p>';
                  break;
                case 'SERVER_NOT_READY':
                case 'NO_DEVICE_AVAILABLE':
                  $scope.instaError = '<p>No Instagram device is available at the moment.</p><p>Please, try again in a few more minutes. Thank you.</p>';
                  break;
                case 'SUSPICIOUS_LOGIN_ATTEMPT':
                  $scope.instaError = '<p>Instagram evaluated our try to verify your credentials as a suspicious login attempt.</p><p>Please login to your <b>'+login+'</b> Instagram account, confirm it was you, and try again.</p>';
                  break;
                  case 'INVALID_CREDENTIALS':
                  $scope.instaError = '<p>You\'re entered invalid Instagram credentials.</p><p>Please try again.</p>';
                  break;
                case 'NOT_ENOUGH_PUBLISHED_POSTS':
                case '2FA_NOT_SUPPORTED':
                  $scope.instaError = '<p>'+error.message+'</p>';
                  break;
              }

              flash.error('Connect Instagram Account', error.message || 'We\'ve failed to add new queue. Please, try again.');
              return;
            }

            var queue = reply && reply.queue;
            var req = {
              sid: Google.profile._id,
              uid: queue.uid,
              name: queue.name,
              network: types.network.instagram.code,
              account: types.account.profile.code,
              image: queue.avatar,
              url: queue.url,
              token: queue.token
            };

            Google.connectAccount(req, function(error, data) {
              error = (data && data.error) || (error && error.error) || error;
              if (error) {
                stopInstaProgress();
                Log.warn('Failed to connect instagram account', { message: error.message, error: error });
                flash.error('Connect Instagram Account', error.message || 'We\'ve failed to add new queue. Please, try again.');
                return;
              }

              Google.profile.accounts = data.accounts;
              Google.profile.profiles = data.profiles;
              Google.profile.routes = data.routes;

              Intercom.event('queue_added', { network: 'instagram' });

              $rootScope.$broadcast('accounts:refresh');

              stopInstaProgress(true);

              $state.go('profiles.pid.queues.aid.queue', { pid: Google.profile._id, aid: data.aid });

              flash.success('Connect Instagram Account', 'Instagram account "'+login+'" successfully connected.');
            });
          });
        });
      });
    };
  }]);
