/* jshint -W106 */
'use strict';

angular.module('auth', []).provider('Auth', function() {

  var Auth = ['$rootScope', '$window', 'Google', 'Log', 'config', 'types', 'flash', function($rootScope, $window, Google, Log, config, types, flash) {

    // https://github.com/oauth-io/oauth-js/blob/master/dist/oauth.js#L241

    this.show = function(input, resolve, reject) {
      var isReauth = typeof input !== 'string';
      this.popup(input, function(data) {
        var error = data && data.error;
        if (error) {
          Log.warn('Failed to process social account '+(isReauth ? 're-': '')+'authentication', { message: error.message, error: error });
          flash.error('Social Account Authentication', error.message || 'We\'ve failed to '+(isReauth ? 're-': '')+'authenticate social account. Please, try again.');
          if (reject) { reject(error); }
          return;
        }

        isReauth = data.sid && Google.profile.profiles.filter(function(p) { return p._id === data.sid; }).length > 0;

        Google.profile.accounts = data.accounts;
        Google.profile.profiles = data.profiles;
        Google.profile.routes = data.routes;

        $rootScope.$broadcast('accounts:refresh');

        flash.success('Social Account Authentication', 'Social Account successfully '+(isReauth ? 're-': '')+'authenticated.');

        if (resolve) { resolve(data); }
      }, function(error) {
        if (error.toString() !== 'Error: Window closed') {
          Log.warn('Failed to open '+(isReauth ? 're': '')+'auth popup window', { message: error.toString(), error: error });
          flash.error('Social Account Authentication', 'We\'ve failed to '+(isReauth ? 're-': '')+'authenticate social account. Please, try again.');
        }
        if (reject) { reject(error); }
      });
    }.bind(this);

    this.popup = function(input, resolve, reject) {
      var provider, aid;
      if (typeof input === 'string') {
        provider = input;
      } else {
        aid = input._id;
        provider = types.networkTypeNameOfAccount(input);
      }

      var wSettings = {
        width: Math.floor($window.outerWidth * 0.8),
        height: Math.floor($window.outerHeight * 0.5)
      };
      if ( wSettings.width < 1000) {
         wSettings.width = 1000;
      }
      if ( wSettings.height < 630) {
         wSettings.height = 630;
      }
       wSettings.left = Math.floor($window.screenX + ($window.outerWidth -  wSettings.width) / 2);
       wSettings.top = Math.floor($window.screenY + ($window.outerHeight -  wSettings.height) / 8);

      var wOptions =
      'toolbar=0,scrollbars=1,status=0,resizable=1,location=0,menubar=0' +
      ',width=' +  wSettings.width + ',height=' +  wSettings.height +
      ',left=' +  wSettings.left + ',top=' +  wSettings.top;

      var state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      var qs = {
        gs: state,
        fpmetoken: Google.token,
        pid: Google.profile._id
      };

      switch (provider) {
        case 'twitter':
          qs.force_login = 'true';
          break;
        case 'google':
          if (input.email) {
            qs.login_hint = input.email;
          }
          break;
      }

      if (aid) {
        qs.aid = aid;
        switch (input.network) {
          case types.network.twitter.code:
            qs.screen_name = input.name;
            break;
          case types.network.google.code:
            var profiles = input.socialProfileId && Google.profile.profiles.filter(function(p) { return p._id === input.socialProfileId; });
            var profile = profiles && profiles.length && profiles[0];
            qs.login_hint = (profile && profile.email) || input.parentUid || input.uid;
            break;
        }
      }

      var qsa = [];
      for (var k in qs) {
        qsa.push(k + '=' + qs[k]);
      }
      qsa = (qsa.length ? '?' : '') + qsa.join('&');

      var url = '/social/connect/'+provider+((aid && '/reauth') || '')+qsa;

      var w, wTimeout, reply, getMessage, gotmessage, callback;

      gotmessage = false;
      getMessage = function(e) {
        if (!gotmessage) {
          if (e.origin !== config.web.url) {
            return;
          }
          if (!e.data) {
            reply = { error: { message: 'No data' } };
          } else {
            if (e.data.state !== state) {
              reply = { error: { message: 'Invalid state!', data: e.data } };
            } else {
              reply = e.data;
            }
          }
          try {
            w.close();
          } catch (_error) {}
          gotmessage = true;
          return true;
        }
      };

      callback = function(data) {
        if (wTimeout) {
          clearTimeout(wTimeout);
          wTimeout = null;
        }
        if (window.removeEventListener) {
          window.removeEventListener('message', getMessage, false);
        } else if (window.detachEvent) {
          window.detachEvent('onmessage', getMessage);
        } else {
          if (document.detachEvent) {
            document.detachEvent('onmessage', getMessage);
          }
        }
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data.data);
        }
      };

      if (window.attachEvent) {
        window.attachEvent('onmessage', getMessage);
      } else if (document.attachEvent) {
        document.attachEvent('onmessage', getMessage);
      } else {
        if (window.addEventListener) {
          window.addEventListener('message', getMessage, false);
        }
      }

      w = $window.open(url, 'Authorization', wOptions);
      if (w) {
        w.focus();

        wTimeout = setTimeout(function() {
          reply = { error: new Error('Timeout') };
          try {
            w.close();
          } catch(_error) {}
        }, 5 * 60 * 1000);

        var closeChecker = setInterval(function() {
          if (w === null || w.closed) {
            clearInterval(closeChecker);
            callback(reply || { error: new Error('Window closed') });
          }
        }, 500);
      } else {
        $window.location.href = url + '&redir=1';
      }
    }.bind(this);
  }];

  this.$get = ['$injector', function($injector) {
    return $injector.instantiate(Auth, {
    });
  }];
});