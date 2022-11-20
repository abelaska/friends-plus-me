'use strict';

angular.module('fpmApp').controller('DeleteProfileCtrl', ['$rootScope', '$scope', '$mdDialog', '$window', 'Google', 'flash', 'Intercom', function($rootScope, $scope, $mdDialog, $window, Google, flash, Intercom) {
    $scope.deleting = false;
    $scope.showTos = false;
    $scope.Google = Google;
    $scope.deleteAlsoUser = Google.profiles.length < 2;

    $scope.answered = function(reason1, reason2) {
      if (reason1 === 'not_using_enough') {
        return reason2 ? true : false;
      }
      return reason1 ? true : false;
    };

    $scope.admin = function($event) {
      if ($event.altKey) {
        $scope.showTos = !!!$scope.showTos;
        $scope.reason1 = 'tos_violation';
      }
    };

    $scope.delete = function(reason1, reason2, reason3) {
      $scope.deleting = true;

      Google.deleteProfile(reason1 || '', reason2 || '', reason3 || '', function(err, deleted) {
        if (deleted) {
          Intercom.event('team_deleted', { team_id: Google.profile._id, user_deleted: $scope.deleteAlsoUser });

          //Analytics.track.userDelete();
          if ($scope.deleteAlsoUser) {
            $window.location = 'https://friendsplus.me';
          } else {
            $mdDialog.hide();

            Google.profiles = Google.profiles.filter(function(p) {
              return p._id !== Google.profile._id;
            });

            Google.user.profiles.owner = Google.user.profiles.owner.filter(function(p) {
              return p !== Google.profile._id;
            });

            $rootScope.switchToProfile(Google.profiles[0]);

            flash.success('Delete Team', 'Team successfully deleted.');
          }
        } else {
          $mdDialog.cancel();
          flash.error('Delete Team', 'Removal of team failed. Please try again.');
        }
      });
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };
  }]);
