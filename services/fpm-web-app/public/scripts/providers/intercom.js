'use strict';

var reEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

function capitalizeFirstLetter(string) {
  return string ? string.charAt(0).toUpperCase() + string.slice(1) : string;
}

function capitalizeWords(str) {
  return str ? str.split(/[ \t\.]+/).map(capitalizeFirstLetter).join(' ') : str;
}

function userName(user) {
  return (user && (reEmail.test(user.name) ? capitalizeWords(user.name.split('@')[0]): user.name)) || '';
}

angular.module('intercom', [])
  .provider('Intercom', function() {

  /* jshint -W106, -W015, -W033 */
  function createScriptTag(window, boot) {
    var w = window;
    var ic = w.Intercom;
    var d = document;
    function l() {
      var s = d.createElement('script');
      s.type = 'text/javascript';
      s.async = true;
      s.src = 'https://widget.intercom.io/widget/' + boot.app_id;
      var x = d.getElementsByTagName('script')[0];
      x.parentNode.insertBefore(s, x);
    }
    if (typeof ic === 'function') {
      ic('reattach_activator');
      ic('update', boot);
    } else {
      var i = function() {
        i.c(arguments);
      };
      i.q = [];
      i.c = function(args) {
        i.q.push(args);
      };
      w.Intercom = i;
      if (w.attachEvent) {
        w.attachEvent('onload', l);
      } else {
        w.addEventListener('load', l, false);
      }
    }
  }

  var IntercomClass = ['$rootScope', '$window', 'Google', 'moment', 'config', 'appId', 'userHash', function($rootScope, $window, Google, moment, config, appId, userHash) {

    function createIdentity() {
      var user = Google.user;
      var teamsCount = Google.profiles && Google.profiles.length || 0;
      var teamsOwn = 0;
      var teamsOnFree = 0;
      var teamsOnTrial = 0;
      var teamsOnPremium = 0;
      var accountsCount = 0;
      var accountsOwn = 0;
      var socialProfiles = 0;
      var socialProfilesCount = 0;
      var socialProfilesOwn = 0;
      var mrr = 0;
      var authMethod;

      var _authMethod = user.auth0Id ? user.auth0Id.split('|')[0] : 'google-oauth2';
      var _authId = user.auth0Id ? user.auth0Id.split('|')[1] : user.actorId;
      switch (_authMethod) {
        case 'google-oauth2':
          _authId = user.email || (_authId ? 'https://plus.google.com/'+_authId : null);
          authMethod = 'Google account' + (_authId ? ' ('+_authId+')' : '');
          break;
        case 'facebook':
          _authId = user.email || (_authId ? 'https://www.facebook.com/'+_authId : null);
          authMethod = 'Facebook account' + (_authId ? ' ('+_authId+')' : '');
          break;
        case 'linkedin':
          _authId = user.email || _authId;
          authMethod = 'Linkedin account' + (_authId ? ' ('+_authId+')' : '');
          break;
        case 'auth0':
          authMethod = 'e-mail ('+user.email+') + password';
          break;
      }

      if (teamsCount) {
        Google.profiles.forEach(function(p) {
          if (p.members.owner.indexOf(user._id) > -1) {
            teamsOwn++;
            accountsOwn += p.accounts && p.accounts.length || 0;
            socialProfiles = p.profiles && p.profiles.length || 0;
            socialProfilesOwn += socialProfiles;

            if (p.plan.name === 'TRIAL') {
              teamsOnTrial++;
            } else
            if (p.plan.name === 'FREE' || p.plan.name === 'FREEFOREVER') {
              teamsOnFree++;
            } else {
              teamsOnPremium++;
            }

            if (p.plan.name === 'PAYWYUM') {
              mrr += Math.max(socialProfiles - 1, 0) * (p.premium && p.premium.metrics && p.premium.metrics.profile || 0);
            } else
            if (p.subscription && p.subscription.id) {
              mrr += (p.subscription.amount / (p.subscription.interval === 'YEAR' ? 12 : 1)) / 100;
            }
          }
          accountsCount += p.accounts && p.accounts.length || 0;
          socialProfilesCount += p.profiles && p.profiles.length || 0;
        });
      }

      return {
        app_id: appId,
        hide_default_launcher: true,
        custom_launcher_selector: '#help-button',
        mrr: mrr,
        auth_method: authMethod,
        name: userName(user) || '',
        email: user && user.email,
        signed_up_at: user && moment.utc(user.created).unix(),
        user_id: user && user._id,
        locale: user && user.locale,
        tz: user && user.tz,
        country: user && user.country,
        affiliate_lead: user && user.affiliate && user.affiliate.referrer && !!user.affiliate.referrer.mbsy,
        team_current: Google.profile._id,
        teams: teamsCount,
        teams_shared_with: teamsCount - teamsOwn,
        teams_own: teamsOwn,
        teams_own_free: teamsOnFree,
        teams_own_trial: teamsOnTrial,
        teams_own_premium: teamsOnPremium,
        accounts: accountsCount,
        accounts_shared_with: accountsCount - accountsOwn,
        accounts_own: accountsOwn,
        social_profiles: socialProfilesCount,
        social_profiles_shared_with: socialProfilesCount - socialProfilesOwn,
        social_profiles_own: socialProfilesOwn,
        user_hash: userHash,
        avatar: user && {
          type: 'avatar',
          image_url: user.image
        }
      };
    }

    this.init = function() {
      createScriptTag($window, createIdentity());
      $window.Intercom('onUnreadCountChange', function(unreadCount) {
        $rootScope.$broadcast('intercom:onUnreadCountChange', unreadCount);
      });
    }.bind(this);

    this.update = function() {
      if ($window.Intercom) {
        $window.Intercom('update');
      }
    }.bind(this);

    this.updateWithData = function(data) {
      if ($window.Intercom) {
        data = Object.assign({}, data || {}, {
          user_id: Google.user && Google.user._id,
          user_hash: userHash,
          team_current: Google.profile._id
        });
        $window.Intercom('update', data);
      }
    }.bind(this);

    this.event = function(name, data) {
      // console.log('intercom:event', name, data);
      if ($window.Intercom) {
        $window.Intercom('trackEvent', name, data);
      }
    }.bind(this);

    if (!config.intercom.disabled) {
      $rootScope.$on('$stateChangeSuccess', function() {
        this.update();
      }.bind(this));

      $rootScope.$on('$viewContentLoaded', function() {
        this.init();
      }.bind(this));
    }
  }];

  this.$get = ['$injector', function($injector) {
    return $injector.instantiate(IntercomClass, {
      appId: this.appId,
      userHash: this.userHash
    });
  }];
});