/*jshint -W106*/
'use strict';

angular.module('google', []).provider('Google', function() {

  var Google = ['$rootScope', '$timeout', '$window', '$http', '$q', '$cookies', '$apply', '$initialState', '_', 'async', 'config', 'types', 'moment', 'jstz', 'Analytics', 'url', 'urls', 'urlplus', 'scope', 'requestvisibleactions', 'clientid', 'fpmAuthUrl', 'fpmAuthCheckUrl', 'fpmUrl', function($rootScope, $timeout, $window, $http, $q, $cookies, $apply, $initialState, _, async, config, types, moment, jstz, Analytics, url, urls, urlplus, scope, requestvisibleactions, clientid, fpmAuthUrl, fpmAuthCheckUrl, fpmUrl) {

    this.loaded = false;
    this.url = url;
    this.urlplus = urlplus;
    this.scope = scope;
    this.requestvisibleactions = requestvisibleactions;
    this.clientid = clientid;
    this.fpmAuthUrl = fpmAuthUrl;
    this.fpmAuthCheckUrl = fpmAuthCheckUrl;
    this.fpmUrl = fpmUrl;

    this.signedIn = false;
    this.token = null;
    this.profile = null;
    this.user = null;
    this.apiPublicToken = null;
    this.apiPublicTokenExpiresAt = null;

    this.apiAccessToken = function(callback) {
      if (this.apiPublicToken && this.apiPublicTokenExpiresAt && this.apiPublicTokenExpiresAt.valueOf() > new Date().valueOf()) {
        return callback(null, this.apiPublicToken);
      }
      return this.GET(this.fpmUrl + '/sso/token', function(error, data) {
        if (error) {
          return callback(error);
        }
        this.apiPublicTokenExpiresAt = null;
        this.apiPublicToken = data && data.access_token;
        var expiresIn = data && data.expires_in;
        if (expiresIn) {
          var t = new Date();
          t.setSeconds(t.getSeconds() + expiresIn);
          this.apiPublicTokenExpiresAt = t;
        }
        callback(null, this.apiPublicToken);
      }.bind(this));
    }.bind(this);

    this.apiCall = function(method, path, data, headers, callback) {
      return this.apiAccessToken(function(error, accessToken) {
        if (error) {
          return callback(error);
        }
  
        headers = _.extend({
          'Authorization': 'Bearer '+accessToken
        }, headers || {});
  
        $http({ method: method, url: config.api.public.url + path, data: data, headers: headers })
        .success(function(data/*, status, headers, config*/) { callback(null, data || true); })
        .error(function(data/*, status, headers, config*/) { callback(data || true); });
      }.bind(this));
    }.bind(this);

    this.apiQueuesInfo = function(queueId, callback) {
      this.apiCall('GET', '/queues.info?full=true&queue='+queueId, null, null, callback);
    }.bind(this);

    this.apiQueuesUpdateScheduling = function(queueId, data, callback) {
      this.apiCall('POST', '/queues.updateScheduling?queue='+queueId, data, null, callback);
    }.bind(this);

    this.apiCreateDraft = function(teamId, draft, callback) {
      this.apiCall('POST', '/drafts.create?team='+teamId, draft, null, callback);
    }.bind(this);

    this.apiUpdateUser = function(user, callback) {
      this.apiCall('POST', '/users.update', user, null, callback);
    }.bind(this);

    this.thisMonthReposts = function() {
      var month = moment.utc().format('YYYYMM'),
          v = this.profile && this.profile.analytics ? this.profile.analytics['m'+month] : null;
      return v ? (v.activities || 0) : 0;
    }.bind(this);

    this.userInfo = function(uid, accessToken, callback) {
      $http.jsonp('https://www.googleapis.com/plus/v1/people/'+uid+'?callback=JSON_CALLBACK&access_token='+accessToken)
      .success(function(data/*, status, headers, config*/) {
        callback(null, data);
      })
      .error(function(data/*, status, headers, config*/) {
        callback(data);
      });
    }.bind(this);

    this.userInfoDefered = function(uid, defer) {
      this.userInfo(uid, function(err, data) {
        if (err) {
          defer.reject(err);
        } else {
          defer.resolve(data);
        }
      });
    }.bind(this);

    this.clickSignin = function(signinId) {
      $rootScope.signinId = signinId;
    }.bind(this);

    this.createPlusOneButton = function(elementId) {
      $window.gapi.plusone.render(elementId, {
        href: this.urlplus
      });
    }.bind(this);

    this.createFollowButtons = function() {
      $window.gapi.follow.go();
    }.bind(this);

    this.createRecommendButton = function(elementId) {
      $window.gapi.interactivepost.render(elementId, {
        //approvalprompt: 'auto',
        //accesstype: 'offline',
        //scope: this.scope,
        //requestvisibleactions: this.requestvisibleactions,
        clientid: this.clientid,
        cookiepolicy: 'single_host_origin',
        width: 'wide',
        prefilltext: 'I have started to use this amazing service. Give it a try! #FriendsPlusMe +105750980959577516811',
        contenturl: this.urlplus,
        calltoactionlabel: 'INVITE',
        calltoactionurl: this.urlplus
      });
    }.bind(this);

    this.signout = function() {
      $timeout(function() {
        $rootScope.appLoaded = false;

        setTimeout(function() {
          $window.location.href = config.web.signout;
        }, 100);
      }, 0);
    }.bind(this);

    this.teamProfileAccounts = function(profileId, refresh, callback) {
      return this.GET(this.fpmUrl + '/team/'+this.profile._id+'/profiles/'+profileId+'/accounts'+(refresh ? '?refresh=1': ''), callback);
    }.bind(this);

    this.connectInstagramQueue = function(login, password, securityCode, callback) {
      return this.POST(this.fpmUrl + '/team/'+this.profile._id+'/instagram/connect', { login: login, password: password, securityCode: securityCode }, callback);
    }.bind(this);

    this.connectAccount = function(account, callback) {
      return this.POST(this.fpmUrl + '/team/'+this.profile._id+'/accounts', { account: account }, callback);
    }.bind(this);

    this.isRecaptchaRequired = function(increment, callback) {
      return this.GET(this.fpmUrl + '/share/recaptcha/'+increment, callback);
    }.bind(this);

    this.switchUser = function(filter) {
      var deferred = $q.defer();
      this.POST(this.fpmUrl + '/auth/switch', filter)
      .success(function(data/*, status, headers, config*/) {
        // $window.location = '/teams/0/extension';
        deferred.resolve(data);
      }.bind(this))
      .error(function(data/*, status, headers, config*/) {
        deferred.reject(data);
      }.bind(this));
      return deferred.promise;
    }.bind(this);

    this.createProfile = function(name, callback) {
      return this.POST(this.fpmUrl + '/profile/create', { name : name }, callback);
    }.bind(this);

    this.deleteProfile = function(reason1, reason2, reason3, callback) {
      return this.POST(this.fpmUrl + '/profile/'+this.profile._id+'/delete', {reason1: reason1, reason2: reason2, reason3: reason3}, callback);
    }.bind(this);

    this.profileEnableDisableAccount = function(account, enable, callback) {
      return this.PUT(this.fpmUrl + '/account/' + account._id + '/' + (enable ? 'enable' : 'disable'), callback);
    }.bind(this);

    this.updateAccountScheduling = function(account, scheduling, callback) {
      return this.PUT(this.fpmUrl + '/account/' + account._id + '/scheduling', scheduling, callback);
    }.bind(this);

    this.profileAllowAccountSource = function(accountId, sourceAccountId, allow, callback) {
      return this.PUT(this.fpmUrl + '/account/' + accountId + '/source', {
        src: sourceAccountId,
        allow: allow
      }, callback);
    }.bind(this);

    // shortener: { type: '', username: '', apiKey: '' }
    this.profileShortenerAccount = function(account, shortener, callback) {
      return this.PUT(this.fpmUrl + '/account/' + account._id + '/shortener', shortener, callback);
    }.bind(this);

    this.profileSetupAccount = function(account, setup, callback) {
      return this.PUT(this.fpmUrl + '/account/' + account._id + '/setup', setup, callback);
    }.bind(this);

    this.profileAccountReposts = function(account, callback) {
      return this.GET(this.fpmUrl + '/account/' + account._id + '/reposts', callback);
    }.bind(this);

    this.profileAccountQueue = function(account, callback) {
      return this.GET(this.fpmUrl + '/account/' + account._id + '/queue', callback);
    }.bind(this);

    this.profileAccountShortenLink = function(account, url, callback) {
      return this.POST(this.fpmUrl + '/account/' + account._id + '/link/shorten', {
        longUrl: url
      }, callback);
    }.bind(this);

    this.addAccountMember = function(account, role, memberId, callback) {
      return this.PUT(this.fpmUrl + '/account/' + account._id+'/members', {
        role: role,
        memberId: memberId
      }, callback);
    }.bind(this);

    this.removeAccountMember = function(account, memberId, callback) {
      return this.DELETE(this.fpmUrl + '/account/' + account._id+'/members/'+memberId, callback);
    }.bind(this);

    // this.profileAccountExtension = function(account, callback) {
    //   return this.GET(this.fpmUrl + '/account/' + account._id+'/extension', callback);
    // }.bind(this);

    this.affiliateSignup = function(callback) {
      return this.GET(this.fpmUrl + '/affiliate/'+this.profile._id+'/signup', callback);
    }.bind(this);

    this.profileTransactions = function(callback) {
      return this.GET(this.fpmUrl + '/profile/'+this.profile._id+'/transactions', callback);
    }.bind(this);

    this.profileMembers = function(callback) {
      return this.GET(this.fpmUrl + '/profile/'+this.profile._id+'/members', callback);
    }.bind(this);

    this.profileAccountsQueueStat = function(callback) {
      return this.GET(this.fpmUrl + '/profile/'+this.profile._id+'/queues/stat', callback);
    }.bind(this);

    function qs(q) {
      var s = '';
      Object.keys(q)
        .filter(function(k) { return q[k] !== undefined && q[k] !== null; })
        .forEach(function(k) { s += (s ? '&' : '') + k + '=' + encodeURIComponent(q[k]); });
      return s ? '?' + s : '';
    }

    this.profileListQueue = function(query, callback) {
      return this.GET(this.fpmUrl + '/profile/'+this.profile._id+'/queue'+qs(query), callback);
    }.bind(this);

    this.profileListTimeline = function(query, callback) {
      return this.GET(this.fpmUrl + '/profile/'+this.profile._id+'/timeline'+qs(query), callback);
    }.bind(this);

    this.profileDrafts = function(skip, limit, callback) {
      return this.GET(this.fpmUrl + '/profile/'+this.profile._id+'/drafts?skip='+(skip||0)+(limit?'&limit='+limit:''), callback);
    }.bind(this);

    this.profileDeleteDraft = function(draft, callback) {
      return this.DELETE(this.fpmUrl + '/profile/'+this.profile._id+'/drafts/'+draft._id, callback);
    }.bind(this);

    this.profileCancelInvitation = function(invitationId, callback) {
      return this.DELETE(this.fpmUrl + '/profile/'+this.profile._id+'/invitations/'+invitationId, callback);
    }.bind(this);

    this.profileRemoveMember = function(memberId, callback) {
      return this.DELETE(this.fpmUrl + '/profile/'+this.profile._id+'/members/'+memberId, callback);
    }.bind(this);

    this.profileListGoogleCollections = function(uid, callback) {
      return this.GET(this.fpmUrl + '/google/list/collections/'+this.profile._id+'/'+uid, callback);
    }.bind(this);

    // data: {email:..., role:...}
    this.profileInviteMember = function(data, callback) {
      return this.POST(this.fpmUrl + '/profile/'+this.profile._id+'/members', data, callback);
    }.bind(this);

    this.queuePostReschedule = function(postId, unixUTC, callback) {
      return this.GET(this.fpmUrl + '/queue/'+postId+'/reschedule/'+unixUTC, callback);
    }.bind(this);

    this.queuePostPublishNow = function(postId, callback) {
      return this.GET(this.fpmUrl + '/queue/'+postId+'/now', callback);
    }.bind(this);

    this.queuePostDelete = function(postId, callback) {
      return this.GET(this.fpmUrl + '/queue/'+postId+'/delete', callback);
    }.bind(this);

    this.queuePostMove = function(postId, index, callback) {
      return this.GET(this.fpmUrl + '/queue/'+postId+'/move/'+(index||0), callback);
    }.bind(this);

    this.accountQueueStat = function(accountId, callback) {
      return this.GET(this.fpmUrl + '/account/'+accountId+'/queue/stat', callback);
    }.bind(this);

    this.accountQueueEmpty = function(accountId, callback) {
      return this.GET(this.fpmUrl + '/account/'+accountId+'/queue/empty', callback);
    }.bind(this);

    this.shareFormatGoogle = function(html, callback) {
      return this.POST(this.fpmUrl + '/share/format/google', {html: html}, callback);
    }.bind(this);

    this.share = function(post, callback) {
      return this.POST(this.fpmUrl + '/share', post, callback);
    }.bind(this);

    this.profileAccountTimeline = function(account, direction, callback) {
      return this.GET(this.fpmUrl + '/account/' + account._id + '/timeline/'+direction, callback);
    }.bind(this);

    this.checkPromoCode = function(plan, interval, promoCode, callback) {
      return this.POST(this.fpmUrl + '/discount/calculate', {
        code: promoCode,
        plan: plan,
        interval: interval,
        profileId: this.profile._id
      }, callback);
    }.bind(this);

    this.photoIdentify = function(photoUrl, callback) {
      return this.POST(this.fpmUrl + '/photo/identify', {
        url: photoUrl
      }, callback);
    }.bind(this);

    this.uploadPhoto = function(photoUrl, callback) {
      return this.POST(this.fpmUrl + '/upload/photo', {
        url: photoUrl,
        pid: this.profile._id
      }, callback);
    }.bind(this);

    this.profileAccountRemoveFromQueue = function(account, itemId, callback) {
      return this.DELETE(this.fpmUrl + '/account/' + account._id + '/queue/'+itemId, callback);
    }.bind(this);

    this.profileAccountQueueScheduleToNow = function(account, itemId, callback) {
      return this.PUT(this.fpmUrl + '/account/' + account._id + '/queue/'+itemId, callback);
    }.bind(this);

    this.profileAccountQueueReschedule = function(account, itemId, repostAt, callback) {
      return this.PUT(this.fpmUrl + '/account/' + account._id + '/queue/'+itemId+'/'+repostAt, callback);
    }.bind(this);

    this.profileAccountQueueRetry = function(account, activityId, callback) {
      return this.PUT(this.fpmUrl + '/account/' + account._id + '/queue/activity/'+activityId+'/retry', callback);
    }.bind(this);

    this.profileAccountChangePreset = function(account, callback) {
      return this.PUT(this.fpmUrl + '/account/'+account._id+'/preset', {
        preset: account.preset
      }, callback);
    }.bind(this);

    this.profileChangePreset = function(updateAccounts, callback) {
      return this.PUT(this.fpmUrl + '/profile/'+this.profile._id+'/preset', {
        updateAccounts: updateAccounts||false,
        preset: this.profile.preset
      }, callback);
    }.bind(this);

    this.profileCreateControlHashtag = function(hashtag, callback) {
      return this.POST(this.fpmUrl + '/profile/'+this.profile._id+'/hashtags', {
        hashtag: hashtag
      }, callback);
    }.bind(this);

    this.profileRemoveControlHashtag = function(hashtag, callback) {
      return this.POST(this.fpmUrl + '/profile/'+this.profile._id+'/hashtags/delete', {
        hashtag: hashtag
      }, callback);
    }.bind(this);

    this.profileCreateNoShareControlHashtag = function(hashtag, callback) {
      return this.POST(this.fpmUrl + '/profile/'+this.profile._id+'/hashtags', {
        hashtag: hashtag,
        noshare: true
      }, callback);
    }.bind(this);

    this.profileRemoveNoShareControlHashtag = function(hashtag, callback) {
      return this.POST(this.fpmUrl + '/profile/'+this.profile._id+'/hashtags/delete', {
        hashtag: hashtag,
        noshare: true
      }, callback);
    }.bind(this);

    this.profileUpdateControlHashtag = function(data, callback) {
      return this.PUT(this.fpmUrl + '/profile/'+this.profile._id+'/hashtags', data, callback);
    }.bind(this);

    this.profileGoogleSaveOrganization = function(callback) {
      return this.PUT(this.fpmUrl + '/profile/'+this.profile._id+'/organization', this.profile.subject, callback);
    }.bind(this);

    this.profileUpdateProfileName = function(name, callback) {
      return this.PUT(this.fpmUrl + '/profile/'+this.profile._id+'/name', { name: name }, callback);
    }.bind(this);

    this.profileUpdateContact = function(contact, callback) {
      return this.PUT(this.fpmUrl + '/profile/'+this.profile._id+'/contact', contact, callback);
    }.bind(this);

    this.profileUpdateContactName = function(name, callback) {
      return this.profileUpdateContact({ name: name }, callback);
    }.bind(this);

    this.profileUpdateContactEmail = function(email, callback) {
      return this.profileUpdateContact({ email: email }, callback);
    }.bind(this);

    this.notifySupport = function(data, callback) {
      return this.POST(this.fpmUrl + '/notify/support', data, callback);
    }.bind(this);

    this.profileRemoveNoShareControlHashtag = function(hashtag, callback) {
      return this.POST(this.fpmUrl + '/profile/'+this.profile._id+'/hashtags/delete', {
        hashtag: hashtag,
        noshare: true
      }, callback);
    }.bind(this);

    this.createDraft = function(draft, callback) {
      return this.POST(this.fpmUrl + '/profile/'+this.profile._id+'/drafts', draft, callback);
    }.bind(this);

    this.createDraft2 = function(draft, profile, callback) {
      return this.POST(this.fpmUrl + '/profile/'+profile._id+'/drafts', draft, callback);
    }.bind(this);

    this.billableProfilesCount = function(callback) {
      return this.GET(this.fpmUrl + '/profile/'+this.profile._id+'/profiles/billable', callback);
    }.bind(this);

    this.creditInfo = function(callback) {
      return this.GET(this.fpmUrl + '/profile/'+this.profile._id+'/credit/info', callback);
    }.bind(this);

    this.creditDebits = function(callback) {
      return this.GET(this.fpmUrl + '/profile/'+this.profile._id+'/credit/debits', callback);
    }.bind(this);

    this.creditCosts = function(callback) {
      return this.GET(this.fpmUrl + '/profile/'+this.profile._id+'/credit/costs', callback);
    }.bind(this);

    this.creditPromoCode = function(promoCode, callback) {
      return this.POST(this.fpmUrl + '/profile/'+this.profile._id+'/credit/promo', {
        code: promoCode
      }, callback);
    }.bind(this);

    this.creditBalance = function(callback) {
      return this.GET(this.fpmUrl + '/profile/'+this.profile._id+'/credit/balance', callback);
    }.bind(this);

    this.braintreeBalance = function(callback) {
      return this.GET(this.fpmUrl + '/profile/'+this.profile._id+'/braintree/balance', callback);
    }.bind(this);

    this.braintreeClientToken = function(callback) {
      return this.GET(this.fpmUrl + '/profile/'+this.profile._id+'/braintree/client/token', callback);
    }.bind(this);

    this.braintreeSubscribe = function(data, callback) {
      return this.POST(this.fpmUrl + '/profile/'+this.profile._id+'/braintree/subscribe', data, callback);
    }.bind(this);

    this.braintreePayment = function(data, callback) {
      return this.POST(this.fpmUrl + '/profile/'+this.profile._id+'/braintree/pay', data, callback);
    }.bind(this);

    this.freeSubscribe = function(data, callback) {
      return this.POST(this.fpmUrl + '/profile/'+this.profile._id+'/free/subscribe', data, callback);
    }.bind(this);

    this.braintreePrepay = function(data, callback) {
      return this.POST(this.fpmUrl + '/profile/'+this.profile._id+'/braintree/prepay', data, callback);
    }.bind(this);

    this.braintreeUpdateCard = function(data, callback) {
      return this.POST(this.fpmUrl + '/profile/'+this.profile._id+'/braintree/card', data, callback);
    }.bind(this);

    this.updateUserAnalytics = function(callback) {
      //return this.PUT(this.fpmUrl + '/user/analytics', {aid: Storage.clientId()}, callback);
      if (callback) {
        callback();
      }
    }.bind(this);

    this.profileSaveRoute = function(route, callback) {
      return this.POST(this.fpmUrl + '/profile/'+this.profile._id+'/routes',{
        route: route
      }, callback);
    }.bind(this);

    this.saas = function(callback) {
      return this.GET(this.fpmUrl + '/saas', callback);
    }.bind(this);

    this.schedulePost = function(data, callback) {
      return this.POST(this.fpmUrl + '/activity', data, callback);
    }.bind(this);

    this.publishReply = function(activityLockId, activityId, dstAccountId, msg, callback) {
      return this.POST(this.fpmUrl + '/activity/'+activityLockId+'/reply',{
        profile: this.profile._id.toString(),
        activity: activityId,
        account: dstAccountId,
        msg: msg
      }, callback);
    }.bind(this);

    this.removeReply = function(activityLockId, replyId, dstAccountId, callback) {
      return this.PUT(this.fpmUrl + '/activity/'+activityLockId+'/reply/'+replyId+'/delete',{
        profile: this.profile._id.toString(),
        account: dstAccountId
      }, callback);
    }.bind(this);

    this.profileRemoveSocialProfile = function(socialProfileId, callback) {
      return this.DELETE(this.fpmUrl+'/profile/'+this.profile._id+'/socialprofile/'+socialProfileId)
      .success(function(data/*, status, headers, config*/) {
          this.profile.accounts = data.user.accounts;
          this.profile.routes = data.user.routes;
          this.profile.profiles = data.user.profiles;
          callback(null, true);
        }.bind(this))
      .error(function(data/*, status, headers, config*/) {
          callback(data, false);
        });
    }.bind(this);

    this.profileRemoveAccount = function(account, callback) {
      return this.DELETE(this.fpmUrl + '/account/' + account._id)
      .success(function(data/*, status, headers, config*/) {
          this.profile.accounts = data.user.accounts;
          this.profile.routes = data.user.routes;
          this.profile.profiles = data.user.profiles;
          callback(null, true);
        }.bind(this))
      .error(function(data/*, status, headers, config*/) {
          callback(data, false);
        });
    }.bind(this);

    this.findProfileAccount = function(networkCode, accountCode, uid) {
      var a, account = null,
          accounts = this.profile && this.profile.accounts && this.profile.accounts.length > 0 ? this.profile.accounts : null;
      if (accounts) {
        for (var i = 0; i < accounts.length; i++) {
          a = accounts[i];
          if (a.network === networkCode && a.account === accountCode && a.uid === uid) {
            account = a;
            break;
          }
        }
      }
      return account;
    }.bind(this);

    this.findProfileAccountById = function(accountId) {
      var accounts = this.profile && this.profile.accounts && this.profile.accounts.length > 0 ? this.profile.accounts : null;
      if (accounts) {
        for (var i = 0; i < accounts.length; i++) {
          if (accounts[i]._id === accountId) {
            return accounts[i];
          }
        }
      }
      return null;
    }.bind(this);

    this.updateQueueSize = function(account, callback) {
      if (account) {
        this.updateAccountQueueSize(account, callback);
      } else {
        this.updateAccountsQueueSize(callback);
      }
    }.bind(this);

    this.updateAccountQueueSize = function(account, callback) {
      this.accountQueueStat(account._id, function(err, data) {

        account.queue = account.queue || {};
        account.queue.size = data && data.size || 0;

        if (callback) {
          callback();
        }
      }.bind(this));
    }.bind(this);

    this.updateAccountsQueueSize = function(callback) {

      var accounts = this.profile && this.profile.accounts || [];
      if (!accounts.length) {
        return;
      }

      this.profileAccountsQueueStat(function(err, data) {

        var acc;

        accounts.forEach(function(account) {

          acc = data && data.accounts && data.accounts[account._id];

          account.available = true;
          account.queue = account.queue || {};
          account.queue.size = acc && acc.size || 0;
        });

        if (callback) {
          callback();
        }
      }.bind(this));
    }.bind(this);

    this.isRoutedFrom = function(srcAccount, dstAccount) {
      var routed = false,
          route = this.findProfileAccountRoutes(srcAccount) || {},
          dst = route.ddg;

      if (dst && dst.length > 0 && _.contains(dst, dstAccount._id)) {
        routed = true;
      } else {
        dst = route.chdg;
        if (dst && dst.length > 0) {
          for (var j = 0; j < dst.length; j++) {
            if (_.contains(dst[j].dst, dstAccount._id)) {
              routed = true;
              break;
            }
          }
        }
      }
      return routed;
    }.bind(this);

    this.findRouteFrom = function(srcAccount, dstAccount) {
      var routed = false,
          route = this.findProfileAccountRoutes(srcAccount) || {},
          dst = route.ddg;

      if (dst && dst.length > 0 && _.contains(dst, dstAccount._id)) {
        routed = {
          type: 'ddg',
          route: route,
          account: srcAccount
        };
      }
      dst = route.chdg;
      if (dst && dst.length > 0) {
        for (var j = 0; j < dst.length; j++) {
          if (_.contains(dst[j].dst, dstAccount._id)) {
            routed = {
              type: routed ? 'ddg+chdg' : 'chdg',
              route: route,
              account: srcAccount
            };
            break;
          }
        }
      }
      return routed;
    }.bind(this);

    this.countAccountsByType = function(networkCode, accountCode) {
      var cnt = 0,
          accounts = this.profile.accounts;
      if (accounts && accounts.length > 0) {
        accounts.forEach(function(a) {
          if (a.network === networkCode && a.account === accountCode) {
            cnt++;
          }
        });
      }
      return cnt;
    }.bind(this);

    this.countAccountsByNetwork = function(networkCode) {
      var cnt = 0;
      if (this.profile.accounts && this.profile.accounts.length > 0) {
        this.profile.accounts.forEach(function(a) {
          if (a.network === networkCode) {
            cnt++;
          }
        });
      }
      return cnt;
    }.bind(this);

    this.isAnotherAccountAllowed = function() {
      var use = this.profile ? this.profile.use : null,
          accounts = this.profile.accounts ? this.profile.accounts.length : 0;
      return use ? (
         use.maxAccounts === null ||
         use.maxAccounts === undefined ||
         use.maxAccounts === -1 ||
         use.maxAccounts > accounts ? true : false) : true;
    }.bind(this);

    this.isAnotherAccountDisallowed = function() {
      return !this.isAnotherAccountAllowed();
    }.bind(this);

    this.isAnotherAccountAllowedByType = function(networkName, accountName) {
      var use = this.profile ? this.profile.use : null,
          network = use && use.network && networkName ? use.network[networkName] : null,
          networkLimit = network ? network.limit : null,
          accountLimit = network && accountName && network[accountName] ? network[accountName].limit : null,
          networkCount = this.countAccountsByNetwork(types.network[networkName].code),
          accountCount = accountName ? this.countAccountsByType(types.network[networkName].code, types.account[accountName].code) : 0,
          /*jshint -W116*/
          isNetworkAllowed = networkLimit == null || networkLimit === -1 ? true : (networkLimit > networkCount),
          /*jshint -W116*/
          isAccountAllowed = accountLimit == null || accountLimit === -1 || !accountName ? true : (accountLimit > accountCount);
      return this.isAnotherAccountAllowed() && isNetworkAllowed && isAccountAllowed ? true : false;
    }.bind(this);

    this.isAnotherAccountDisallowedByType = function(networkName, accountName) {
      return !this.isAnotherAccountAllowedByType(networkName, accountName);
    }.bind(this);

    this.newProfileAccountUpdates = function(account, routes) {
      this.addOrReplaceProfileAccount(account);
      this.updateProfileRoutes(routes);
    }.bind(this);

    this.addOrReplaceProfileAccount = function(account) {
      var a, i, add = true,
          accounts = this.profile.accounts;

      if (accounts && accounts.length > 0) {
        for (i = 0; i < accounts.length; i++) {
          a = accounts[i];
          if (a.network === account.network && a.account === account.account && a.uid === account.uid) {
            accounts[i] = account;
            add = false;
            break;
          }
        }
      }
      if (add) {
        if (!this.profile.accounts) {
          this.profile.accounts = [account];
        } else {
          this.profile.accounts.push(account);
        }
      }
      return add;
    }.bind(this);

    this.updateProfileRoutes = function(routes) {
      if (routes) {
        this.profile.routes = routes;
      }
    }.bind(this);

    this.addOrReplaceProfileRoute = function(route) {
      var add = true,
          routes = this.profile.routes;

      if (routes && routes.length > 0) {
        for (var i = 0; i < routes.length; i++) {
          if (routes[i].src === route.src) {
            routes[i] = route;
            add = false;
          }
        }
      }
      if (add) {
        if (!this.profile.routes) {
          this.profile.routes = [];
        }
        this.profile.routes.push(route);
      }
      return add;
    }.bind(this);

    this.findProfileAccountRoutes = function(account) {
      var r, routes = this.profile.routes;
      if (routes && routes.length > 0) {
        for (var i = 0; i < routes.length; i++) {
          r = routes[i];
          if (r.src === account._id) {
            return r;
          }
        }
      }
      return null;
    }.bind(this);

    this.existsRoutingHashtag = function(account, hashtag) {
      var ht = hashtag.toLowerCase(),
          route = this.findProfileAccountRoutes(account);
      if (route && route.chdg && route.chdg.length > 0) {
        for (var i = 0; i < route.chdg.length; i++) {
          if (_.contains(route.chdg[i].hashtag, ht)) {
            return true;
          }
        }
      }
      return false;
    }.bind(this);

    this.isPremium = function() {
      return this.profile && this.profile.plan && this.profile.plan.name !== 'FREE' && this.profile.plan.name !== 'FREEFOREVER' && this.profile.plan.name !== 'TRIAL' ? true : false;
    }.bind(this);

    this.isSubscribed = function() {
      return this.profile && this.profile.subscription && this.profile.subscription.id ? true : false;
    }.bind(this);

    this.isGoogleProfile = function(accountId) {
      var acc = this.findProfileAccountById(accountId);
      return acc && acc.network === types.network.google.code && acc.account === types.account.profile.code ? true : false;
    }.bind(this);

    this.isPublishingAvailable = function(account) {
      var isGoogleProfile = account && account.network === types.network.google.code && account.account === types.account.profile.code,
          isGooglePage = account && account.network === types.network.google.code && account.account === types.account.page.code,
          isPublishableGooglePage = account && isGooglePage && account.dir > 0;
      return isPublishableGooglePage ||
            (isGoogleProfile && this.profile && this.profile.use.publishToGoogleProfile) ||
            (account && (account.dir === 2 || account.dir === 1)) ? true : false;
    }.bind(this);

    this.isAcceptingReposts = function(account) {
      var isGoogle = account && account.network === types.network.google.code,
          isGoogleProfile = isGoogle && account.account === types.account.profile.code,
          isGoogleCommunity = isGoogle && account.account === types.account.community.code,
          isGoogleCollection = isGoogle && account.account === types.account.collection.code,
          isPinterest = account && account.network === types.network.pinterest.code,
          isPinterestBoard = isPinterest && account.account === types.account.board.code;
      return (!isGoogleProfile && !isGoogleCommunity && !isGoogleCollection && !isPinterestBoard) ||
             (isGoogleProfile && this.profile && this.profile.use.repostToGoogleProfile) ||
             (isGoogleCommunity && this.profile && this.profile.use.repostToGoogleCommunity) ||
             (isGoogleCollection && this.profile && this.profile.use.repostToGoogleCollection) ||
             (isPinterestBoard && this.profile && this.profile.use.repostToPinterest) ? true : false;
    }.bind(this);

    this.urlAddCommunity = function() {
      return urls.urlParams(config.api.url+config.api.ops.google.addCommunity, {profile: this.profile._id});
    }.bind(this);

    this.urlAddCollection = function() {
      return urls.urlParams(config.api.url+config.api.ops.google.addCollection, {profile: this.profile._id});
    }.bind(this);

    this.authRedirect = function(type, query) {
      urls.redirect(config.api.url+config.api.ops.google.auth, {
        profile: this.profile._id,
        type: type
      }, _.extend({
        fpmetoken: this.token
      }, query));
    }.bind(this);

    this.reauthRedirect = function(account, query) {
      urls.redirect(config.api.url+config.api.ops.google[account.parentId ? 'reauthWithParent':'reauth'], {
        profile: this.profile._id,
        type: types.account.page.code === account.account ? 'page' : 'profile',
        actorId: account.uid,
        parentId: account.parentId
      }, _.extend({
        fpmetoken: this.token
      }, query));
    }.bind(this);

    this.OP = function(method, url, data, headers, callback) {

      if (typeof data === 'function' && !headers && !callback) {
        callback = data;
        data = null;
      }

      if (typeof headers === 'function' && !callback) {
        callback = headers;
        headers = null;
      }

      if (this.token) {
        headers = _.extend({
          'X-FPME-Token': this.token
        }, headers || {});
      }

      if (this.xsrfToken) {
        if (!_.contains( ['GET', 'HEAD', 'OPTIONS'], method) && url.indexOf(config.api.url) === 0) {
          headers = _.extend({
            'X-XSRF-TOKEN': this.xsrfToken
          }, headers || {});
        }
      }

      var q = $http({method: method,
        url: url,
        data: data,
        headers: headers});

      if (callback) {
        q.success(function(data/*, status, headers, config*/) { callback(null, data || true); })
        .error(function(data/*, status, headers, config*/) { callback(data || true); });
      }

      return q;
    }.bind(this);

    this.GET = function(url, headers, callback) {
      return this.OP('GET', url, null, headers, callback);
    }.bind(this);

    this.PUT = function(url, data, headers, callback) {
      return this.OP('PUT', url, data, headers, callback);
    }.bind(this);

    this.POST = function(url, data, headers, callback) {
      return this.OP('POST', url, data, headers, callback);
    }.bind(this);

    this.DELETE = function(url, data, headers, callback) {
      return this.OP('DELETE', url, data, headers, callback);
    }.bind(this);

    if ($initialState && $initialState.user && $initialState.user._id) {

      this.signedIn = true;
      this.funds = $initialState.funds;
      this.user = $initialState.user;
      this.sso = $initialState.sso;
      this.token = $initialState.token || '';
      this.xsrfToken = $initialState['XSRF-TOKEN'] || null;
      this.extension = {
        presence: null
      };

      this.profiles = $initialState.profiles;

      if (this.profiles && this.profiles.length && this.user) {
        this.privateProfile = _.filter(this.profiles, function(p) {
          return _.contains(p.members.owner, this.user._id);
        }.bind(this))[0];
        if (this.privateProfile && !this.privateProfile.name) {
          this.privateProfile.name = 'Personal';
        }
      }

      // this.accounts = _.chain(this.profiles).map(function(p) {
      //   return _.map(p.accounts, function(a) {
      //     a.profile = p;
      //     return a;
      //   });
      // }).flatten().value();

      this.profile = this.privateProfile;
      config.plans = this.profile && this.profile.plans;

      //Storage.signin(this.token);

      async.nextTick(function() {
        Analytics.track.signin(this.user, this.profile);
      }.bind(this));

      $rootScope.$broadcast('event:signin', $initialState);

      // zakomentovano protoze to znefunkcnuje pocatecni nacteni routy
      // $apply($rootScope);
    } else {

      this.signout();

      $rootScope.$broadcast('event:signin:error', {});

      // zakomentovano protoze to znefunkcnuje pocatecni nacteni routy
      // $apply($rootScope);
    }

    // load Google+ JS SDK library
    $window.___gcfg = {
      parsetags: 'explicit'
    };

    $window.google_plus_sign_in_render = function() {

      this.loaded = true;

      $rootScope.$broadcast('event:google:loaded');

      $apply($rootScope);
    }.bind(this);

    // Load the SDK Asynchronously
    (function() {
      var po = document.createElement('script');
      po.type = 'text/javascript';
      po.async = true;
      po.src = 'https://apis.google.com/js/client:plusone.js?onload=google_plus_sign_in_render';
      var s = document.getElementsByTagName('script')[0];
      s.parentNode.insertBefore(po, s);
    })();
  }];

  this.$get = ['$injector', function($injector) {
    return $injector.instantiate(Google, {
      url: this.url,
      urlplus: this.urlplus,
      scope: this.scope,
      requestvisibleactions: this.requestvisibleactions,
      clientid: this.clientid,
      fpmAuthUrl: this.fpmAuthUrl,
      fpmAuthCheckUrl: this.fpmAuthCheckUrl,
      fpmUrl: this.fpmUrl
    });
  }];
});
