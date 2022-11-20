'use strict';

angular.module('dialogs', [])
.directive('popoverHtmlUnsafePopup', function () {
  return {
    restrict: 'EA',
    replace: true,
    scope: { title: '@', content: '@', placement: '@', animation: '&', isOpen: '&' },
    templateUrl: 'template/popover/popover-html-unsafe-popup.html'
  };
})
.directive('popoverHtmlUnsafe', [ '$tooltip', function ($tooltip) {
  return $tooltip('popoverHtmlUnsafe', 'popover', 'mouseenter');
}])
.run(['$templateCache', function($templateCache) {
  $templateCache.put('template/popover/popover-html-unsafe-popup.html',
    '<div class="popover {{placement}}" ng-class="{ in: isOpen(), fade: animation() }">'+
    '<div class="arrow"></div>'+
      '<div class="popover-inner">'+
          '<h3 class="popover-title" ng-bind="title" ng-show="title"></h3>'+
          '<div class="popover-content" bind-html-unsafe="content"></div>'+
      '</div>'+
    '</div>');
}])
.factory('dialogs', ['$mdDialog', '$state', 'Google', 'Events', function($mdDialog, $state, Google, Events) {

  function resolveLocals(resolve) {
    var result = {};
    var keys = resolve && Object.keys(resolve) || [];
    keys.forEach(function(k) {
      result[k] = typeof resolve[k] === 'function' ? resolve[k]() : resolve[k];
    });
    return result;
  }

  function openDialog(name, resolve, resolveCallback, rejectCallback) {
    $mdDialog.show({
      controller: name + 'Ctrl',
      templateUrl: '/views/dialogs/' + name + '.html',
      parent: angular.element(document.body),
      multiple: true,
      escapeToClose: true,
      clickOutsideToClose: true,
      fullscreen: false,
      hasBackdrop: true,
      locals: resolveLocals(resolve)
    })
    .then(resolveCallback, rejectCallback);
  }

  function createOpenDialogFce(name) {
    return function(resolve, resolveCallback, rejectCallback) {
      openDialog(name, resolve, resolveCallback, rejectCallback);
    };
  }

  function confirmDelete(title, body, confirmedCallback, canceledCalback) {
    $mdDialog.show($mdDialog.confirm().title(title).textContent(body)
      .ariaLabel(title).ok('Delete').cancel('Cancel')).then(confirmedCallback, canceledCalback);
  }

  function confirm(title, body, confirmLabel, confirmedCallback, canceledCalback) {
    $mdDialog.show($mdDialog.confirm().title(title).textContent(body)
      .ariaLabel(title).ok(confirmLabel).cancel('Cancel')).then(confirmedCallback, canceledCalback);
  }

  function deleteProfile(resolveCallback, rejectCallback) {
    openDialog('DeleteProfile', null, resolveCallback, rejectCallback);
  }

  function cancelSubscription(resolveCallback, rejectCallback) {
    openDialog('CancelSubscription', null, resolveCallback, rejectCallback);
  }

  function dateTimePicker(resolveCallback, rejectCallback, resolve) {
    openDialog('DateTimePicker', resolve, resolveCallback, rejectCallback);
  }

  function premiumRequired(resolve, resolveCallback, rejectCallback) {
    if (!resolve.upgradeStateId) {
      resolve.upgradeStateId = function() { return 'profiles.pid.billing'; };
      resolve.upgradeStateParams = function() { return $state.params; };
    }
    var locals = resolveLocals(resolve);
    $mdDialog.show({
      controller: 'PremiumRequiredCtrl',
      templateUrl: '/views/dialogs/PremiumRequired.html',
      parent: angular.element(document.body),
      multiple: true,
      escapeToClose: true,
      clickOutsideToClose: true,
      fullscreen: false,
      hasBackdrop: true,
      locals: locals
    })
    .then(function() {
      if (resolveCallback) {
        resolveCallback();
      }
    }, function() {
      Events.push('reject-premium-dialog', { feature: locals.featureName || undefined });
      if (rejectCallback) {
        rejectCallback();
      }
    });
  }

  return {
    openDialog: openDialog,

    confirm: confirm,
    confirmDelete: confirmDelete,

    cancelSubscription: cancelSubscription,

    bitly: createOpenDialogFce('Bitly'),
    googl: createOpenDialogFce('Googl'),
    premiumRequired: premiumRequired,
    deleteProfile: deleteProfile,
    dateTimePicker: dateTimePicker
  };
}]);
