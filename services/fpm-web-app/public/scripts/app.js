/* jshint -W098 */

angular
  .module('fpmApp', [
    'ngSanitize',
    'ngMaterial',
    'ui.tinymce',
    'ui.router',
    'ui.bootstrap.datetimepicker',
    'angular-loading-bar',
    'ngAnimate',
    'ngCookies',
    'async',
    'ngFileUpload',
    'ui.bootstrap',
    'analytics',
    'flash',
    'crawler',
    'image',
    'google',
    'lodash',
    'moment',
    'types',
    'states',
    'countries',
    'le',
    'log',
    'jstz',
    'dialogs',
    'braintree',
    'urls',
    'jquery',
    'accounts',
    'cfp.hotkeys',
    'stacktrace',
    '$exceptionHandler',
    'events',
    'extension',
    'tinymce-mention',
    'tinymce',
    'S',
    'twttr',
    'premium',
    '$apply',
    '$isMobile',
    '$initialState',
    'intercom',
    'auth',
    'online',
    'papa'
  ])
  .config([
    '$mdThemingProvider',
    function ($mdThemingProvider) {
      // https://github.com/angular/material/blob/master/src/core/services/theming/theme.palette.js

      $mdThemingProvider
        .theme('draft')
        .primaryPalette('green', {
          default: '500'
        })
        .accentPalette('green', {
          default: '500'
        })
        .warnPalette('red');

      $mdThemingProvider.definePalette('orange2', {
        50: '#fff3e0',
        100: '#ffe0b2',
        200: '#ffcc80',
        300: '#ffb74d',
        400: '#ffa726',
        500: '#ff9800',
        600: '#fb8c00',
        700: '#f57c00',
        800: '#ef6c00',
        900: '#e65100',
        A100: '#ffd180',
        A200: '#ffab40',
        A400: '#ff9100',
        A700: '#ff6d00',
        contrastDefaultColor: 'light',
        contrastLightColors: '800 900',
        contrastStrongLightColors: '800 900'
      });

      $mdThemingProvider
        .theme('queue')
        .primaryPalette('orange2', {
          default: '500'
        })
        .accentPalette('orange2', {
          default: '500'
        })
        .warnPalette('red');

      $mdThemingProvider
        .theme('default')
        .primaryPalette('blue', {
          default: '600'
        })
        .accentPalette('blue', {
          default: '600'
        })
        .warnPalette('red');

      // Enable browser color
      $mdThemingProvider.enableBrowserColor({
        theme: 'default', // Default is 'default'
        palette: 'primary', // Default is 'primary', any basic material palette and extended palettes are available
        hue: '300' // Default is '800'
      });

      $mdThemingProvider.alwaysWatchTheme(true);
    }
  ])
  .config([
    '$compileProvider',
    'config',
    function ($compileProvider, config) {
      if (config.env === 'production') {
        // disable debug info
        $compileProvider.debugInfoEnabled(false);
      }
    }
  ])
  .config([
    'LogProvider',
    'config',
    function (LogProvider, config) {
      LogProvider.token = config.log.token;
      LogProvider.debug = config.log.debug;
    }
  ])
  .config([
    'IntercomProvider',
    'config',
    function (IntercomProvider, config) {
      IntercomProvider.appId = config.intercom.appId;
      IntercomProvider.userHash = config.intercom.userHash;
    }
  ])
  .config([
    'EventsProvider',
    'config',
    function (EventsProvider, config) {
      EventsProvider.enabled = config.events.enabled;
      EventsProvider.url = config.events.url;
      EventsProvider.db = config.events.db;
      EventsProvider.username = config.events.username;
      EventsProvider.password = config.events.password;
      EventsProvider.flushInterval = config.events.flushInterval;
    }
  ])
  .config([
    'cfpLoadingBarProvider',
    function (cfpLoadingBarProvider) {
      cfpLoadingBarProvider.includeSpinner = false;
      cfpLoadingBarProvider.includeBar = true;
    }
  ])
  .config([
    '$tooltipProvider',
    function ($tooltipProvider) {
      $tooltipProvider.options({
        animation: false,
        appendToBody: true
      });
    }
  ])
  .config([
    'AnalyticsProvider',
    'config',
    function (AnalyticsProvider, config) {
      AnalyticsProvider.appVersion = config.version;
      AnalyticsProvider.token = config.analytics.token;
      AnalyticsProvider.config = config.analytics.config;
      AnalyticsProvider.kissmetrics = config.kissmetrics;
    }
  ])
  .config([
    'GoogleProvider',
    'config',
    function (GoogleProvider, config) {
      GoogleProvider.url = config.web.url;
      GoogleProvider.urlplus = config.web.urlplus;
      GoogleProvider.scope = config.google.scope;
      GoogleProvider.requestvisibleactions = config.google.requestvisibleactions;
      GoogleProvider.clientid = config.google.clientid;
      GoogleProvider.fpmAuthUrl = config.api.url + config.api.ops.auth;
      GoogleProvider.fpmAuthCheckUrl = config.api.url + config.api.ops.authCheck;
      GoogleProvider.fpmUrl = config.api.url;
    }
  ])
  .config([
    '$stateProvider',
    '$urlRouterProvider',
    '$locationProvider',
    'routes',
    function ($stateProvider, $urlRouterProvider, $locationProvider, routes) {
      $locationProvider.html5Mode(true);

      $urlRouterProvider
        .when(/\/teams\/([0-9a-f]{1,24})\/queues$/, '/teams/$1/queues/add')
        .when(/\/teams\/([0-9a-f]{1,24})\/accounts$/, '/teams/$1/queues/add')
        .when('', '/teams/0/queue')
        .when('/', '/teams/0/queue')
        .when('/user', '/user/notifications')
        .when('/queues/add', '/teams/0/queues/add')
        .when('/accounts/add', '/teams/0/queues/add')
        .when('/profile/premium', '/teams/0/billing')
        .when('/profile/ccc', '/teams/0/ccc')
        .when('/billing', '/teams/0/billing')
        .when('/billing/overview', '/teams/0/billing')
        .when(/(\/teams\/[0-9a-f]{24})$/, '$1/queue')
        .when(/(\/teams\/[0-9a-f]{24}\/queues\/[0-9a-f]{24})$/, '$1/queue')
        .when(/(\/teams\/[0-9a-f]{24})\/accounts\/add$/, '$1/queues/add')
        //   .when('/publish', '/profiles/0/queue')
        //   .when('/pricing', '/profiles/0/premium')
        //   .when('/social-profiles', '/profiles/0/social-profiles/overview')
        //   .when('/billing', '/profiles/0/billing/overview')
        //   .when('/credit', '/profiles/0/credit/add')
        //   .when('/profile', '/profiles/0/profile/overview')
        //   .when('/profiles', '/profiles/0/queue')
        // .when(/\/profiles\/([0-9a-f]+)\/billing$/, '/profiles/$1/billing/overview')
        // .when(/\/profiles\/([0-9a-f]+)\/social-profiles$/, '/profiles/$1/social-profiles/overview')
        // .when(/\/profiles\/([0-9a-f]+)\/accounts$/, '/profiles/$1/accounts/$2/queue')
        // .when(/\/accounts\/([0-9a-f]{24})$/, '/profiles/0/accounts/$1/queue')
        // .when(/\/accounts\/(.*)$/, '/profiles/0/accounts/$1')
        // .when('/premium', '/profiles/0/profile/premium')
        // .when('/premium/downgrade', '/profiles/0/profile/downgrade')
        .otherwise('/teams/0/queues/add');

      var state = $stateProvider
        .state('user', {
          url: '/user',
          templateUrl: '/views/user.html',
          menu: { name: 'User' },
          analytics: { screenview: { screenName: 'User' } }
        })
        .state('user.notifications', {
          url: '/notifications',
          templateUrl: '/views/user.notifications.html',
          menu: { name: 'User / Notifications' },
          analytics: { screenview: { screenName: 'User / Notifications' } }
        })
        .state('profiles', {
          url: '/teams',
          template: '<div ui-view style="width:100%;height:100%;"></div>'
        })
        .state('profiles.pid', {
          url: '/{pid:[0-9a-f]{1,24}}',
          template: '<div ui-view style="width:100%;height:100%;"></div>',
          controller: [
            '$scope',
            '$state',
            '$window',
            '_',
            'config',
            'Google',
            function ($scope, $state, $window, _, config, Google) {
              var profile = ($state.params.pid && _.findWhere(Google.profiles, { _id: $state.params.pid })) || Google.profile;
              if (!profile) {
                $window.location = 'https://friendsplus.me';
                return;
              }

              if ($state.params.pid !== profile._id) {
                $state.params.pid = profile._id;
                return $state.go($state.current.name, $state.params);
              }

              $scope.profile = profile;
              Google.profile = profile;
              config.plans = profile.plans;
            }
          ]
        });

      var id;
      routes.forEach(function (r) {
        id = r.absolute ? r.id : 'profiles.pid.'+r.id;
        state = state.state(id, r.route);
      });
    }
  ])
  // do not remove $state otherwise the initial state will not kickin
  .run([
    '$rootScope',
    '$location',
    '$state',
    '$window',
    '$timeout',
    '$initialState',
    '$mdTheming',
    'config',
    'flash',
    'Google',
    'Intercom',
    'types',
    'Online',
    function (
      $rootScope,
      $location,
      $state,
      $window,
      $timeout,
      $initialState,
      $mdTheming,
      config,
      flash,
      Google,
      Intercom,
      types,
      Online
    ) {
      $rootScope.config = config;
      $rootScope.year = new Date().getFullYear();

      // remove url query from location
      $location.search('url', null);

      if (Google.signedIn) {
        if ($initialState.goto) {
          $location.path($initialState.goto);
        }
      } else {
        $window.location.href = config.web.root;
      }

      $rootScope.currentTheme = 'default';

      $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams, error) {
        if (toState && toState.name.indexOf('queues.aid.') > -1) {
          $rootScope.lastAccountState = toState.name;
        }

        var theme = toState.theme || 'default';

        if ($rootScope.currentTheme !== theme) {
          $rootScope.currentTheme = theme;
          $mdTheming.setBrowserColor({
            theme: theme,
            palette: 'primary',
            hue: '300'
          });
        }
      });

      $rootScope.$on('$viewContentLoaded', function (event) {
        if ($initialState && $initialState.notify && $initialState.notify.length > 0) {
          $initialState.notify.forEach(function (notify) {
            flash[notify.level](notify.msg, notify.title);
          });
          $initialState.notify = null;
        }

        $timeout(function () {
          $rootScope.appLoaded = true;
        }, 0);
      });
    }
  ]);
