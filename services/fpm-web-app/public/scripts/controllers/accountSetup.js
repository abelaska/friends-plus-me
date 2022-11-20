'use strict';

angular.module('fpmApp')
  .controller('AccountSetupCtrl', ['$rootScope', '$scope', '$cookies', 'config', 'types', 'flash', 'Google', function($rootScope, $scope, $cookies, config, types, flash, Google) {

    var profile = Google.profile,
        account = $scope.account;

    $scope.Google = Google;
    $scope.profile = profile;
    $scope.isGoogleNetwork = account.network === types.network.google.code ? true : false;
    $scope.isTwitterNetwork = account.network === types.network.twitter.code ? true : false;
    $scope.accountSourceOrDestination = $scope.isGoogleNetwork ? 'SOURCE' : 'DESTINATION';
    $scope.accountNetworkName = types.networkName(account.network);
    $scope.pushing = false;

    var oldPreset = Google.profile.preset;

    $scope.isPublishingAvailable = function() {
      return Google.isPublishingAvailable(account);
    };

    function update(callback) {

      $scope.pushing = true;

      Google.profileAccountChangePreset(account, function(err, data) {
        if (err) {
          flash.pop({title: 'Queue preset update', body: 'Sorry but preset update have failed. Please try again.', type: 'error'});
        } else {
          oldPreset = account.preset;
          flash.pop({title: 'Queue preset update', body: 'Queue preset was successfully updated.', type: 'success'});
        }

        $scope.pushing = false;

        if (data && data.routes) {
          Google.profile.routes = data.routes;
        }

        if (callback) {
          callback(err);
        }
      });
    }

    var isProfile = $scope.account.account === types.account.profile.code ? true : false,
        isPage = $scope.account.account === types.account.page.code ? true : false;
        //isGroup = $scope.account.account === types.account.group.code ? true : false;

    $scope.showAppendHashtag = false;
    $scope.showRepostFromCommunity = false;
    $scope.showPrivacySettings = false;
    $scope.showLimitMsgLength = false;
    $scope.showTwForceLink = false;
    $scope.privacySettings = null;

    switch (account.network) {
    case types.network.google.code:
      $scope.showRepostFromCommunity = isProfile || isPage;
      break;
    case types.network.facebook.code:
      $scope.showPrivacySettings = isProfile;
      $scope.privacySettings = [
        {text:'Everyone',           value:'EVERYONE'},
        {text:'All Friends',        value:'ALL_FRIENDS'},
        {text:'Friends of Friends', value:'FRIENDS_OF_FRIENDS'},
        {text:'Only to Me',         value:'SELF'}
      ];
      break;
    case types.network.twitter.code:
      $scope.showLimitMsgLength = true;
      $scope.showAppendHashtag = true;
      $scope.showTwForceLink = true;
      break;
    case types.network.linkedin.code:
      $scope.showPrivacySettings = isProfile;
      $scope.privacySettings = [
        {text:'Anyone',           value:'anyone'},
        {text:'Connections Only', value:'connections-only'}
      ];
      break;
    }

    $scope.showAdvancedSetup = $scope.showRepostFromCommunity || $scope.showPrivacySettings || $scope.showLimitMsgLength;

    $scope.$watch('account.twForceLink', function(newValue, oldValue) {
      if (newValue !== oldValue) {
        $scope.pushing = true;
        Google.profileSetupAccount($scope.account, {
          twForceLink: $scope.account.twForceLink
        }, function(err, updated) {
          $scope.pushing = false;
          if (updated) {
            flash.success('Force Twitter Card', 'Option successfully changed.');
          } else {
            flash.error('Force Twitter Card', 'Failed to option. Please try again.');
          }
        });
      }
    });

    $scope.$watch('account.privacy', function(newValue, oldValue) {
      if (newValue !== oldValue) {
        $scope.pushing = true;
        Google.profileSetupAccount($scope.account, {
          privacy: $scope.account.privacy
        }, function(err, updated) {
          $scope.pushing = false;
          if (updated) {
            flash.pop({title: 'Reposts privacy', body: 'Reposts privacy successfully changed.', type: 'success'});
          } else {
            flash.pop({title: 'Reposts privacy', body: 'Failed to change reposts privacy. Please try again.', type: 'error'});
          }
        });
      }
    });

    $scope.$watch('account.appendHashtag', function(newValue, oldValue) {
      if (newValue !== oldValue) {
        $scope.pushing = true;

        Google.profileSetupAccount($scope.account, {
          appendHashtag: $scope.account.appendHashtag
        }, function(err, updated) {

          $scope.pushing = false;

          if (updated) {
            flash.pop({title: 'Append Hashtag', body: 'Queue settings successfully updated.', type: 'success'});
          } else {
            flash.pop({title: 'Append Hashtag', body: 'Failed to update queue settings. Please try again.', type: 'error'});
          }
        });
      }
    });

    $scope.$watch('account.appendLink', function(newValue, oldValue) {
      if (newValue !== oldValue) {
        $scope.pushing = true;

        Google.profileSetupAccount($scope.account, {
          appendLink: $scope.account.appendLink
        }, function(err, updated) {

          $scope.pushing = false;

          var word = $scope.account.appendLink ? 'Enable' : 'Disable',
              sword = word.toLowerCase();

          if (updated) {
            flash.pop({title: word+' link', body: 'Link to Google+ Post option was successfully '+sword+'d.', type: 'success'});
          } else {
            flash.pop({title: word+' link', body: 'Failed to '+sword+' Link to Google+ Post option. Please try again.', type: 'error'});
          }
        });
      }
    });

    $scope.$watch('account.repCommunity', function(newValue, oldValue) {
      if (newValue !== oldValue) {
        $scope.pushing = true;

        Google.profileSetupAccount($scope.account, {
          repCommunity: $scope.account.repCommunity
        }, function(err, updated) {

          $scope.pushing = false;

          var word = $scope.account.repCommunity ? 'Enable' : 'Disable',
              sword = word.toLowerCase();

          if (updated) {
            flash.pop({title: word+' reposts from communities', body: 'Repost from Google+ Communities option was successfully '+sword+'d.', type: 'success'});
          } else {
            flash.pop({title: word+' reposts from communities', body: 'Failed to '+sword+' Repost from Google+ Communities option. Please try again.', type: 'error'});
          }
        });
      }
    });

    $scope.$watch('account.limitMsgLen', function(newValue, oldValue) {
      if (newValue !== oldValue) {
        $scope.pushing = true;

        Google.profileSetupAccount($scope.account, {
          limitMsgLen: $scope.account.limitMsgLen
        }, function(err, updated) {

          $scope.pushing = false;

          var word = $scope.account.limitMsgLen ? 'Enable' : 'Disable',
              sword = word.toLowerCase();

          if (updated) {
            flash.pop({title: word+' repost length limitation', body: 'Limitation of repost length was successfully '+sword+'d.', type: 'success'});
          } else {
            flash.pop({title: word+' repost length limitation', body: 'Failed to '+sword+' limitation of repost length. Please try again.', type: 'error'});
          }
        });
      }
    });

    $scope.changePreset = function(preset) {
      account.preset = preset;
      update(function(err) {
        if (!err) {
          $scope.showAddAccountButton = true;
        }
      });
    };
  }]);