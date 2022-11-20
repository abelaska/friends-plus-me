'use strict';

angular.module('fpmApp')
  .controller('TeamSettingsCtrl', ['$scope', '$mdDialog', 'flash', 'Google', function($scope, $mdDialog, flash, Google) {

    $scope.Google = Google;
    $scope.updating = false;

    $scope.changeProfileContactName = function($event) {
      var confirm = $mdDialog.prompt()
        .title('Update Contact Name')
        .textContent('Enter new contact name.')
        .placeholder('Team Contact Name')
        .ariaLabel('Team Contact Name')
        .initialValue((Google.profile.contact && Google.profile.contact.name) || Google.user.name)
        .targetEvent($event)
        .ok('Update')
        .cancel('Cancel');
      $mdDialog.show(confirm).then(function(newContactName) {
        if (newContactName) {
          $scope.updating = true;
          Google.profileUpdateContactName(newContactName, function(err) {
            if (err) {
              var msg = err.error && err.error.message;
              flash.error('Contact Name Update', msg || 'We are sorry but we have not been able to update contact name. Please try again.');
            } else {
              flash.success('Contact Name Update', 'Contact name was successfully updated.');
              Google.profile.contact = Google.profile.contact || {};
              Google.profile.contact.name = newContactName;
            }
            $scope.updating = false;
          });
        }
      }, function() {});
    };

    $scope.changeProfileContactEmail = function($event) {
      var confirm = $mdDialog.prompt()
        .title('Update Contact E-mail')
        .textContent('Enter new contact e-mail.')
        .placeholder('Team Contact E-mail')
        .ariaLabel('Team Contact E-mail')
        .initialValue((Google.profile.contact && Google.profile.contact.email) || Google.user.email)
        .targetEvent($event)
        .ok('Update')
        .cancel('Cancel');
      $mdDialog.show(confirm).then(function(newContactEmail) {
        if (newContactEmail) {
          $scope.updating = true;
          Google.profileUpdateContactEmail(newContactEmail, function(err) {
            if (err) {
              var msg = err.error && err.error.message;
              flash.error('Contact E-mail Update', msg || 'We are sorry but we have not been able to update contact e-mail. Please try again.');
            } else {
              flash.success('Contact E-mail Update', 'Contact e-mail was successfully updated.');
              Google.profile.contact = Google.profile.contact || {};
              Google.profile.contact.email = newContactEmail;
            }
            $scope.updating = false;
          });
        }
      }, function() {});
    };

    $scope.renameProfile = function($event) {
      var confirm = $mdDialog.prompt()
        .title('Rename Profile')
        .textContent('Enter new name for "'+Google.profile.name+'" team.')
        .placeholder('Team Name')
        .ariaLabel('Team Name')
        .initialValue(Google.profile.name)
        .targetEvent($event)
        .ok('Rename Team')
        .cancel('Cancel');
      $mdDialog.show(confirm).then(function(newProfileName) {
        if (newProfileName) {
          $scope.updating = true;
          Google.profileUpdateProfileName(newProfileName, function(err) {
            if (err) {
              var msg = err.error && err.error.message;
              flash.error('Team Name Update', msg || 'We are sorry but we have not been able to update team name. Please try again.');
            } else {
              flash.success('Team Name Update', 'Team name was successfully updated.');
              Google.profile.name = newProfileName;
            }
            $scope.updating = false;
          });
        }
      }, function() {});
    };
  }]);
