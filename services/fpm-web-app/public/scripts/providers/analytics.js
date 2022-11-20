'use strict';

angular.module('analytics', [])
  .provider('Analytics', function() {

  /*jshint -W069*/
  /*jshint -W015*/
  /*jshint -W033*/
  /*jshint -W030*/
  function createScriptTag($window, token, config, appVersion, loadedCallback) {
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
    $window.ga('create', token, config);
    $window.ga('set', {
      'appName': 'Friends+Me Application',
      'appId': 'fpm-app',
      'appVersion': appVersion
    });
    $window.ga('require', 'ecommerce');
    $window.ga(loadedCallback);
  }

  function createKissmetricsScriptTag($window, token) {
    $window._kmq = $window._kmq || [];
    $window._kmk = $window._kmk || token;
    $window._kms = function(u){
      setTimeout(function(){
        var d = $window.document, f = d.getElementsByTagName('script')[0],
        s = d.createElement('script');
        s.type = 'text/javascript'; s.async = true; s.src = u;
        f.parentNode.insertBefore(s, f);
      }, 1);
    };
    $window._kms('//i.kissmetrics.com/i.js');
    $window._kms('//doug1izaerwt3.cloudfront.net/'+$window._kmk+'.1.js');
  }

  var Analytics = ['$rootScope', '$window', '$location', 'Log', 'Events', 'moment', '_', 'token', 'config', 'kissmetrics', 'appVersion', function($rootScope, $window, $location, Log, Events, moment, _, token, config, kissmetrics, appVersion) {

    this.loaded = false;
    //this.clientId = Storage.clientId();
    this.kissmetrics = kissmetrics;
    this.userAgent = $window.navigator ? $window.navigator.userAgent || '' : '';
    this.vendor = $window.navigator ? $window.navigator.vendor || '' : '';
    this.referrer = $window.document ? $window.document.referrer || '' : '';

    this.payment = function(tx) {
      if (!tx) {
        return;
      }

      var addTx = {
        'id': tx._id,
        'revenue': (tx.amount/100).toString(),
        'currency': 'USD'
      };

      var affiliation = tx.affiliate && tx.affiliate.referrer && tx.affiliate.referrer.mbsy;
      if (affiliation) {
        addTx.affiliation = affiliation;
      }

      if (tx.vat) {
        addTx.tax = (tx.vat/100).toString();
      }

      var addItem = {
        'id': addTx.id,
        'name': 'Credit',
        'category': 'Funds',
        'price': addTx.revenue,
        'quantity': 1,
        'currency': addTx.currency
      };

      $window.ga('ecommerce:addTransaction', addTx);
      $window.ga('ecommerce:addItem', addItem);
      $window.ga('ecommerce:send');
    }.bind(this);

    this.trackPageview = function(path, state) {
      //console.log('tracked page', path || $location.path(), $rootScope.title);

      path = path || $location.path();

      // var title = $rootScope.title ? 'Friends+Me'+$rootScope.title : undefined;

      // $window.ga('send', 'pageview', {
      //   'page': path,
      //   'title': title
      // });

      var stateAnalytics = state && state.analytics;
      if (stateAnalytics) {
        if (stateAnalytics.screenview) {
          $window.ga('send', 'screenview', _.clone(stateAnalytics.screenview));
        }
      }

      Events.push('pageview', {
        path: path
      });
    }.bind(this);

    this.errToString = function(err) {
      return err ? err.error&&err.error.message||err.message||err.toString() : null;
    }.bind(this);

    this.push = function(category, action, label, value, eventDate) {

      eventDate = eventDate || {};
      eventDate.ev = action+(label?'.'+label:'');
      eventDate._val = value

      Events.push(category, eventDate);

      $window.ga('send', 'event', category, action, label, value);

      Log.debug('track event',{
        'category': category,
        'action': action,
        'label': label,
        'value': value,
        'eventDate': eventDate});

    }.bind(this);

    this.trackEvent = function(category, action, label, value) {
      //console.log('tracked event', category, action, label, value);
      $window.ga('send', 'event', category, action, label, value);
    }.bind(this);

    this.trackKMEvent = function(eventName, data, callback) {
      //console.log('tracked kissmetric event', eventName, data);
      if (this.kissmetrics.enabled) {
        $window._kmq.push(['record', eventName, data||{}, callback]);
      } else {
        if (callback) {
          callback();
        }
      }
    }.bind(this);

    this._extractDomain = function(a) {
      if (a) {
        a = a.split('/');
        return 3 <= a.length ? a[2] : '';
      } else {
        return '';
      }
    }.bind(this);

    /*jshint -W092*/
    this._device = function() {
      try {
        var n = this.userAgent;
        return /iPhone/.test(n) ? 'iPhone' : /iPad/.test(n) ? 'iPad' : /iPod/.test(n) ? 'iPod Touch' : /(BlackBerry|PlayBook|BB10)/i.test(n) ? 'BlackBerry' : /Windows Phone/i.test(n) ? 'Windows Phone' : /Android/.test(n) ? 'Android' : '';
      } catch(e) {
        return '';
      }
    }.bind(this);

    this._browser = function() {
      function h(a, c) {
        return -1 !== a.indexOf(c);
      }
      try {
        var a = this.vendor,
            n = this.userAgent;
        return $window.opera ? h(n, 'Mini') ? 'Opera Mini' : 'Opera' :
            /(BlackBerry|PlayBook|BB10)/i.test(n) ? 'BlackBerry' : h(n, 'Chrome') ? 'Chrome' : h(a, 'Apple') ? h(n, 'Mobile') ? 'Mobile Safari' : 'Safari' : h(n, 'Android') ? 'Android Mobile' : h(n, 'Konqueror') ? 'Konqueror' : h(n, 'Firefox') ? 'Firefox' : h(n, 'MSIE') ? 'Internet Explorer' : h(n, 'Gecko') ? 'Mozilla' : ''
      } catch(e) {
        return '';
      }
    }.bind(this);

    this._os = function() {
      try {
        var n = this.userAgent;
        return /Windows/i.test(n) ? /Phone/.test(n) ? 'Windows Mobile' : 'Windows' : /(iPhone|iPad|iPod)/.test(n) ? 'iOS' : /Android/.test(n) ? 'Android' : /(BlackBerry|PlayBook|BB10)/i.test(n) ? 'BlackBerry' : /Mac/i.test(n) ? 'Mac OS X' :
            /Linux/.test(n) ? 'Linux' : '';
      } catch(e) {
        return '';
      }
    }.bind(this);

    this.visitData = function() {
      return {
        path: $location.path(),
        ref:  this.referrer || '$direct', // referrer
        refd: this._extractDomain(this.referrer) || '$direct', // referring_domain
        dev:  this._device(), // device
        br:   this._browser(), // browser
        os:   this._os() // operation system
        //reg:  Storage.isRegisteredUser() // is registered user ?
      };
    }.bind(this);

    this.track = {

      visit: function(data, state) {
        /*var v = this.visitData(),
            d = data || v;

        if (!d) {
          Log.info('Broken Visit', {
            save: d,
            data: data,
            visitData: this.visitData(),
            userAgent: this.userAgent ? this.userAgent : 'null',
            vendor: this.vendor ? this.vendor : 'null',
            referrer: this.referrer ? this.referrer : 'null',
            path: $location.path(),
            ref:  this.referrer || '$direct', // referrer
            refd: this._extractDomain(this.referrer) || '$direct', // referring_domain
            dev:  this._device(), // device
            br:   this._browser(), // browser
            os:   this._os(), // operation system
            reg:  Storage.isRegisteredUser() // is registered user ?
          });
        }

        this.trackFPMEvent(0, d);*/
        this.trackPageview(state);
      }.bind(this),

      km: this.trackKMEvent.bind(this),

      signin: function(user/*, profile*/) {
        if (this.kissmetrics.enabled) {
          $window._kmq.push(['identify', user.email]);
          $window._kmq.push(['set', {'Full Name': user.name}]);
          this.trackKMEvent('Signed In');
        }

        this.trackEvent('User', 'Login');

        Events.push('user-signin');
      }.bind(this),

      signup: function() {
        this.trackEvent('User', 'Signup');
        Events.push('user-signup');
      }.bind(this),

      click: function(category, label, value) {
        this.trackEvent(category, 'Click', label, value);
      }.bind(this),

      feature: function(action, label, value) {
        this.trackEvent('feature', action, label, value);
      }.bind(this)
    };

    config = config || {};
    config.clientId = this.clientId;

    createScriptTag($window, token, config, appVersion, function(/*tracker*/) {
      this.loaded = true;
      $rootScope.$broadcast('event:analytics:loaded');
    }.bind(this));

    if (this.kissmetrics.enabled) {
      createKissmetricsScriptTag($window, this.kissmetrics.token);
    }
  }];

  this.$get = ['$injector', function($injector) {
    return $injector.instantiate(Analytics, {
      appVersion: this.appVersion,
      token: this.token,
      config: this.config,
      kissmetrics: this.kissmetrics
    });
  }];
}).run(['$rootScope', 'Analytics', function($rootScope, Analytics) {
  $rootScope.$on('$stateChangeSuccess', function(event, toState/*, toParams, fromState, fromParams*/) {
    Analytics.trackPageview(null, toState);
  });
}]);
