'use strict';

angular.module('fpmApp')
  .controller('QueueCtrl', ['$rootScope', '$scope', '$sce', '$state', '$mdDialog', 'config', 'types', 'states', 'flash', 'Google', 'moment', 'dialogs', '_', function($rootScope, $scope, $sce, $state, $mdDialog, config, types, states, flash, Google, moment, dialogs, _) {

    var postsPerPage = 20,
        now = moment.utc().local(),
        today = parseInt(now.format('YYYYMMDD'), 10),
        yesterday = parseInt(now.clone().subtract(1, 'days').format('YYYYMMDD'), 10),
        tomorrow = parseInt(now.clone().add(1, 'days').format('YYYYMMDD'), 10);

    $scope.Google = Google;
    $scope.days = [];
    $scope.posts = [];
    $scope.loadMorePossible = false;
    $scope.loaded = false;
    $scope.loading = true;
    $scope.collapsed = false;
    $scope.showFetchDetail = false;
    $scope.extensionAvailable = false;
    $scope.isOwner = _.contains(Google.profile.members.owner, Google.user._id);
    $scope.isManager = _.contains(Google.profile.members.manager, Google.user._id);
    $scope.isAccountManager = _.contains(Google.profile.members.amanager, Google.user._id);
    $scope.isOwnerOrManager = $scope.isOwner || $scope.isManager;

    $scope.isPublishingAvailable = function(account) {
      return Google.isPublishingAvailable(account);
    };

    $scope.isSchedulingSupported = function(account) {
      return Google.isPublishingAvailable(account);
    };

    $scope.isGoogle = function(account) {
      return account.network === types.network.google.code ? true : false;
    };

    $scope.isGoogleProfile = function(account) {
      return account.network === types.network.google.code && account.account === types.account.profile.code ? true : false;
    };

    $scope.isGooglePage = function(account) {
      return account.network === types.network.google.code && account.account === types.account.page.code ? true : false;
    };

    $scope.shouldInstallExtensionBeVisible = function() {
      var parentUid = $scope.account && $scope.account.parentUid;
      var parentAccount = Google.profile && Google.profile.accounts && parentUid && _.findWhere(Google.profile.accounts, { network: types.network.google.code, uid: parentUid });
      return $scope.account && !$scope.extensionAvailable && $scope.isGoogle($scope.account) && !$scope.isGooglePage($scope.account) && !$scope.account.publishViaApi && (parentAccount && !parentAccount.publishViaApi);
    };

    $scope.isExpired = function(account) {
      return account && account.expire ? (moment.utc(account.expire).unix() < moment.utc().unix() ? true : false) : false;
    };

    $scope.accountTypeNameFull = function(account, showFull) {
      var state = account && ($scope.isExpired(account) ? 'Expired' :
            (account.state === states.account.enabled.code ? '' :
              (account.state === states.account.disabled.code ? 'Paused' :
                (account.state === states.account.blocked.code ? 'Blocked' :
                  (account.state === states.account.reconnectRequired.code ? 'Reconnect Required' : '???')))));
      return account && (types.typeNameOfAccount(account) + (showFull ? (state ? ' <strong class="deactivated">'+state+'</strong>' : '') : ''));
    };

    $scope.accountTitle = function(account) {
      return account && ($scope.accountTypeNameFull(account)+' - '+account.name + ' ('+account.uid+')');
    };

    $scope.emptyAccountQueue = function() {

      dialogs.confirm('Purge Queue', 'Do you really want to purge the queue?', 'Yes, purge the queue', function() {

        Google.accountQueueEmpty($scope.account._id, function(err, data) {
          if (err || !data || !data.success) {
            flash.error('Purge Queue', 'Failed to purge queue. Please try again.');
          } else {
            flash.success('Purge Queue', 'Queue is empty.');

            if ($scope.account) {
              $scope.account.queue = $scope.account.queue || {};
              $scope.account.queue.size = 0;
            }

            $scope.$broadcast('queue:empty');
          }
        });
      });
    };

    $scope.enableDisableAccount = function(account) {
      if (account.state === states.account.enabled.code) {
        Google.profileEnableDisableAccount(account, false, function(err, updatedAccount) {
          if (updatedAccount && updatedAccount.account && updatedAccount.account.state === states.account.disabled.code) {
            account.state = states.account.disabled.code;
            flash.pop({title: 'Pause Publishing', body: 'Publishing successfully paused.', type: 'success'});
            $rootScope.$broadcast('accounts:refresh');
          } else {
            flash.pop({title: 'Pause Publishing', body: 'Failed to pause publishing. Please try again.', type: 'error'});
          }
        });
      } else
      if (account.state === states.account.disabled.code) {
        Google.profileEnableDisableAccount(account, true, function(err, updatedAccount) {
          if (updatedAccount && updatedAccount.account && updatedAccount.account.state === states.account.enabled.code) {

            account.state = states.account.enabled.code;

            flash.pop({title: 'Unpause Publishing', body: 'Publishing successfully unpaused.', type: 'success'});

            $scope.$broadcast('queue:refresh');
            $rootScope.$broadcast('accounts:refresh');
          } else {
            flash.pop({title: 'Unpause Publishing', body: 'Failed to unpause publishing. Please try again.', type: 'error'});
          }
        });
      }
    };

    $scope.onNewPost = function(data, post) {
      $scope.manualRefresh();

      var acc, ids = data && data.ids && _.keys(data.ids);
      if (ids && ids.length) {
        if ($scope.isDrafts) {
          $scope._deleteDraft(post, true);
        } else {
          ids.forEach(function(accountId) {
            acc = Google.findProfileAccountById(accountId);
            if (acc) {
              acc.queue = acc.queue || {size: 0};
              acc.queue.size++;
            }
          });
        }
      }
    };

    function photoUrl(photo) {
      if (!photo) {
        return null;
      }
      var thumbnail = photo.thumbnail && photo.thumbnail.url;
      var proxy = photo.url && photo.url.indexOf('googleusercontent') > -1 && photo.url+'=w288-h144-nu';
      return thumbnail || proxy || photo.url || null;
    }

    function enhancePost(post) {
      var tmLockedUntil = post.lockedUntil && moment.utc(post.lockedUntil).local() || null,
          publishAt = moment.utc(post.publishAt).local();

      if (tmLockedUntil && tmLockedUntil.isAfter(publishAt)) {
        publishAt = tmLockedUntil;
      }

      var tm = $scope.isTimeline ?
                moment.utc(post.completedAt).local() :
                $scope.isDrafts ?
                  moment.utc(post.modifiedAt).local() :
                  publishAt;

      if (post.state === states.post.publishing.code) {
        tm = moment.utc().local();
        post.publishing = true;
        post.editable = false;
      }

      var dayNum = parseInt(tm.format('YYYYMMDD'), 10);

      if (post.repost && post.repost.src) {
        post.repost.src = _.findWhere(Google.profile.accounts, {_id: post.repost.src});
      }

      // TEST
      // post.failures = [{
      //   tm: moment.utc().subtract(2,'days').toDate(),
      //   message: 'Error 0, 0123456789, 0123456789, 0123456789, 0123456789, 0123456789, 0123456789, 0123456789, 0123456789, 0123456789, 0123456789, 0123456789, 0123456789'
      // },{
      //   tm: moment.utc().subtract(1,'days').toDate(),
      //   message: 'Error 1, 0123456789, 0123456789, 0123456789, 0123456789, 0123456789, 0123456789, 0123456789, 0123456789, 0123456789, 0123456789, 0123456789, 0123456789'
      // }];

      if (post.failures && post.failures.length) {

        post.failures.sort(function(a, b) {
          return b.tm.valueOf() - a.tm.valueOf();
        });

        var failureIdx = 0;

        post.failures.forEach(function(failure) {
          if (!failure._id) {
            failure._id = failureIdx++;
          }
          failure.message = failure.message || 'Unspecified error';
          failure.tm = moment.utc(failure.tm).local().format('Do MMMM h:mm A');
        });
      }

      post.itemType = 'post';
      post.canEdit = $scope.isOwnerOrManager ? true : post.createdBy._id === Google.user._id;
      post.canEdit = $scope.isOwnerOrManager ? true : (post.createdBy._id === Google.user._id) || (post.account && post.account.members && post.account.members.manager && post.account.members.manager.indexOf(Google.user._id) > -1);
      post.account = _.findWhere(Google.profile.accounts, {_id: post.aid});
      post.isStateFailed = post.state === states.post.failed.code;
      post.isPublished = post.state === states.post.published.code;
      post.canMoveTop = post.state === states.post.scheduledByScheduler.code;
      post.htmlSafe = $sce.trustAsHtml(post.html.replace(/&nbsp;/g,' '));
      post.editing = false;
      post.publishAtMoment = publishAt;
      post.tmUnix = post.publishing ? 0 : tm.unix();
      post.tmTime = tm.format('h:mma');
      post.tmDay = post.publishing ? 'Publishing...' : dayNum === today ? 'Today' : dayNum === tomorrow ? 'Tomorrow' : dayNum === yesterday ? 'Yesterday' : '<strong>'+tm.format('dddd')+'</strong> '+tm.format('Do MMMM');
      post.tmDayNum = post.publishing ? 0 : dayNum;
      post.isPhotoAttached = post.attachments && post.attachments.photo && post.attachments.photo.url ? true : false;
      post.isLinkAttached = post.attachments && post.attachments.link && post.attachments.link.url ? true : false;

      var photo = post.isPhotoAttached && post.attachments.photo,
          linkPhoto = post.isLinkAttached && post.attachments.link.photo,
          showPhoto = photo || linkPhoto;

      post.showPhotoUrl = photoUrl(showPhoto);
      post.showFullSizedPhotoUrl = (showPhoto && showPhoto.url) || null;
    }

    $scope.editDraftSave = function(draft) {
      draft.editing = false;

      Google.createDraft(draft, function(err/*, data*/) {
        if (err) {
          flash.error('Save Post', err&&err.error&&err.error.message || 'Failed to save post.');
        } else {
          flash.success('Save Post', 'Post changes successfully saved.');

          draft.modifiedAt = moment.utc().toDate();

          enhancePost(draft);
        }
      });
    };

    function postsToDays() {
      // var now = moment.utc().local(),
      //     today = parseInt(now.format('YYYYMMDD'), 10),
      //     yesterday = parseInt(now.clone().subtract(1, 'days').format('YYYYMMDD'), 10),
      //     tomorrow = parseInt(now.clone().add(1, 'days').format('YYYYMMDD'), 10);

      var asc = !$scope.isDrafts && !$scope.isTimeline;

      var dayId = 0;
      var days = _.chain($scope.posts).groupBy('tmDay').map(function(group) {
        group.sort(function(a ,b) {
          return asc ? a.tmUnix - b.tmUnix : b.tmUnix - a.tmUnix;
        });
        return {
          _id: dayId++,
          collapsed: $scope.collapsed,
          tmDayNum: group[0].tmDayNum,
          tmDay: group[0].tmDay,
          posts: group
        };
      }).value();

      days.sort(function(a ,b) {
        return asc ? a.tmDayNum - b.tmDayNum : b.tmDayNum - a.tmDayNum;
      });

      $scope.days = days;
    }

    function processRecheduledPosts(rescheduledPosts, newState) {

      var post;

      for (var postId in rescheduledPosts) {
        if ((post = _.findWhere($scope.posts, {_id: postId}))) {
          post.publishAt = rescheduledPosts[postId];

          if (newState !== undefined && newState !== null) {
            post.state = newState;
          }

          enhancePost(post);
        }
      }

      postsToDays();
    }

    $scope._deleteDraft = function(draft, noFlash) {
      Google.profileDeleteDraft(draft, function(err/*, data*/) {
        if (err) {
          if (!noFlash) {
            flash.error('Delete Draft', 'Draft delete failed.');
          }
        } else {
          if (!noFlash) {
            flash.success('Delete Draft', 'Draft successfully deleted.');
          }

          $scope.posts = _.filter($scope.posts, function(p) {
            return p._id !== draft._id;
          });

          postsToDays();
        }
      });
    };

    $scope.deleteDraft = function(draft) {
      dialogs.confirmDelete('Delete Draft', 'Do you really want to delete draft?', function() {
        $scope._deleteDraft(draft);
      });
    };

    $scope.deletePost = function(post) {
      if ($scope.isDrafts) {
        return $scope.deleteDraft(post);
      }

      var removePostId = post._id,
          account = $scope.account || Google.findProfileAccountById(post.aid);

      dialogs.confirmDelete('Delete Post', 'Do you really want to delete post?', function() {

        Google.queuePostDelete(removePostId, function(err, data) {
          if (err) {
            flash.error('Delete Post', err&&err.error&&err.error.message || 'Post delete failed.');
          } else {
            flash.success('Delete Post', 'Post successfully deleted.');

            if (account && $scope.isQueue) {
              account.queue = account.queue || {size: 0};
              account.queue.size = Math.max(account.queue.size - 1, 0);
            }

            $scope.posts = _.filter($scope.posts, function(p) {
              return p._id !== removePostId;
            });

            if (data && data.rescheduledPosts && _.size(data.rescheduledPosts)) {
              processRecheduledPosts(data.rescheduledPosts);
            } else {
              postsToDays();
            }
          }
        });
      });
    };

    $scope.reschedulePost = function(post) {
      dialogs.dateTimePicker(function(time) {

        if (!time) {
          return;
        }

        var postId = post._id;

        Google.queuePostReschedule(postId, time.utc().unix(), function(err, data) {
          if (err) {
            flash.error('Re-schedule Post', err&&err.error&&err.error.message || 'Failed to re-schedule the post. Sorry.');
          } else
          if (data && data.publishAt) {
            flash.success('Re-schedule Now', 'Post successfully re-scheduled.');

            processRecheduledPosts(_.object([[postId, data.publishAt]]), states.post.scheduledByUser.code);
          }
        });
      }, null, {
        time: function() {
          return post.isPublished ? moment.utc().local().add(5, 'minutes').toDate() : post.publishAtMoment.toDate();
        }
      });
    };

    $scope.moveTopPost = function(post) {
      Google.queuePostMove(post._id, 0, function(err, data) {
        if (err) {
          flash.error('Move Post', err&&err.error&&err.error.message || 'Failed to move the post. Sorry.');
        } else
        if (data && data.rescheduledPosts && _.size(data.rescheduledPosts)) {
          processRecheduledPosts(data.rescheduledPosts);
        }
      });
    };

    $scope.publishPost = function(post) {
      var postId = post._id;
      Google.queuePostPublishNow(postId, function(err, data) {
        if (err) {
          flash.error('Share Post Now', err&&err.error&&err.error.message || 'Failed to publish the post now. Sorry.');
        } else
        if (data && data.publishAt) {
          flash.success('Share Post Now', 'Post rescheduled to be published immediately.');

          processRecheduledPosts(_.object([[postId, data.publishAt]]), states.post.scheduledByUser.code);

          Google.updateQueueSize($scope.account);
        }
      });
    };

    function empty() {
      $scope.posts = [];
      $scope.days = [];
      $scope.loading = false;
      $scope.loaded = true;
      $scope.loadMorePossible = false;
    }

    function load(skip, append) {

      $scope.loading = true;

      var callback = function(err, data) {
        var fetchedPosts = data && (data.posts || data.drafts) || [];
        var fetchedUsers = data && data.users || [];
        var users = {};

        if (fetchedUsers.length) {
          fetchedUsers.forEach(function(u) {
            users[u._id] = u;
          });
          fetchedPosts.forEach(function(p) {
            p.users = [];
            if (p.createdBy && users[p.createdBy]) {
              p.createdBy = users[p.createdBy];
              p.users.push(p.createdBy);
            }
            if (p.modifiedBy && users[p.modifiedBy]) {
              p.modifiedBy = users[p.modifiedBy];
              var found = p.users.filter(function(u) { return u._id === p.modifiedBy._id; });
              if (!found.length) {
                p.users.push(p.modifiedBy);
              }
            }
          });
        }

        fetchedPosts.forEach(enhancePost);

        if (append) {
          if (fetchedPosts.length) {
            $scope.posts = $scope.posts.concat(fetchedPosts);
          }
        } else {
          $scope.posts = fetchedPosts;
        }

        postsToDays();

        $scope.loading = false;
        $scope.loaded = true;
        $scope.loadMorePossible = fetchedPosts.length === postsPerPage ? true : false;
      };

      if ($scope.isDrafts) {
        Google.profileDrafts(skip || 0, postsPerPage, callback);
      } else {
        var fce = $scope.isTimeline ? Google.profileListTimeline : Google.profileListQueue;
        fce({
          skip: skip || 0,
          limit: postsPerPage,
          post: $scope.postId,
          account: $scope.account && $scope.account._id
        }, callback);
      }
    }

    $scope.loadMore = function() {
      load($scope.posts.length, true);
    };

    $scope.manualRefresh = function() {
      load();
      Google.updateQueueSize($scope.account);
    };

    $scope.expandDays = function() {
      if ($scope.days.length) {
        $scope.days.forEach(function(day) {
          day.collapsed = false;
        });
      }
      $scope.collapsed = false;
    };

    $scope.collapseDays = function() {
      if ($scope.days.length) {
        $scope.days.forEach(function(day) {
          day.collapsed = true;
        });
      }
      $scope.collapsed = true;
    };

    $scope.redraftPost = function($event, post) {
      $scope.publishing = true;

      var draft = {
        html: post.html,
        attachments: _.clone(post.attachments),
        reshare: post.reshare
      };

      Google.createDraft(draft, function(err/*, data*/) {
        $scope.publishing = false;
        if (err) {
          flash.error('Create Draft', err&&err.error&&err.error.message || 'Failed to save post.');
        } else {
          flash.success('Create Draft', 'Post successfully saved as draft.');
        }
      });
    };

    $scope.resharePost = function($event, post) {
      $scope.shareDraft($event, post, true);
    };

    $scope.shareDraft = function($event, draft, isReshare) {
      $mdDialog.show({
        controller: 'EditorCtrl',
        templateUrl: '/views/editor.html',
        parent: angular.element(document.body),
        targetEvent: $event,
        escapeToClose: false,
        clickOutsideToClose: false,
        fullscreen: true,
        locals: {
          isShareLite: false,
          isSharePopup: false,
          account: $scope.account,
          onSaveDraft: $scope.onNewPost,
          onNewPost: $scope.onNewPost,
          onEditSave: $scope.editDraftSave,
          onEditCancel: null,
          embedded: true,
          hideGoogleDestinations: false,
          hideDestinations: false,
          hidePublishingButtons: false,
          isReshare: isReshare,
          isDraftEdit: true,
          isShareDraft: true,
          creatDraftOnly: false,
          editDraft: draft
        }
      })
      .then(function() {}, function() {});
    };

    $scope.isGoogle = function(account) {
      return account && account.network === types.network.google.code ? true : false;
    };
    $scope.isGooglePage = function(account) {
      return $scope.isGoogle(account) && account.account === types.account.page.code ? true : false;
    };
    $scope.isGoogleProfile = function(account) {
      return $scope.isGoogle(account) && account.account === types.account.profile.code ? true : false;
    };
    $scope.isGoogleProfileOrPage = function(account) {
      return $scope.isGooglePage(account) || $scope.isGoogleProfile(account);
    };

    // function isPostDestinationGoogleProfileOrPage(post) {
    //   var account = _.findWhere(Google.profile.accounts, {_id: post.aid});
    //   return account && $scope.isGoogleProfileOrPage(account) || false;
    // }

    $scope.openEditor = function($event, editDraft) {
      var postAccount = editDraft && _.findWhere(Google.profile.accounts, {_id: editDraft.aid});
      $mdDialog.show({
        controller: 'EditorCtrl',
        templateUrl: '/views/editor.html',
        parent: angular.element(document.body),
        targetEvent: $event,
        escapeToClose: false,
        clickOutsideToClose: false,
        fullscreen: true,
        locals: {
          isShareLite: false,
          isSharePopup: false,
          account: $scope.account || postAccount,
          onSaveDraft: $scope.onNewPost,
          onNewPost: $scope.onNewPost,
          onEditSave: $scope.editDraftSave,
          onEditCancel: null,
          embedded: true,
          hideGoogleDestinations: $scope.isDrafts || (postAccount && !$scope.isGoogleProfileOrPage(postAccount)) ? true : false,
          hideDestinations: $scope.isDrafts || $scope.account || editDraft ? true : false,
          hidePublishingButtons: editDraft ? true : false,
          isReshare: false,
          isDraftEdit: $scope.isDrafts || false,
          isShareDraft: false,
          creatDraftOnly: $scope.isDrafts || false,
          editDraft: editDraft
        }
      })
      .then(function() {}, function() {});
    };

    $scope.showErrors = function($event, post) {
      $mdDialog.show({
        controller: ['$scope', '$mdDialog', 'failures', function($scope, $mdDialog, failures) {
          $scope.failures = failures;
          $scope.close = function() { $mdDialog.hide(); };
        }],
        template: [
        '<md-dialog aria-label="Publishing Errors">',
          '<md-toolbar>',
            '<div class="md-toolbar-tools">',
              '<h2>Publishing Errors</h2>',
              '<span flex></span>',
              '<md-button class="md-icon-button" ng-click="close()">',
                '<md-icon md-svg-src="/images/icons/close.svg" aria-label="Close"></md-icon>',
              '</md-button>',
            '</div>',
          '</md-toolbar>',
          '<md-dialog-content layout-padding="20">',
            '<div layout="row" ng-repeat="failure in failures track by failure._id">',
              '<div style="margin-right:20px;font-weight:bold">{{failure.tm}}</div>',
              '<div flex>{{failure.message}}</div>',
            '</div>',
          '</md-dialog-content>',
          '<md-dialog-actions layout="row">',
            '<span flex></span>',
            '<md-button class="md-raised md-primary" ng-click="close()">OK</md-button>',
          '</md-dialog-actions>',
        '</md-dialog>'
        ].join(''),
        parent: angular.element(document.body),
        multiple: true,
        targetEvent: $event,
        clickOutsideToClose: true,
        fullscreen: true,
        locals: {
          failures: post.failures
        }
      }).then(function() {}, function() {});
    };

    // isTimeline: boolean
    // isDrafts: boolean
    $scope.init = function(variables) {
      if (variables) {
        for (var key in variables) {
          $scope[key] = variables[key];
        }
      }

      $scope.isQueue = !$scope.isTimeline && !$scope.isDrafts;
      $scope.postId = $state.params.postid;

      $scope.$on('queue:refresh', function() {
        $scope.manualRefresh();
      });

      $scope.$on('queue:empty', function() {
        empty();
      });

      $scope.manualRefresh();
    };
  }]);
