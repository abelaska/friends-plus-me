/* jshint -W117 */
/* global window, opr, angular, navigator, safari  */

angular.module('fpmApp').controller('ExtensionCtrl', [
  '$rootScope',
  '$scope',
  '$apply',
  '$window',
  'Google',
  'Extension',
  'types',
  'async',
  'moment',
  'Log',
  '_',
  'Intercom',
  function (
    $rootScope,
    $scope,
    $apply,
    $window,
    Google,
    Extension,
    types,
    async,
    moment,
    Log,
    _,
    Intercom
  ) {
    $scope.Google = Google;
    $scope.installing = false;

    try {
      $scope.isSafari =
        /constructor/i.test(window.HTMLElement) ||
        (function (p) {
          return p.toString() === '[object SafariRemoteNotification]';
        }(!window.safari || (typeof safari !== 'undefined' && safari.pushNotification)));
    } catch (e) {
      $scope.isSafari = false;
    }

    try {
      $scope.isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
    } catch (e) {
      $scope.isOpera = false;
    }

    $scope.isChrome = !!window.chrome && !!window.chrome.webstore;
    $scope.isFirefox = typeof InstallTrigger !== 'undefined';
    $scope.browser = $scope.isOpera
      ? 'opera'
      : $scope.isFirefox ? 'firefox' : $scope.isSafari ? 'safari' : $scope.isChrome ? 'chrome' : 'unknown';
    $scope.isBrowserSupported = ['opera', 'chrome', 'safari', 'firefox'].indexOf($scope.browser) > -1;

    var platform;
    var appVersion = navigator.appVersion || '';
    if (appVersion.indexOf('Win') !== -1) {
      platform = 'win32';
    }
    if (appVersion.indexOf('Mac') !== -1) {
      platform = 'darwin';
    }
    if (appVersion.indexOf('X11') !== -1) {
      platform = 'linux';
    }
    if (appVersion.indexOf('Linux') !== -1) {
      platform = appVersion.indexOf('x86_64') === -1 ? 'linux32' : 'linux64';
    }

    var platforms = {
      darwin: {
        download: 'https://storage.googleapis.com/fpm-desktop/releases/latest/Friends%2BMe-latest.dmg',
        label: 'Download for Mac',
        detail: 'For macOS 10.8 or later.'
      },
      win32: {
        download: 'https://storage.googleapis.com/fpm-desktop/updates/Friends%2BMe%20Setup%20Latest.exe',
        label: 'Download Windows Installer',
        detail: 'For Windows 7 or later.'
      },
      linux32: {
        download: 'https://storage.googleapis.com/fpm-desktop/updates/Friends%2BMe-latest-i386.AppImage',
        label: 'Download for 32-bit Linux',
        detail: 'For every 32-bit Linux Desktop.'
      },
      linux64: {
        download: 'https://storage.googleapis.com/fpm-desktop/updates/Friends%2BMe-latest-x86_64.AppImage',
        label: 'Download for 64-bit Linux',
        detail: 'For every 64-bit Linux Desktop.'
      }
    };

    $scope.otherPlatforms = [];

    for (var p in platforms) {
      platforms[p].name = p;
      if (platform !== p) {
        $scope.otherPlatforms.push(platforms[p]);
      }
    }

    $scope.platform = platform;
    $scope.app = platforms[platform];

    function sortByName(a, b) {
      a = (a.name || '').toLowerCase();
      b = (b.name || '').toLowerCase();
      if (a < b) {
        return -1;
      }
      if (a > b) {
        return 1;
      }
      return 0;
    }

    function extensionsConnected(type) {
      return (Google[type] && Google[type].presence && Object.keys(Google[type].presence).length) || 0;
    }

    function extensionVersions(type) {
      return (
        Google[type] &&
        Google[type].presence &&
        _.chain(Google[type].presence)
          .values()
          .map(function (p) {
            return p.version;
          })
          .uniq()
          .value()
      );
    }

    function extensionVersionsText(type) {
      var versions = extensionVersions(type);
      return (versions && versions.length && '('+versions.join(', ')+')') || '';
    }

    $scope.canInstallExtension = function () {
      /* jshint -W116 */
      return !!($window.chrome && $window.chrome.webstore);
    };

    function installChromeExtension() {
      $scope.installing = true;
      $window.chrome.webstore.install(
        'https://chrome.google.com/webstore/detail/'+Extension.id,
        function () {
          $scope.installing = false;
          $scope.installed = true;
          Intercom.event('browser_extension_installed', { browser: 'chrome' });
          Intercom.event('chrome_browser_extension_installed');
          $apply($rootScope);
        },
        function (/* err */) {
          $scope.installing = false;
          $apply($rootScope);
        }
      );
    }

    // function installFirefoxExtension() {
    //   Intercom.event('browser_extension_installed', { browser: 'firefox' });
    //   Intercom.event('firefox_browser_extension_installed');
    //   InstallTrigger.install({
    //     'Friends+Me': 'https://addons.mozilla.org/firefox/downloads/latest/friendsplusme/addon-841295-latest.xpi'
    //   });
    // }

    function installOperaExtension() {
      $scope.installing = true;
      $window.opr.addons.installExtension(
        'fjhjbigbmipfipkjfjnbfjlkjhbhcnde',
        function () {
          $scope.installing = false;
          $scope.installed = true;
          Intercom.event('browser_extension_installed', { browser: 'opera' });
          Intercom.event('opera_browser_extension_installed');
          $apply($rootScope);
        },
        function (/* err */) {
          $scope.installing = false;
          $apply($rootScope);
        }
      );
    }

    $scope.installExtension = function () {
      switch ($scope.browser) {
        case 'chrome':
          installChromeExtension();
          break;
        case 'opera':
          installOperaExtension();
          break;
        case 'firefox':
          Intercom.event('browser_extension_installed', { browser: $scope.browser });
          Intercom.event($scope.browser+'_browser_extension_installed');
          $window.open('https://addons.mozilla.org/en-US/firefox/addon/friendsplusme/', '_blank').focus();
          break;
        case 'safari':
          Intercom.event('browser_extension_installed', { browser: $scope.browser });
          Intercom.event($scope.browser+'_browser_extension_installed');
          $window
            .open(
              'https://safari-extensions.apple.com/details/?id=me.friendsplus.extension-for-safari-N5NR7FKFS3',
              '_blank'
            )
            .focus();
          break;
      }
    };

    $scope.downloadMobileApp = function (platform) {
      Intercom.event('mobile_app_install', { platform: platform });
    };
  }
]);
