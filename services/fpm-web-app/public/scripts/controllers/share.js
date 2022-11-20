'use strict';

angular.module('fpmApp')
  .controller('ShareCtrl', ['$rootScope', '$mdDialog', function($rootScope, $mdDialog) {
    $mdDialog.show({
      controller: 'EditorCtrl',
      templateUrl: '/views/editor.html',
      parent: angular.element(document.body),
      escapeToClose: false,
      clickOutsideToClose: false,
      fullscreen: false,
      hasBackdrop: false,
      locals: {
        isShareLite: $rootScope.isShareLite,
        isSharePopup: $rootScope.isSharePopup,
        account: null,
        onSaveDraft: null,
        onNewPost: null,
        onEditSave: null,
        onEditCancel: null,
        embedded: false,
        hideGoogleDestinations: false,
        hideDestinations: false,
        hidePublishingButtons: false,
        isReshare: false,
        isDraftEdit: false,
        isShareDraft: false,
        creatDraftOnly: false,
        editDraft: null
      }
    })
    .then(function() {}, function() {});
  }]);
