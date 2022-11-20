/*jshint -W098*/
'use strict';

angular.module('fpmApp', ['ngSanitize', 'ngMaterial', 'ngAnimate', 'ui.tinymce', 'ui.router', 'ui.bootstrap.datetimepicker',
  'ngCookies', 'async', 'angular-loading-bar', 'ngFileUpload', 'ui.bootstrap', 'analytics', 'flash', 'crawler', 'image',
  'google', 'lodash', 'moment', 'types','states','countries','le','log','jstz','dialogs','urls','jquery',
  'accounts','stacktrace','$exceptionHandler','events','tinymce','extension','tinymce-mention','S','cfp.hotkeys',
  'twttr', '$apply', '$initialState', '$isMobile', 'premium', 'intercom'])
  .config(['$mdThemingProvider', function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
      .primaryPalette('blue')
      .accentPalette('red');

    // Enable browser color
    $mdThemingProvider.enableBrowserColor({
      theme: 'default', // Default is 'default'
      palette: 'accent', // Default is 'primary', any basic material palette and extended palettes are available
      hue: '200' // Default is '800'
    });
  }])
  .config(['$compileProvider', 'config', function($compileProvider, config) {
    if (config.env === 'production') {
      // disable debug info
      $compileProvider.debugInfoEnabled(false);
    }
  }])
  .config(['LogProvider', 'config', function(LogProvider, config) {
    LogProvider.token = config.log.token;
    LogProvider.debug = config.log.debug;
  }])
  .config(['EventsProvider', 'config', function(EventsProvider, config) {
    EventsProvider.enabled = config.events.enabled;
    EventsProvider.url = config.events.url;
    EventsProvider.db = config.events.db;
    EventsProvider.username = config.events.username;
    EventsProvider.password = config.events.password;
    EventsProvider.flushInterval = config.events.flushInterval;
  }])
  .config(['IntercomProvider', 'config', function(IntercomProvider, config) {
    IntercomProvider.appId = config.intercom.appId;
    IntercomProvider.userHash = config.intercom.userHash;
  }])
  .config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
    cfpLoadingBarProvider.includeSpinner = false;
    cfpLoadingBarProvider.includeBar = true;
  }])
  .config(['$tooltipProvider', function($tooltipProvider) {
    $tooltipProvider.options({
      animation: false,
      appendToBody: true
    });
  }])
  .config(['AnalyticsProvider', 'config', function(AnalyticsProvider, config) {
    AnalyticsProvider.token = config.analytics.token;
    AnalyticsProvider.config = config.analytics.config;
    AnalyticsProvider.kissmetrics = config.kissmetrics;
  }])
  .config(['GoogleProvider', 'config', function(GoogleProvider, config) {
    GoogleProvider.url = config.web.url;
    GoogleProvider.urlplus = config.web.urlplus;
    GoogleProvider.scope = config.google.scope;
    GoogleProvider.requestvisibleactions = config.google.requestvisibleactions;
    GoogleProvider.clientid = config.google.clientid;
    GoogleProvider.fpmAuthUrl = config.api.url + config.api.ops.auth;
    GoogleProvider.fpmAuthCheckUrl = config.api.url + config.api.ops.authCheck;
    GoogleProvider.fpmUrl = config.api.url;
  }])
  .config(['$stateProvider', '$urlRouterProvider', '$locationProvider', function($stateProvider, $urlRouterProvider, $locationProvider) {

    $locationProvider.html5Mode(true);

    $urlRouterProvider
      .when('', '/share')
      .otherwise('/share');

    $stateProvider
      .state('share', {
        url: '/share',
        templateUrl: '/views/share.html'
      });
  }])
  .run(['$rootScope', 'config', '$initialState', '$location', 'Intercom', function($rootScope, config, $initialState, $location) {
    $rootScope.config = config;
    $rootScope.year = new Date().getFullYear();
    $rootScope.isShare = true;

    var query = $initialState.query || {};
    $rootScope.isShareLite = query.lite === '1';
    $rootScope.isSharePopup = query.popup === '1';
  }]);
