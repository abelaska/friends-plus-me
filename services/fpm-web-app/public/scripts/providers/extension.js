'use strict';
/*jshint -W106*/

angular.module('extension', []).provider('Extension', function() {

  var Extension = ['$rootScope', '$window', '$q', 'Google', 'Log', 'config', '_', function($rootScope, $window, $q, Google, Log, config, _) {

    this.id = config.extension.id;
    this.isEnabled = $window && $window.chrome && $window.chrome.runtime ? true : false;
    this.isAvailable = false;
    this.browser = null;
    this.version = null;
    this.versionNumber = null;

    function sortByName(a, b) {
      a = (a.name||'').toLowerCase();
      b = (b.name||'').toLowerCase();
      if(a < b) { return -1; }
      if(a > b) { return 1; }
      return 0;
    }

    function deepClone(obj) {
      if (!obj) {
        return obj;
      }
      if (_.isArray(obj)) {
        return _.map(obj, deepClone);
      }
      if (_.isObject(obj)) {
        return _.chain(obj).clone().mapObject(function(v) {
          return deepClone(v);
        }).value();
      }
      return obj;
    }

    this.post = function(msg, callback) {
      if (this.isEnabled) {
        try {
          $window.chrome.runtime.sendMessage(this.id, msg, callback);
        } catch(e) {
          Log.error('Failed to post message to extension', {
            message: msg,
            error: e
          });
          callback({error: {message: 'Communication with the extension have failed'}});
        }
      } else {
        callback({error: {message: 'Extension is not available'}});
      }
    }.bind(this);

    this.isSuccess = function(data, msg, msgData) {
      var success = data && data.success,
          error = data && data.error,
          op = error && error.error && error.error.op,
          httpResponse = error && error.error && error.error.error && error.error.error.response,
          status = httpResponse && httpResponse.status,
          isHttp403 = status === 403,
          isHttp400 = status === 400,
          isHttp500 = status === 500,
          isHttp504 = status === 504, // gateway timeout
          isLinkPreviewOp = op === 'Plus.linkPreviewOld' || op === 'Plus.linkPreviewNew',
          isInvalidLinkPreviewOp = isLinkPreviewOp && (isHttp400 || isHttp500 || isHttp504),
          isExtensionNotAvailable = error && error.message === 'Extension is not available' ? true : false,
          ignoreError = isHttp403 || isExtensionNotAvailable || isInvalidLinkPreviewOp;

      if (!success && data && !ignoreError) {
        Log.error(msg, _.extend({
          error: data,
          extension: this.version
        }, msgData || {}));
      }

      return success;
    }.bind(this);

    this.pingApp = function() {
      var deferred = $q.defer();

      this.post({
        type: 'ping-app'
      }, function(data) {

        var success = this.isSuccess(data, 'Failed to ping F+M application over WS');
        if (success) {
          deferred.resolve(deepClone(data));
        } else {
          deferred.reject(data);
        }
      }.bind(this));

      return deferred.promise;
    }.bind(this);

    this._search = function(msg, callback) {
      var deferred = $q.defer();

      this.post(msg, function(data) {

        this.isSuccess(data, 'Failed to query Google+ '+msg.type);

        callback(deferred, data);

      }.bind(this));

      return deferred.promise;
    }.bind(this);

    this.searchContact = function(actorId, query) {
      return this._search({
        type: 'search-contact',
        actorId: actorId,
        query: query
      }, function(deferred, data) {
        if (data && data.success && data.contacts) {
          var contacts = _.map(data.contacts, function(contact) {
            contact.type = 'person';
            contact.class = 'person';
            return contact;
          });
          deferred.resolve(deepClone(contacts));
        } else {
          deferred.reject([]);
        }
      }.bind(this));
    }.bind(this);

    this.searchContactAll = function(query) {
      return this._search({
        type: 'search-contact-all',
        query: query
      }, function(deferred, data) {
        if (data && data.success && data.contacts) {
          var contacts = _.map(data.contacts, function(contact) {
            contact.type = 'person';
            contact.class = 'person';
            return contact;
          });
          deferred.resolve(deepClone(contacts));
        } else {
          deferred.reject([]);
        }
      }.bind(this));
    }.bind(this);

    this.searchPeople = function(query) {
      return this._search({
        type: 'search-contact-all',
        query: query
      }, function(deferred, data) {
        if (data && data.success && data.contacts) {
          deferred.resolve(deepClone(data.contacts));
        } else {
          deferred.reject([]);
        }
      }.bind(this));
    }.bind(this);

    this.searchHashtagAll = function(query) {
      return this._search({
        type: 'search-hashtag-all',
        query: query
      }, function(deferred, data) {
        if (data && data.success && data.hashtags) {
          var hashtags = _.map(data.hashtags, function(hashtag) {
            return {
              type: 'hashtag',
              name: hashtag,
            };
          });
          deferred.resolve(deepClone(hashtags));
        } else {
          deferred.reject([]);
        }
      }.bind(this));
    }.bind(this);

    this.getAccounts = function() {
      var deferred = $q.defer();

      this.post({
        type: 'get-google-accounts'
      }, function(data) {

        this.isSuccess(data, 'Failed to get Google+ accounts');

        if (data && data.success && data.accounts) {

          var u = {};

          if (data && data.accounts && data.accounts.length) {
            data.accounts.forEach(function(a) {
              if (!u[a.info.id]) {
                u[a.info.id] = a;
              }
            });
            data.accounts = _.values(u);
          }

          deferred.resolve(deepClone(data.accounts));
        } else {
          deferred.reject(data);
        }
      }.bind(this));

      return deferred.promise;
    }.bind(this);

    this.scanAccount = function(actorId) {
      var deferred = $q.defer();

      this.post({
        type: 'scan-google-account',
        actorId: actorId
      }, function(data) {

        this.isSuccess(data, 'Failed to scan Google+ account '+actorId);

        if (data && data.success && data.account) {
          deferred.resolve(deepClone(data.account));
        } else {
          deferred.reject(data);
        }
      }.bind(this));

      return deferred.promise;
    }.bind(this);

    this.listCollections = function(actorId) {
      var deferred = $q.defer();

      this.post({
        type: 'refresh-my-collections',
        actorId: actorId
      }, function(data) {

        this.isSuccess(data, 'Failed to scan '+actorId+' collections');

        if (data && data.success && data.collections) {

          var collections = _.map(deepClone(data.collections), function(collection) {
            // zakomentovano pro nove rohrani k extensionam
            // collection.type = 'collection';
            // collection.class = 'collection';
            return collection;
          });

          deferred.resolve(collections);
        } else {
          deferred.reject(data);
        }
      }.bind(this));

      return deferred.promise;
    }.bind(this);

    this.refreshCollections = function(actorId) {
      var deferred = $q.defer();

      this.post({
        type: 'refresh-my-collections',
        actorId: actorId
      }, function(data) {

        this.isSuccess(data, 'Failed to scan '+actorId+' collections');

        if (data && data.success && data.collections) {

          var collections = _.map(deepClone(data.collections), function(collection) {
            collection.type = 'collection';
            collection.class = 'collection';
            return collection;
          });

          deferred.resolve(collections);
        } else {
          deferred.reject(data);
        }
      }.bind(this));

      return deferred.promise;
    }.bind(this);

    this.scanCommunityCategories = function(actorId, communityId) {
      var deferred = $q.defer();

      this.post({
        type: 'get-community-categories',
        actorId: actorId,
        communityId: communityId
      }, function(data) {

        this.isSuccess(data, 'Failed to scan community '+communityId+' categories');

        if (data && data.success && data.categories) {
          deferred.resolve(deepClone(data.categories));
        } else {
          deferred.reject(data);
        }
      }.bind(this));

      return deferred.promise;
    }.bind(this);

    this.scanAccountForCirclesAndCommunities = function(actorId) {
      return this.scanAccount(actorId).then(function(account) {
        var circles = deepClone(account.circles),
            communities = deepClone(account.communities);

        circles.sort(sortByName).forEach(function(item) {
          item.uid = item.id;
          item.type = 'circle';
          item.icon = 'icon-google icon-google-my-circle';
          item.class = 'circle my-circle';
          item.showRemoveButton = true;
          item.users = item.users && item.users.length || 0;
        });
        communities.sort(sortByName).forEach(function(item) {
          item.uid = item.id;
          item.type = 'community';
          item.icon = 'icon-google icon-google-community';
          item.class = 'circle community';
          item.showRemoveButton = true;
          item.users = item.numMembers || 0;
        });

        return {
          circles: circles,
          communities: communities
        };
      }, function(err) {
        return err;
      });
    }.bind(this);

    this.listCircles = function(actorId) {
      return this.scanAccount(actorId).then(function(account) {
        return (account && account.circles && deepClone(account.circles)) || [];
      }, function(err) {
        return err;
      });
    }.bind(this);

    this.listCommunities = function(actorId) {
      return this.scanAccount(actorId).then(function(account) {
        return (account && account.communities && deepClone(account.communities)) || [];
      }, function(err) {
        return err;
      });
    }.bind(this);

    this.check = function() {
      var deferred = $q.defer();

      this.post({
        type: 'ping'
      }, function(data) {

        var success = this.isSuccess(data, 'Failed to check browser extension');

        this.version = success && data.version || null;
        this.browser = success && data.browser || null;
        this.isAvailable = this.version ? true : false;

        if (this.version) {
          var p = this.version.split('.');
          if (p.length === 3) {
            this.versionNumber = (parseInt(p[0]) * 100 * 100) + (parseInt(p[1]) * 100) + parseInt(p[2]);
          }
        }

        if (this.isAvailable) {
          deferred.resolve({
            browser: this.browser,
            version: this.version
          });
        } else {
          deferred.reject(data);
        }
      }.bind(this));

      return deferred.promise;
    }.bind(this);

    this.checkCallback = function(callback) {
      this.check().then(function(data) {
        callback(null, data);
      }, function(err) {
        callback(err);
      });
    }.bind(this);

    this.linkPreview = function(url) {
      var deferred = $q.defer();

      this.post({
        type: 'link-preview',
        url: url
      }, function(data) {

        this.isSuccess(data, 'Failed to Google+ preview link '+url);

        if (data && data.success && data.link) {
          deferred.resolve(deepClone(data.link));
        } else {
          deferred.reject(data);
        }
      }.bind(this));

      return deferred.promise;
    }.bind(this);

    this.diagnostics = function() {
      var deferred = $q.defer();

      this.post({
        type: 'fpm-diagnostics'
      }, function(data) {

        this.isSuccess(data, 'Failed to fetch diagnostics');

        if (data && data.success) {
          deferred.resolve(deepClone(data.diagnostics));
        } else {
          deferred.reject(data && data.error);
        }
      }.bind(this));

      return deferred.promise;
    }.bind(this);

   this.deletePost = function(actorId, postId) {
      var deferred = $q.defer();

      this.post({
        type: 'delete-post',
        actorId: actorId,
        postId: postId
      }, function(data) {

        this.isSuccess(data, 'Failed to delete post '+postId);

        if (data && data.success && data.reply) {
          deferred.resolve(deepClone(data.reply));
        } else {
          deferred.reject(data && data.error);
        }
      }.bind(this));

      return deferred.promise;
    }.bind(this);

    this.publish = function(actorId, post) {
      var deferred = $q.defer();

      post.html = post.html || '';
      post.actorId = actorId;

      this.post({
        type: 'publish',
        post: post
      }, function(data) {

        this.isSuccess(data, 'Failed to publish post', {
          actorId: actorId,
          post: post
        });

        if (data && data.success && data.reply) {
          deferred.resolve(deepClone(data.reply));
        } else {
          deferred.reject(data && data.error || data);
        }
      }.bind(this));

      return deferred.promise;
    }.bind(this);
  }];

  this.$get = ['$injector', function($injector) {
    return $injector.instantiate(Extension, {});
  }];
});
