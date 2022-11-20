/*jshint -W106*/
'use strict';

angular.module('fpmApp')
  .directive('delayedFocus', ['$timeout', function($timeout) {
    return function($scope, elements, attrs) {
      $scope.$watch(attrs.delayedFocus,
        function (newValue) {
          var el = elements && elements[0];
          if (newValue && el) {
            $timeout(function() {
              el.focus();
            }, 200);
          }
        }, true);
    };
  }])
  .directive('ngEnter', ['$apply', function($apply) {
    return function($scope, element, attrs) {
      element.bind('keydown keypress', function(event) {
        if(event.which === 13) {
          $apply($scope, function() {
            $scope.$eval(attrs.ngEnter);
          });
          event.preventDefault();
          event.stopPropagation();
        }
      });
    };
  }])
  .controller('EditorCtrl', ['$rootScope', '$scope', '$isMobile', '$initialState', '$timeout', '$q', '$templateCache', '$window', '$apply', '$mdDialog', 'Extension', 'flash', 'dialogs', 'Google', '_', 'states', 'types', 'moment', 'config', 'TinyMCEMention', 'Events', 'Log', 'S', 'async', 'Analytics', 'twttr', '$', 'Crawler', 'Image', 'editDraft', 'embedded', 'hideDestinations', 'hidePublishingButtons', 'hideGoogleDestinations', 'onEditCancel', 'onEditSave', 'onNewPost', 'onSaveDraft', 'account', 'isDraftEdit', 'isShareDraft', 'isReshare', 'creatDraftOnly', 'isShareLite', 'isSharePopup', 'Intercom', function($rootScope, $scope, $isMobile, $initialState, $timeout, $q, $templateCache, $window, $apply, $mdDialog, Extension, flash, dialogs, Google, _, states, types, moment, config, TinyMCEMention, Events, Log, S, async, Analytics, twttr, $, Crawler, Image, editDraft, embedded, hideDestinations, hidePublishingButtons, hideGoogleDestinations, onEditCancel, onEditSave, onNewPost, onSaveDraft, account, isDraftEdit, isShareDraft, isReshare, creatDraftOnly, isShareLite, isSharePopup, Intercom) {

    var ed, reshareActivityId,
        paramType, paramUrl, paramImage, paramPost, paramPlatform,
        notifyPersons = {},
        accounts = [],
        enableDnd = true,
        enableCtrlClickLinkShortening = true;

    // reply from extension background script
    // function onMessageFromExtension(event) {
    //   console.log('onmessage', event);
    // }
    // if (window.addEventListener) {
    //   window.addEventListener('message', onMessageFromExtension, false);
    // } else {
    //   window.attachEvent('onmessage', onMessageFromExtension);
    // }

    $scope.isShareLite = isShareLite;
    $scope.isSharePopup = isSharePopup;
    $scope.captchaNotVisible = true;
    $scope.isReshare = isReshare;
    $scope.account = account;
    $scope.editDraft = editDraft;
    $scope.embedded = embedded;
    $scope.hideDestinations = hideDestinations;
    $scope.hidePublishingButtons = hidePublishingButtons;
    $scope.hideGoogleDestinations = hideGoogleDestinations;
    $scope.onEditCancel = onEditCancel;
    $scope.onEditSave = onEditSave;
    $scope.onNewPost = onNewPost;
    $scope.onSaveDraft = onSaveDraft;
    $scope.isDraftEdit = isDraftEdit;
    $scope.isShareDraft = isShareDraft;
    $scope.creatDraftOnly = creatDraftOnly;
    //$scope.publicOnly = false;
    //$scope.fullWidth = false;
    //$scope.embedded = true;
    //$scope.hideDestinations = false;
    //$scope.autoHideDestinations = false;
    //$scope.hidePublishingButtons = false;
    //$scope.onNewPost = function(response) { ... };
    //$scope.onEditCancel = function(draft) { ... };
    //$scope.onEditSave = function(draft) { ... };
    //$scope.onSaveDraft = function(draft) { ... };
    //$scope.editDraft = ...
    //$scope.creatDraftOnly = true;
    //$scope.disableInstallExtension = false;
    //$scope.isDraftEdit = true;
    //$scope.plainTextOnly = false;

    $scope.profile = Google.profile;

    $scope.updateOwnerships = function(profile) {
      profile = profile || $scope.profile;
      var members = profile && profile.members;
      $scope.isOwner = members && members.owner && _.contains(members.owner, Google.user._id);
      $scope.isManager = members && members.manager && _.contains(members.manager, Google.user._id);
      $scope.isAccountManager = members && members.manager && _.contains(members.amanager, Google.user._id);
      $scope.isOwnerOrManager = $scope.isOwner || $scope.isManager;
    };
    $scope.updateOwnerships();

    $scope.activateDnd = enableDnd && !$scope.embedded;
    $scope.types = types;
    $scope.states = states;

    $scope.abs = Math.abs;

    if (!$scope.embedded) {

      var key;
      var query = $initialState.query || {};
      for (key in query) {
        query[key] = decodeURIComponent(query[key]);
      }

      paramType = query.type;
      paramUrl = query.url;
      paramImage = query.image;
      paramPost = query.post;
      paramPlatform = query.platform;

      var shareLoginQuery = '';
      for (key in query) {
        shareLoginQuery += (shareLoginQuery && '&') + key + '=' + encodeURIComponent(query[key]);
      }
      $scope.shareLoginUrl = config.web.url + '/share-login' + (shareLoginQuery && ('?' + shareLoginQuery));

      reshareActivityId = query.activityId;
    }

    // function humanCheck(increment, successCallback) {
    //   Google.isRecaptchaRequired(increment, function(err, data) {
    //     var required = err || !data || data.required === undefined || data.required;
    //     if (!required) {
    //       return successCallback();
    //     }

    //     Log.info('Recaptcha required for user '+Google.user._id);
    //     Analytics.push('ui','share','recatcha.required', Google.user._id);

    //     $scope.captchaNotVisible = false;
    //     $apply($scope);

    //     $window.grecaptcha.execute($window.grecaptcha.render('recaptcha', {
    //       theme: 'light',
    //       badge: 'inline',
    //       // size: 'normal',
    //       size: 'invisible',
    //       sitekey: config.recaptcha.sitekey,
    //       callback: successCallback
    //     }));
    //   });
    // }

    // setTimeout(function() { humanCheck(4, function() {}); }, 1000);

    $scope.isPublishingToGoogleProfilesAllowed = function() {
      return $scope.profile && $scope.profile.use.publishToGoogleProfile || false;
    };
    $scope.isContributor = function() {
      return _.contains($scope.profile.members.contributor || [], Google.user._id);
    };
    $scope.canEdit = function() {
      return $scope.editDraft ? $scope.editDraft.canEdit : $scope.isOwnerOrManager;
    };
    $scope.title = function() {
      return $scope.isReshare ? 'Schedule Post' :
        $scope.editDraft ? ($scope.canEdit() ? 'Update ' : '')+($scope.isDraftEdit ? 'Draft'+($scope.canEdit() ? '': ' (Ready Only)'): 'Post') :
          'Create '+($scope.isDraftEdit ? 'Draft': 'Post');
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
    $scope.isPinterest = function(account) {
      return account && account.network === types.network.pinterest.code ? true : false;
    };

    function createPublicCircle() {
      return { name: 'Public', type:'circle', id:'public-circle', icon:'/images/icons/earth.svg' };
    }

    function htmlToPlain(html) {
      html = '<p>'+html
      .replace(/<style([\s\S]*?)<\/style>/gi, '')
      .replace(/<script([\s\S]*?)<\/script>/gi, '')
      .replace(/<\/h[0-9]+>/ig, '\n')
      .replace(/<\/div>/ig, '\n')
      .replace(/<\/li>/ig, '\n')
      .replace(/<\/em>/ig, '</i>')
      .replace(/<em>/ig, '<i>')
      .replace(/<\/strong>/ig, '</b>')
      .replace(/<strong>/ig, '<b>')
      .replace(/<li[^>]*>/ig, '* ')
      .replace(/<\/ul>/ig, '\n')
      .replace(/<\/p>/ig, '\n')
      .replace(/<br[^>]*/gi, '\n')
      .replace(/<[^>]+>/ig, '')
      .replace(/\n/g, '</p><p>')+'</p>';
      return html;
    }

    $scope.extensionAvailable = false;

    $scope.pickedAccountsCount = 0;
    $scope.availableAccounts = [];
    $scope.pickedGoogleAccounts = [];

    $scope.Google = Google;

    $scope.tinymceModel = '';

    $scope.editDraftNotChanged = true;

    $scope.change = function(/*type*/) {
      $scope.editDraftNotChanged = false;
    };

    var ignoreNextEditorChange = true;

    $scope.tinymceConfig = function() {
      var bodyAutoFixed = false;
      var tinymceConfig = {
        menubar: false,
        statusbar: false,
        toolbar: false,
        plugins: 'autoresize paste',
        skin: false,
        browser_spellcheck: true,
        auto_focus: !$isMobile,
        auto_focus_end: !$isMobile,
        content_css: '/styles/tinymce-content.css?v='+config.version,
        autoresize_min_height: 100,
        paste_word_valid_elements: 'b,strong,i,s,em,br,p',
        paste_as_text: false,
        paste_data_images: false,
        paste_preprocess: function(plugin, args) {
          if (args.content) {
            args.content = htmlToPlain(args.content.replace(/<\/p>[ \t\n]*<p>/g,'</p><p></p><p>'));
          }
        },
        setup: function(editor) {
          ed = editor;
          if ($isMobile) {
            editor.on('NodeChange', function() {
              if (!bodyAutoFixed && ed.getBody()) {
                var body = ed.getBody();
                body.setAttribute('autocapitalize', 'on');
                body.setAttribute('autocomplete', 'on');
                body.setAttribute('spellcheck', 'true');
                body.setAttribute('autocorrect', 'false');
                bodyAutoFixed = true;
              }
            });
          } else {
            $timeout(function(){ editor.focus(); }, 200);
          }

          editor.on('change', function() {
            if (ignoreNextEditorChange) {
              ignoreNextEditorChange = false;
            } else {
              $scope.change('editor.change');
            }
          });

          editor.on('keydown', function(args) {
            if (args.keyCode === 27) {
              if ($rootScope.isShare) {
                $scope.closeDialog();
              } else {
                $scope.cancel();
              }
            }
          });

          editor.on('keyup', function(/*args*/) {
            $scope.isHighlighted = editor.selection.getContent() ? true : false;
          });

          editor.on('mouseup', function (/*ed, e*/) {
            $scope.isHighlighted = editor.selection.getContent() ? true : false;
          });

          // if ($scope.autoHideDestinations) {
          //   editor.on('focus', function(/*e*/) {
          //     if ($scope.pickGoogleDestination) {
          //       $scope.unselect();
          //       $apply($rootScope);
          //     }
          //   });
          // }

          if (enableCtrlClickLinkShortening) {
            editor.on('click', function(e) {
              $scope.editorClickShortenLink(editor, e);
            });
          }
        }
      };

      var isMentionAllowed = !$scope.account || $scope.isGoogle($scope.account);
      if (isMentionAllowed)  {
        tinymceConfig.plugins += ' mention';
        tinymceConfig.mentions = TinyMCEMention;
      }

      return tinymceConfig;
    };

    var reWebUrl = new RegExp(
      '^' +
        // protocol identifier
        '(?:(?:https?|ftp)://)' +
        // user:pass authentication
        '(?:\\S+(?::\\S*)?@)?' +
        '(?:' +
          // IP address exclusion
          // private & local networks
          '(?!(?:10|127)(?:\\.\\d{1,3}){3})' +
          '(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})' +
          '(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})' +
          // IP address dotted notation octets
          // excludes loopback network 0.0.0.0
          // excludes reserved space >= 224.0.0.0
          // excludes network & broacast addresses
          // (first & last IP address of each class)
          '(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])' +
          '(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}' +
          '(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))' +
        '|' +
          // host name
          '(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)' +
          // domain name
          '(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*' +
          // TLD identifier
          '(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))' +
        ')' +
        // port number
        '(?::\\d{2,5})?' +
        // resource path
        '(?:/\\S*)?' +
      '$', 'i'
    );

    TinyMCEMention.isEnabled = function() {
      return false;
    };

    TinyMCEMention.onInsert = function(item) {
      if (item.type === 'person') {
        notifyPersons[item.id] = item;
      }
    };

    $scope.textBold = function() {
      var rng = ed.selection.getRng(true);
      if (rng && !rng.collapsed) {
        ed.formatter.toggle('bold');
      }
    };

    $scope.textItalic = function() {
      var rng = ed.selection.getRng(true);
      if (rng && !rng.collapsed) {
        ed.formatter.toggle('italic');
      }
    };

    $scope.textStrikeThrough = function() {
      var rng = ed.selection.getRng(true);
      if (rng && !rng.collapsed) {
        ed.formatter.toggle('strikethrough');
      }
    };

    $scope.clearAll = function() {
      $scope.removeAttachment();
      $scope.tinymceModel = '';
      $scope.pickedAccountsCount = 0;
      $scope.accounts.forEach(function(account) {
        account.selected = false;
        account.picked = false;
      });
      $scope.change('clearAll');
    };

    function urlDomain(url) {
      var    a      = document.createElement('a');
             a.href = url;
      return a.hostname;
    }

    $scope.isWithFeature = function(account) {
      return $scope.isGoogleProfileOrPage(account) && !$scope.publicOnly ? true : false;
    };
    $scope.isFeatureUsed = function(account) {
      return $scope.isWithFeature(account) && account.featured ? true : false;
    };

    $scope.isNotSaveable = function() {
      return $scope.attachPhoto || $scope.attachLink || $scope.textLength ? false : true;
    };

    $scope.isNotPublishable = function() {
      return !$scope.isNotSaveable() && $scope.isTextLengthOk && ($scope.pickedAccountsCount || $scope.account) ? false : true;
    };
    $scope.isAttachLinkVisible = function() {
      return !$scope.attachedPhoto;
    };

    $scope.isExpired = function(account) {
      return account.expire ? (moment.utc(account.expire).unix() < moment.utc().unix() ? true : false) : false;
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

    function updateAccountFeatured(account) {
      if (!account.destinations || !account.destinations.length) {
        account.destinations = [createPublicCircle()];
      }
    }

    function pickGoogleAccount(account) {
      if (account && $scope.isGoogleProfileOrPage(account)) {
        account.picked = true;
        if (!_.findWhere($scope.pickedGoogleAccounts, {uid: account.uid})) {
          $scope.pickedGoogleAccounts.push(account);
          $scope.change('pickGoogleAccount');
        }
        return true;
      }
      return false;
    }

    $scope.pick = function(account, forcePicked) {
      if (account) {
        account.picked = forcePicked ? true : (account.picked ? false : true);
        $scope.pickedAccountsCount += account.picked ? 1 : -1;
        $scope.updateTextLength();
        $scope.change('pick');

        if ($scope.isGoogleProfileOrPage(account)) {

          updateAccountFeatured(account);

          var found = _.findWhere($scope.pickedGoogleAccounts, {uid: account.uid});
          if (account.picked && !found) {
            $scope.pickedGoogleAccounts.push(account);
          } else
          if (!account.picked && found) {
            $scope.pickedGoogleAccounts = _.filter($scope.pickedGoogleAccounts, function(a) {return a.uid !== account.uid;});
          }
        }
      }
    };

    // $scope.stopEvent = function($event) {
    //   $event.preventDefault();
    //   $event.stopPropagation();
    // };

    $scope.removeAttachment = function() {

      reshareActivityId = null;

      $scope.attachPhoto = false;
      $scope.attachLink = false;
      $scope.appendLinkUrl = '';
      $scope.appendLink = null;
      $scope.uploading = false;
      $scope.uploaded = false;
      $scope.uploadedPhoto = null;
      $scope.uploadedUrl = null;
      $scope.link = null;
      $scope.linkPreviewInProgress = false;

      $scope.updateTextLength();
      $scope.resetFileDialog();
      $scope.change('removeAttachment');
    };

    $scope.closeLinkInput = function() {
      $scope.attachLink = false;
      $scope.focusLinkInput = false;
    };

    $scope.onAttachLink = function() {
      var attach = $scope.attachLink ? false : true;
      $scope.removeAttachment();
      $scope.attachLink = attach;
      $scope.focusLinkInput = attach ? true : false;
      $scope.change('onAttachLink');
    };

    $scope.onAttachPhoto = function() {
      $scope.resetFileDialog();
      $scope.openFileDialog();
    };

    $scope.btnToolFeatureTooltip = function(account) {
      return $scope.isGoogle(account) ? 'Pick Circles, Collection or Community' : '';
    };

    ///////////////////////////////////////
    // Link Preview
    ///////////////////////////////////////

    // function resizePhotoUrl(photo, newSize) {
    //   var photoUrl = newSize ? photo.url.replace('w'+photo.width+'-h'+photo.height, newSize) : photo.url;
    //   if (photoUrl && photoUrl.indexOf('//') === 0) {
    //     photoUrl = 'https:'+photoUrl;
    //   }
    //   return photoUrl;
    // }

    $scope.linkPhotoPrev = function() {
      $scope.link.photoIdx = ($scope.link.photoIdx > 0 ? $scope.link.photoIdx : $scope.link.photos.length)-1;
      $scope.change('linkPhotoPrev');
    };
    $scope.linkPhotoNext = function() {
      $scope.link.photoIdx = ($scope.link.photoIdx+1) % $scope.link.photos.length;
      $scope.change('linkPhotoNext');
    };
    $scope.linkPhotoRemove = function() {
      $scope.uploadedUrl = null;
      $scope.link.photo = null;
      $scope.link.photoIdx = -1;
      $scope.updateTextLength();
      $scope.change('linkPhotoRemove');
    };

    function processLinkPreview(linkPreview, noFlashes) {
      if (linkPreview) {
        linkPreview.domain = urlDomain(linkPreview.url);

        linkPreview.url = linkPreview.url.replace(/#__sid=md[0-9]+/, '');

        if (linkPreview.images) {
          linkPreview.images.map(function(i) {
            i.isFullBleed = i.width >= 506 && i.height >= 303 && (i.width/i.height) <= (5/2) ? true : false;
          });
          linkPreview.photos = linkPreview.images || [];
          linkPreview.images = undefined;
        }
        /*jshint -W116*/
        linkPreview.photoIdx = linkPreview.photoIdx == null ? (linkPreview.photos && linkPreview.photos.length ? 0 : -1) : linkPreview.photoIdx;
      }

      if (!linkPreview && !noFlashes) {
        flash.error('Link Preview', 'Failed to preview the link. <b>Please, make sure the link is accessible.</b>');
      }

      return linkPreview;
    }

    $scope.linkPreview = function(url, callback, noFlashes) {

      if ($scope.linkPreviewInProgress || !url) {
        return;
      }

      url = url.replace(/&nbsp;?/g,'');

      if (url.indexOf('://') === -1) {
        url = 'http://'+url;
      }

      if (!reWebUrl.test(url)) {
        flash.error('Invalid URL', url+' is <b>not a valid URL</b>.');
        return;
      }

      $timeout(function() { $scope.linkPreviewInProgress = true; }, 0);

      Crawler.link(url, function(err, linkPreview) {

        $timeout(function() { $scope.linkPreviewInProgress = false; }, 0);

        if (err) {
          Analytics.push('ui','share','link-preview.error', Analytics.errToString(err));
          return callback ? callback(false) : null;
        }

        Analytics.push('ui','share','link-preview.success', url);

        $scope.link = processLinkPreview(linkPreview, noFlashes);

        $scope.updateTextLength();
        $scope.change('linkPreview.crawler');

        if (callback) {
          callback($scope.link && $scope.link.url ? true : false);
        }
      });
    };

    ///////////////////////////////////////
    // Photo shared using the extension
    ///////////////////////////////////////

    var googleusercontentHostRegexp = /lh[0-9]*.googleusercontent.com/;

    function fixImageUrl(url) {
      if (!url || !googleusercontentHostRegexp.test(url)) {
        return url;
      }
      var parts = url.split('/');
      switch (parts.length) {
      case 2+3: // 2 & parts[0].toLowerCase() === 'proxy'
        if (parts[2+1].toLowerCase() === 'proxy') {
          var params = parts[2+2].split('=');
          if (params.length === 2) {
            params[1] = 's0';
            parts[2+2] = params.join('=');
          }
        }
        break;
      case 2+6:
        parts.splice(5+2, 0, 's0');
        break;
      case 2+7:
        parts[5+2] = 's0';
        break;
      }
      return parts.join('/');
    }

    function shareImageFromUrl(url) {
      url = fixImageUrl(url);
      $scope.removeAttachment();
      $scope.attachPhoto = true;
      $scope.uploading = false;
      $scope.uploaded = true;
      $scope.uploadedPhoto = { url: url };
      $scope.uploadedUrl = url;

      $scope.updateTextLength();
      $scope.change('shareImageFromUrl');

      $apply($rootScope);
    }

    ///////////////////////////////////////
    // Photo upload to AWS S3 from browser
    ///////////////////////////////////////

    function fileSelectEl() {
      return $window.document.getElementById('fileSelect');
    }

    $scope.resetFileDialog = function() {
      var el = fileSelectEl();
      if (el) { el.value = ''; }
    };

    $scope.openFileDialog = function() {
      //$timeout(function() { zakomentovano, protoze to zpusobovalo selhani otevirani file dialogu
      var el = fileSelectEl();
      if (el) { el.click(); }
      //});
    };

    $scope.onFileSelect = function($files) {
      var file = $files[0];
      if (!file) {
        return;
      }

      $scope.onAttachPhoto();

      $scope.attachPhoto = false;
      $scope.uploading = true;
      $scope.uploaded = false;
      $scope.uploadedUrl = null;
      $scope.uploadedPhoto = null;

      $apply($rootScope);

      var reader = new $window.FileReader();
      reader.onload = function(e) {
        var allowedContentTypes = ['image/png','image/jpeg','image/gif','image/webp'];
        var contentType = e.target.result && e.target.result.split(';')[0];
        if (contentType) {
          var parts = contentType.split(':');
          contentType = parts.length === 2 ? parts[1] : contentType;
        }

        if (allowedContentTypes.indexOf(contentType) === -1) {
          return flash.error('Photo upload', 'Only JPEG, PNG, GIF and WEBP images are supported.');
        }

        $scope.uploadedUrl = e.target.result || $scope.uploadedUrl;
        $apply($rootScope);

        Image.uploadToGcs(file, function(err, data) {
          if (err || !data) {
            $scope.uploading = false;
            Analytics.push('ui','share','photo-upload.error', Analytics.errToString(err));
            var msg = err && err.error && err.error.message || '';
            Log.error('Failed upload photo to GCS.',{ message: Analytics.errToString(err), error: err });
            return flash.error('Photo upload', 'Photo upload failed.'+(msg ? ' '+msg : '')+' Please, try again. ');
          }

          // file is uploaded successfully
          $scope.uploading = false;
          $scope.uploaded = true;

          if ($scope.attachLink && $scope.link) {
            $scope.uploadedPhoto = null;
            $scope.attachPhoto = false;
            $scope.link.photo = data;
            $scope.link.photos = null;
            $scope.link.photoIdx = -1;
          } else {
            $scope.uploadedPhoto = data;
            $scope.attachPhoto = true;
          }

          $scope.updateTextLength();
          $scope.change('onFileSelect');

          Analytics.push('ui','share','photo-upload.success');

          $apply($rootScope);

          flash.success('Photo upload', 'Photo successfully uploaded.');
        });
      };
      reader.readAsDataURL(file);
    };

    ///////////////////////////////////////
    // Dialog DND move
    ///////////////////////////////////////
    var dndStart;

    $scope.dndPos = {x: 0, y: 0};

    $scope.dndStart = function($event) {

      var start = true,
          el = $event.target;

      while (el) {
        if (el.className && el.className.indexOf('btn') > -1) {
          start = false;
          break;
        }
        el = el.parentNode;
      }

      if (start) {
        dndStart = {
          x: $scope.dndPos.x,
          y: $scope.dndPos.y
        };
        $rootScope.$emit('dnd-start', $event);
      }
    };

    $rootScope.$on('dnd-diff', function(event, diff) {
      $scope.dndPos.x = dndStart.x + diff.x;
      $scope.dndPos.y = dndStart.y + diff.y;
    });

    ///////////////////////////////////////
    // Google+ account mention autocomplete
    ///////////////////////////////////////

    function queryMatch(text, query) {
      if (!text || !query) {
        return false;
      }
      var t = text.toLowerCase(),
          q = query.toLowerCase();
      if (t.indexOf(q) === 0) {
        return true;
      }
      var p = t.split(' ');
      for (var j = 0; j < p.length; j++) {
        if (p[j].indexOf(q) === 0) {
          return true;
        }
      }
      return false;
    }

    function sortByName(a, b) {
      a = (a.name||'').toLowerCase();
      b = (b.name||'').toLowerCase();
      if(a < b) { return -1; }
      if(a > b) { return 1; }
      return 0;
    }

    function sortAccounts(a, b) {
      return (a.network - b.network)*100 + (a.account - b.account);
    }

    $scope.showAccounts = function(accounts, restoreAccounts) {

      $scope.pickedAccountsCount = 0;
      $scope.pickedGoogleAccounts = [];

      accounts.sort(sortAccounts);

      var lastPickedAccounts = [];

      if (restoreAccounts) {
        var lastAccounts = Google.user && Google.user.extension && Google.user.extension.lastAccounts;
        if (lastAccounts && lastAccounts.length) {

          $scope.pickedAccountsCount = 0;

          lastAccounts.forEach(function(a) {
            if ((a = _.findWhere(accounts, {_id: a}))) {
              a.picked = true;
              $scope.pickedAccountsCount++;
              lastPickedAccounts.push(a);
              pickGoogleAccount(a);
            }
          });
        }
      }

      accounts.forEach(function(a) {
        updateAccountFeatured(a);
      });

      $scope.availableAccounts = [];
      $scope.accounts = accounts;
    };

    $scope.fillAccounts = function() {
      var acc;

      accounts = [];

      if ($scope.account) {
        acc = _.clone($scope.account);
        acc.profile = $scope.profile;
        acc.picked = true;
        accounts.push(acc);
        $scope.pickedAccountsCount = 1;

        if (pickGoogleAccount(acc)) {
          updateAccountFeatured(acc);
        }
      } else {
        $scope.profile.accounts.forEach(function(account) {
          if (account.state === states.account.blocked.code) {
            return;
          }
          acc = _.clone(account);
          acc.profile = $scope.profile;
          accounts.push(acc);
        });
      }
    };

    $scope.refreshAccounts = function() {
      $scope.fillAccounts();
      $scope.showAccounts(accounts, $scope.account ? false : true);
    };

    $scope.refreshAccounts();

    $scope.switchEditorProfile = function(p) {
      $scope.profile = p;
      $scope.updateOwnerships();
      $scope.refreshAccounts();
    };

    $scope.addDestination = function(account) {

      $scope.availableAccounts = _.filter($scope.availableAccounts, function(acc) {
        // keep
        return acc.network === account.network && acc.uid === account.uid ? false : true;
      });

      $scope.accounts.push(account);

      $scope.pick(account, true);
    };

    ///////////////////////////////////////
    // Save Draft
    ///////////////////////////////////////

    function getHtml() {
      return $scope.tinymceModel && $scope.tinymceModel.replace(/\n/g, '') || '';
    }

    function createDraft(draft) {
      draft = draft || {};
      draft.html = getHtml();
      draft.attachments = {};

      if ($scope.attachLink && $scope.link) {
        var photo = $scope.link.photo;

        if (!photo && $scope.link.photoIdx > -1 && $scope.link.photos && $scope.link.photos.length > $scope.link.photoIdx) {
          photo = $scope.link.photos[$scope.link.photoIdx];
        }

        draft.attachments.link = {
          url: $scope.link.url && $scope.link.url.trim(),
          title: $scope.link.title,
          domain: $scope.link.domain,
          description: $scope.link.description,
          photo: photo
        };

        if ($scope.link.short) {
          draft.attachments.link.short = $scope.link.short;
        }
      }

      if ($scope.attachPhoto) {
        draft.attachments.photo = $scope.uploadedPhoto;
      }

      if (reshareActivityId) {
        draft.reshare = {
          is: true,
          id: reshareActivityId
        };
      }

      return draft;
    }

    $scope.$watch('editDraft', function(newVal/*, oldVal*/) {
      if (newVal) {
        ignoreNextEditorChange = true;
        $scope.tinymceModel = newVal.html;

        var account = _.findWhere($scope.accounts, {_id: newVal.aid});

        if ($scope.isGoogleProfileOrPage(account)) {

          if (newVal.destinations && newVal.destinations.length) {
            account.destinations = newVal.destinations;
          } else {
            updateAccountFeatured(account);
          }

          pickGoogleAccount(account);
        }

        if (newVal.attachments) {

          var att;

          $scope.removeAttachment();

          if (newVal.attachments.photo) {
            att = newVal.attachments.photo;

            $scope.attachPhoto = true;
            $scope.uploadedUrl = att.url;
            $scope.uploadedPhoto = att;
          }

          if (newVal.attachments.link) {

            att = newVal.attachments.link;

            /*jshint -W015*/
            var linkPreview = {
                  url: att.url,
                  title: att.title,
                  description: att.description
                };

            $scope.link = processLinkPreview(linkPreview);

            if (att.short) {
              $scope.link.short = att.short;
            }

            if (att.photo) {
              $scope.link.photoIdx = linkPreview.photoIdx = 0;
              $scope.link.photos = linkPreview.photos = [att.photo];
            }

            $scope.attachLink = true;
          }
        }

        // var isDraft = newVal.state === states.post.draft.code;
        // var isMoreDestinations = newVal.destinations && newVal.destinations.length > 1;
        var isPublicCircle = false;

        if (newVal.destinations && newVal.destinations.length) {
          newVal.destinations.forEach(function(d) {
            if (d.id === 'public-circle') {
              isPublicCircle = true;
            }
          });
        }

        $scope.updateTextLength();
        $scope.editDraftNotChanged = true;
      }
    });

    function createUploader(source, propertyName) {
      return function(callback) {
        var ok = false;
        var countdown = 3;
        async.doWhilst(function(cb) {
          Google.uploadPhoto(source[propertyName].url, function(err, result) {
            if (!err && result) {
              ok = true;
              var original = source[propertyName].original;
              source[propertyName] = result;
              source[propertyName].original = original || source[propertyName].original;

              // delay showing of a new post with image
              // if (result.thumbnail && result.thumbnail.gcs) {
              //   return setTimeout(callback, 1000);
              // }
              return cb();
            }
            setTimeout(cb, 500);
          });
        }, function() { return !ok && --countdown > 0; }, callback);
      };
    }

    $scope.saveDraft = function() {
      var draft = createDraft();

      $scope.savingDraft = true;

      var tasks = [];

      if (draft.attachments) {
        var link = draft.attachments.link,
            photo = draft.attachments.photo;
        if (link && link.photo && link.photo.url && !link.photo.gcs) {
          tasks.push(createUploader(draft.attachments.link, 'photo'));
        }
        if (photo && photo.url && !photo.gcs) {
          tasks.push(createUploader(draft.attachments, 'photo'));
        }
      }

      async.parallelLimit(tasks, 4, function() {

        Google.createDraft2(draft, $scope.profile, function(err, data) {

          $scope.savingDraft = false;

          if (err) {
            flash.error('Save as Draft', 'Draft save failed.');
            Analytics.push('ui','share','draft.create.error', Analytics.errToString(err));
          } else {
            flash.success('Save as Draft', 'Draft successfully saved.');

            Analytics.push('ui','share','draft.create.success',1);

            var contentType = draft.attachments && (draft.attachments.photo ? 'photo' :
                               draft.attachments.link ? 'link' : 'text');

            Intercom.event('draft_created');
            if (contentType) {
              Intercom.event('draft_'+contentType+'_created');
            }

            if ($scope.onSaveDraft) {
              draft._id = data && data.id;
              $scope.onSaveDraft(draft);
            }

            $scope.closeDialog();
          }
        });
      });
    };

    $scope.draftEditSave = function() {
      var draft = createDraft($scope.editDraft),
          account = _.findWhere($scope.accounts, {_id: $scope.editDraft.aid});

      if (account && $scope.isGoogleProfileOrPage(account)) {
        draft.destinations = account.destinations;
      }

      var tasks = [];

      if (draft.attachments) {
        var link = draft.attachments.link,
            photo = draft.attachments.photo;
        if (link && link.photo && link.photo.url && !link.photo.gcs) {
          tasks.push(createUploader(draft.attachments.link, 'photo'));
        }
        if (photo && photo.url && !photo.gcs) {
          tasks.push(createUploader(draft.attachments, 'photo'));
        }
      }

      async.parallelLimit(tasks, 4, function() {
        if ($scope.onEditSave) {
          $scope.onEditSave(draft);
        }
        $scope.closeDialog();
      });
    };

    ///////////////////////////////////////
    // Zavreni dialogu
    ///////////////////////////////////////

    var blurAndHideElement = function(e) {
      if (e) {
        e.focus();
        setTimeout(function() {
          e.setAttribute('readonly', 'readonly');
          e.setAttribute('disabled', 'true');
          e.setAttribute('style', 'display:none;');
          e.blur();
        }, 50);
      }
    };

    var hideKeyboard = function() {
      if (ed) { ed.hide(); }
      blurAndHideElement(document.querySelector('textarea.tinymce-editor'));
    };

    function closeDialogWindow() {
      hideKeyboard();
      $apply($scope, function() {
        var msg = { type: 'close' };
        function c() {
          $rootScope.$broadcast('share:dialog:close', msg);
        }
        $mdDialog.cancel().then(c, c);
        c();
      });
      if (isSharePopup) {
        $window.close();
      }
    }

    $scope.closeDialog = function() {
      closeDialogWindow();
      $scope.clearAll();
      Analytics.push('ui','share','hide', $scope.embedded ? 'app' : 'extension');
      if (isSharePopup) {
        $window.close();
      }
    };

    ///////////////////////////////////////
    // Add to Queue
    ///////////////////////////////////////

    function listPickedNotConnectedAccounts() {
      var ids = [];
      $scope.accounts.forEach(function(account) {
        if (account.picked && !account.skip && (!account._id || (!$scope.isPublishingToGoogleProfilesAllowed() && $scope.isGoogleProfile(account)))) {
          ids.push(account);
        }
      });
      return ids;
    }

    function listPickedConnectedAccounts() {
      var ids = [];
      $scope.accounts.forEach(function(account) {
        if (account.picked && !account.skip && account._id) {
          ids.push(account._id);
        }
      });
      return ids;
    }

    function listPickedConnectedAccountsWithDestinations() {
      var ids = [];
      $scope.accounts.forEach(function(account) {
        if (account.picked && !account.skip && account._id) {
          ids.push({
            _id: account._id,
            destinations: account.destinations
          });
        }
      });
      return ids;
    }

    function doQueuePost(type, publishAt, recaptchaToken) {
      var destinationAccounts = listPickedConnectedAccountsWithDestinations();
      if (!destinationAccounts.length) {
        $scope.closeDialog();
        return;
      }

      var contentType = ($scope.attachPhoto ? 'photo' :
                         $scope.attachLink ? 'link' : 'text'),
          evLabel = 'post.queue.'+contentType,
          evData = {
            type: type,
            scope: $scope.embedded ? 'app' : 'extension',
            connectedAccounts: destinationAccounts.length,
            notConnectedAccounts: listPickedNotConnectedAccounts().length
          };

      $scope.publishing = true;

      var tasks = [],
          post = createDraft({
            type: type,
            publishAt: publishAt ? publishAt.format() : undefined,
            accounts: destinationAccounts,
            source: $scope.embedded ? 'app' : 'extension',
            recaptcha: recaptchaToken
          });

      if (post.attachments) {
        var link = post.attachments.link,
            photo = post.attachments.photo;
        if (link && link.photo && link.photo.url && !link.photo.gcs) {
          tasks.push(createUploader(post.attachments.link, 'photo'));
        }
        if (photo && photo.url && !photo.gcs) {
          tasks.push(createUploader(post.attachments, 'photo'));
        }
      }

      async.parallelLimit(tasks, 4, function() {

        Google.share(post, function(err, data) {

          $scope.publishing = false;

          if (err || !data) {
            var errMsg = err && err.error && err.error.message;

            flash.error('Share', 'Failed to add post to the queue. Please try again.'+(errMsg?'<br><br>'+errMsg:''));

            Log.error('Failed to add post to the queue.',Analytics.errToString(err),evData);

            Analytics.push('ui','share',evLabel+'.error',Analytics.errToString(err),evData);
          } else
          if (data.success) {
            flash.success('Share', 'Post successfully queued.');

            Analytics.push('ui','share',evLabel+'.success',1,evData);

            if (Google.user) {
              if (!Google.user.extension) {
                Google.user.extension = {};
              }
              Google.user.extension.lastAccounts = _.map(destinationAccounts, function(a) {
                return a._id;
              });
            }

            Intercom.event('post_created', { type: contentType });
            if (contentType) {
              Intercom.event('post_'+contentType+'_created');
            }
            $scope.accounts.forEach(function(account) {
              if (account.picked && !account.skip && account._id) {
                Intercom.event('post_'+types.networkTypeNameOfAccount(account)+'_created');
              }
            });

            if ($scope.onNewPost) {
              $scope.onNewPost(data, $scope.editDraft);
            }

            $scope.closeDialog();
          } else
          if (data.queueLimitReached) {

            Analytics.push('ui','share',evLabel+'.warning','queue-limit-reached',evData);

            var account,
                googleProfileFound = false,
                accountsHtml = ['<ul>'];

            data.queueLimitReached.forEach(function(limit) {
              account = _.findWhere(accounts, {_id: limit.accountId});
              if (account) {
                if (account.network === types.network.google.code && account.account === types.account.profile.code) {
                  googleProfileFound = true;
                }
                accountsHtml.push('<li>'+account.name+' <small>('+types.typeNameOfAccount(account)+')</small> - max. '+limit.max+' queued post'+(limit.max>1?'s':'')+'</li>');
              }
            });

            accountsHtml.push('</ul>');

            dialogs.premiumRequired({
              lines: function() {
                return [
                  'It\'s great to see that you want to queue a new post.',
                  '<b>Queue'+(data.queueLimitReached.length > 1 ? 's are':' is')+' full.</b>',
                  accountsHtml.join(''),
                  'You can upgrade to queue an unlimited number of posts.'
                ];
              },
              featureName: function() {return 'queue-size-limit-reached';}
            });
          }
        });
      });
    }

    $scope.isOnlyShareNowAllowed = function() {
      return listPickedNotConnectedAccounts().length > 0;
    };

    function queuePost(type, publishAt) {

      if ($scope.isNotPublishable() || $scope.savingDraft || $scope.publishing || $scope.uploading) {
        return;
      }

      // var notConectedAccounts = listPickedNotConnectedAccounts();
      // if (notConectedAccounts.length) {
      //   if (type === 'now') {
      //
      //     var formatedHtml = getHtml();
      //
      //     Google.shareFormatGoogle(formatedHtml, function(err, data) {
      //
      //       formatedHtml = data && data.html || formatedHtml;
      //
      //       doQueuePost(type, publishAt);
      //
      //       async.eachLimit(notConectedAccounts, 4, function(account, cb) {
      //
      //         var post = createDraft();
      //         post.uid = post.uid || account.uid;
      //         post.parentUid = post.parentUid || account.parentUid;
      //         post.html = formatedHtml;
      //         post.accountCode = decodeDestinationsToAccountCode(account, account.destinations);
      //         post.destinations = minimizeAccountDestinations(account.destinations);
      //
      //         // TODO odladit publish funkci, upload obrazku, ...
      //         Extension.publish(account.parentUid || account.uid, post).then(function(rsp) {
      //
      //           // TODO neco udelat s odpovedi na uspesne publikovani
      //
      //           var error = rsp && _.isArray(rsp) && rsp.length > 0 && rsp[0].reply && rsp[0].reply.error;
      //           if (error) {
      //             // error.message
      //             // error.error
      //             // TODO show notification about failed post
      //           } else {
      //             // TODO show notification about successfully published post
      //           }
      //
      //           cb();
      //         }, cb);
      //       }, function() {
      //       });
      //     });
      //   } else {
      //     var tags = ['<ul>'];
      //
      //     notConectedAccounts.forEach(function(account) {
      //       tags.push('<li>'+account.name+' <small>('+types.typeNameOfAccount(account)+')</small></li>');
      //     });
      //
      //     tags.push('</ul>');
      //
      //     var lines = [];
      //
      //     if ($scope.isPublishingToGoogleProfilesAllowed()) {
      //       lines = ['<p>Post Scheduling is not supported for accounts not connected to Friends+Me.</p>']
      //         .concat(tags)
      //         .concat(['<p>I suggest to connect above mentioned accounts to be able to schedule new posts for them or to not to schedule this post and share now.</p>']);
      //     } else {
      //       lines = ['<p>Post Scheduling is not supported for Google+ profiles.</p>']
      //         .concat(tags)
      //         .concat(['<p>You can either unselect Google+ profiles or to publish the post now.</p>']);
      //     }
      //
      //     dialogs.confirm('Cannot schedule post',
      //       lines.join(''), $scope.isPublishingToGoogleProfilesAllowed() ? 'Unselect mentioned accounts' : 'Unselect Google+ profiles',
      //     function() {
      //
      //       notConectedAccounts.forEach(function(account) {
      //         account.picked = false;
      //         $scope.pickedAccountsCount--;
      //       });
      //     });
      //   }
      // } else {
        // humanCheck(listPickedConnectedAccountsWithDestinations().length, function(recaptchaToken) {
        //   doQueuePost(type, publishAt, recaptchaToken);
        // });
        doQueuePost(type, publishAt);
      // }
    }

    $scope.addToQueue = function() {
      queuePost('next');
    };

    ///////////////////////////////////////
    // Share Now
    ///////////////////////////////////////

    $scope.shareNow = function() {
      queuePost('now');
    };

    ///////////////////////////////////////
    // Share Next
    ///////////////////////////////////////

    $scope.shareNext = function() {
      queuePost('first');
    };

    ///////////////////////////////////////
    // Schedule Post
    ///////////////////////////////////////

    $scope.schedulePost = function() {
      dialogs.dateTimePicker(function(time) {
        queuePost('schedule', time);
      }, null, {
        time: function() {
          return moment.utc().toDate();
        }
      });
    };

    ///////////////////////////////////////
    // Max. Post Length
    ///////////////////////////////////////

    function prepareText(text) {
      if (text === undefined) {
        return undefined;
      }
      if (text === null) {
        return null;
      }
      if (text === '<p>&nbsp;</p>') {
        return '';
      }
      /*jshint -W044*/
      text = S(text).decodeHtmlEntities().replaceAll(/<\s*br[^>]*\/?\s*>/g, '\n').stripTags().s.replace(/[ \t]+/g, ' ').replace(/^[ \t]+|[ \t]+$/g, '')
      .replace(/&([#][x]*[0-9]+);/g, function(m, n) {
        var code;
        if (n.substr(0, 1) === '#') {
          if (n.substr(1, 1) === 'x') {
            code = parseInt(n.substr(2), 16);
          } else {
            code = parseInt(n.substr(1), 10);
          }
        }
        return (code === undefined || isNaN(code)) ?
          '&' + n + ';' : String.fromCharCode(code);
      });
      text = S(text).trim().s;
      return text;
    }

    function postPlainText(post) {
      return prepareText((post && post.html && post.html.replace(/&nbsp;/g, '') || '').
        replace(/<\s*\/\s*p[^>]*\s*>\s*<\s*p[^>]*\s*>/g, '\n').
        replace(/<\s*\/?\s*p[^>]*\s*>/g, '').
        replace(/<input.*class=\".*autocompleted-.*\".*value=\"(.*)\".*\/>/g, '$1'));
    }

    function planTextPostLength(post) {
      return postPlainText(post).length;
    }

    function twitterAttachmentsLength(post) {
      var attachedLinkUrl = post.attachments && post.attachments.link && post.attachments.link.url || '';
      var attachedLinkShortenedUrl = post.attachments && post.attachments.link && post.attachments.link.short && post.attachments.link.short.url || '';
      var attachedLinkFound = (attachedLinkUrl && post.html.indexOf(attachedLinkUrl) > -1) ||
                              (attachedLinkShortenedUrl && post.html.indexOf(attachedLinkShortenedUrl) > -1);
      var attachLink = !attachedLinkFound && (attachedLinkUrl || attachedLinkShortenedUrl) || '';
      var length = attachLink && twttr.txt.getTweetLength(' ' + attachLink) || 0;
      return length;
    }

    var networkLengths = {};
    networkLengths[types.network.twitter.code] = {
      maxLength: function(account, post) {
        return 280 - twitterAttachmentsLength(post);
      }
    };
    networkLengths[types.network.instagram.code] = {
      maxLength: 800
    };
    networkLengths[types.network.facebook.code] = {
      maxLength: 10000
    };
    networkLengths[types.network.linkedin.code] = {
      maxLength: 1250
    };

    $scope.lengths = function() {
      var length, maxLength,
          results = [],
          pickedAccounts = 0,
          post = createDraft(),
          editDraftAccount = $scope.editDraft && $scope.editDraft.account,
          accs = editDraftAccount && [editDraftAccount] || $scope.accounts || [];

      accs.forEach(function(account) {
        if (editDraftAccount || account.picked) {

          pickedAccounts++;

          maxLength = networkLengths[account.network] && networkLengths[account.network].maxLength || -1;
          if (_.isFunction(maxLength)) {
            maxLength = maxLength(account, post);
          }
          if (maxLength > -1) {
            length = (networkLengths[account.network] && networkLengths[account.network].length || planTextPostLength)(post);
            results.push([length, maxLength]);

            var p = length / maxLength;
            account.danger = p > 1 ? true : false;
            account.warning = !account.danger &&  p > 0.75 ? true : false;
            // account.skip = account.danger;
          }
        }
      });

      if (!results.length) {
        return {
          accountsCount: pickedAccounts,
          length: planTextPostLength(post),
          maxLength: -1
        };
      }

      results.sort(function(a, b) {
        return a[1] - b[1];
      });

      return {
        accountsCount: pickedAccounts,
        length: results[0][0],
        maxLength: results[0][1]
      };
    };

    ///////////////////////////////////////
    // Link Auto Preview
    ///////////////////////////////////////

    $scope.lookupLinkForAutoPreview = function(val) {

      if ($scope.attachLink || $scope.attachPhoto) {
        return;
      }

      var links = twttr.txt.extractUrlsWithIndices(val);
      if (links && links.length) {
        $scope.linkPreview(links[0].url, function(ok) {
          if (ok) {
            $scope.attachLink = true;
            $scope.updateTextLength();
          }
        }, true);
      }
    };

    ///////////////////////////////////////
    // link highlighter
    ///////////////////////////////////////

    // function escapeRegExp(str) {
    //   return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    // }

    $scope.urlDomain = function(url) {
      var a = document.createElement('a');
      a.href = url;
      return a.hostname;
    };

    var unshortenedLinks = {},
        shortenedLinks = {};

    function accountShortenerName(account) {
      switch (account.shortener.type) {
      case 'fpmelink':
        return 'Fpme.link';
      case 'bitly':
        return 'Bit.ly';
      case 'googl':
        return 'Goo.gl';
      default:
        return account.shortener.type;
      }
    }

    function accountShortenerId(account) {
      switch (account.shortener.type) {
      case 'bitly':
        return account.shortener.bitly && (account.shortener.bitly.name || account.shortener.bitly.id);
      case 'googl':
        return account.shortener.googl && (account.shortener.googl.name || account.shortener.googl.id);
      default:
        return null;
      }
    }

    function updateLink(useAccount, editor, rng, start, end, oldUrl, newUrl) {
      // if ($scope.attachLink && $scope.link && $scope.link.url === oldUrl) {
      //   $scope.link.url = newUrl;
      //   $scope.link.domain = $scope.urlDomain(newUrl);
      // }

      if ($scope.attachLink && $scope.link) {
        if ($scope.link.url === newUrl) {
          delete $scope.link.short;
        } else {
          $scope.link.short = {
            type: useAccount.shortener.type,
            url: newUrl,
            aid: useAccount._id
          };
        }
      }

      rng.setStart(rng.startContainer, start);
      rng.setEnd(rng.startContainer, end);
      editor.selection.setRng(rng);
      editor.insertContent(newUrl);
    }

    function shortenLink(useAccount, editor, rng, start, end, link) {
      Google.profileAccountShortenLink(useAccount, link, function(err, data) {
        if (data && data.url && data.url !== link) {
          var shortened = data.url;
          shortenedLinks[shortened] = link;
          unshortenedLinks[link] = shortened;
          updateLink(useAccount, editor, rng, start, end, link, shortened);
        }
      });
    }

    $scope.editorClickShortenLink = function(editor, event) {
      var isMac = /Macintosh/.test($window.navigator.userAgent),
          isCtrl = event && ((isMac && (event.metaKey || event.ctrlKey)) || (!isMac && event.ctrlKey));

      if (!isCtrl) {
        return;
      }

      var id, useAccount,
          q = {},
          shortenerAccounts = [],
          connectedAccounts = listPickedConnectedAccounts();

      if (!connectedAccounts.length) {
        return;
      }

      // for (var i = 0; i < connectedAccounts.length; i++) {
      //   useAccount = _.findWhere(accounts, {_id: connectedAccounts[i]});
      //   if (useAccount && useAccount.shortener && useAccount.shortener.type !== 'none') {
      //     break;
      //   } else {
      //     useAccount = null;
      //   }
      // }

      // if (!useAccount) {
      //   return;
      // }

      for (var i = 0; i < connectedAccounts.length; i++) {
        useAccount = _.findWhere(accounts, {_id: connectedAccounts[i]});
        if (useAccount && useAccount.shortener && useAccount.shortener.type !== 'none') {
          id = useAccount.shortener.type+':';
          switch (useAccount.shortener.type) {
          case 'bitly':
            id += useAccount.shortener.bitly.id;
            break;
          case 'googl':
            id += useAccount.shortener.googl.id;
            break;
          }
          if (!q[id]) {
            q[id] = true;
            shortenerAccounts.push(useAccount);
          }
        }
      }

      if (!shortenerAccounts.length) {
        return;
      }
      shortenerAccounts.sort(function(a, b) {
        return a.shortener.type.toLowerCase().localeCompare(b.shortener.type.toLowerCase());
      });

      var rng = editor.selection.getRng(true);
      if (!rng) {
        return;
      }

      var link = '',
          content = rng.startContainer.nodeValue,
          start = rng.startOffset,
          end = start;

      if (!content || content.length < 2) {
        return;
      }

      while (--start >= 0 && !/\s/.test(content[start])) {
        link = content[start]+link;
      }
      while (end < content.length && !/\s/.test(content[end])) {
        link += content[end++];
      }

      start++;

      var isLink = reWebUrl.test(link);

      if (link && isLink && start < end) {
        if (unshortenedLinks[link]) {
          updateLink(useAccount, editor, rng, start, end, link, unshortenedLinks[link]);
        } else
        if (shortenedLinks[link]) {
          updateLink(useAccount, editor, rng, start, end, link, shortenedLinks[link]);
        } else {

          if (shortenerAccounts.length > 1) {
            // var tinymcePosition = $(editor.getContainer()).offset();
            // $scope.pickFromShortenerAccountsPosition = {
            //   left: event.screenX-tinymcePosition.left,
            //   top: event.screenY-tinymcePosition.top
            // };
            $mdDialog.show({
              controller: ['$scope', '$mdDialog', function PickLinkShortenerDialogCtrl($scope, $mdDialog) {
                $scope.accounts = shortenerAccounts;
                $scope.$name = accountShortenerName;
                $scope.$aid = accountShortenerId;
                $scope.$mdDialog = $mdDialog;
              }],
              templateUrl: '/views/dialogs/PickLinkShortener.html',
              parent: angular.element(document.body),
              multiple: true,
              hasBackdrop: true,
              clickOutsideToClose: true,
              fullscreen: false
            })
            .then(function(account) {
              if (account) {
                useAccount = account;
                shortenLink(useAccount, editor, rng, start, end, link);
              }
            }, function() {});
          } else {
            shortenLink(useAccount, editor, rng, start, end, link);
          }
        }
      }
    };

    ///////////////////////////////////////
    // Text Length Counter
    ///////////////////////////////////////

    $scope.isTextLengthOk = true;
    $scope.textLength = 0;
    $scope.textLengthMax = -1;
    $scope.textLengthLabel = '';

    $scope.updateTextLength = function() {

      var lengths = $scope.lengths();

      $scope.textLengthLabel = 'label-default';

      if (lengths.maxLength > -1) {
        var p = lengths.length / lengths.maxLength;
        if (p > 1) {
          $scope.textLengthLabel = 'label-danger';
        } else
        if (p > 0.75) {
          $scope.textLengthLabel = 'label-warning';
        }
      }

      $scope.textLength = lengths.length;
      $scope.textLengthMax = lengths.maxLength;
      $scope.isTextLengthOk = true; // lengths.accountsCount > 1 ? true : $scope.textLengthMax === -1 ? true : $scope.textLength <= $scope.textLengthMax ? true : false;
    };

    var lookupLinkForAutoPreviewTimer;

    $scope.$watch('tinymceModel', function(newValue/*, oldValue*/) {
      $scope.updateTextLength();

      if (lookupLinkForAutoPreviewTimer) {
        clearTimeout(lookupLinkForAutoPreviewTimer);
      }
      lookupLinkForAutoPreviewTimer = setTimeout(function() {
        lookupLinkForAutoPreviewTimer = null;
        $scope.lookupLinkForAutoPreview(newValue);
      }, 750);
    });

    $scope.goShareLogin = function() {
      if ($scope.shareLoginUrl) {
        $window.location = $scope.shareLoginUrl;
      }
    };

    ///////////////////////////////////////
    // Process URL parameters
    ///////////////////////////////////////
    if (!$scope.embedded) {
      if (paramImage) {
        shareImageFromUrl(paramImage);
      } else
      if (paramUrl) {
        $scope.linkPreview(paramUrl, function(ok) {
          if (ok) {
            $scope.attachLink = true;
          }
        }, true);
      }

      if (paramPost) {
        $scope.tinymceModel = paramPost;
      }
    }

    ///////////////////////////////////////
    // dialog
    ///////////////////////////////////////

    $scope.draftEditCancel = function() {
      if ($scope.onEditCancel) {
        $scope.onEditCancel($scope.editDraft);
      }
    };

    $scope.cancel = function($event) {
      var canClose = (!$scope.editDraft && $scope.textLength === 0) ||
                     ($scope.editDraft && $scope.editDraftNotChanged);
      if (canClose) {
        $scope.draftEditCancel();
        return closeDialogWindow();
      }
      var text = $scope.editDraft ? 'Discard changes?' : 'Discard post?';
      var confirm = $mdDialog.confirm()
        .multiple(true)
        .parent(angular.element(document.body))
        .textContent(text)
        .ariaLabel(text)
        .targetEvent($event)
        .ok('Discard')
        .cancel('Keep');
      $mdDialog.show(confirm).then(function() {
        $scope.draftEditCancel();
        closeDialogWindow();
      });
    };

    $scope.transformChip = function(chip) { return chip; };

    ///////////////////////////////////////
    // Analytics
    ///////////////////////////////////////
    Analytics.push('ui','share','show', $scope.embedded ? 'app' : 'extension');
  }]);
