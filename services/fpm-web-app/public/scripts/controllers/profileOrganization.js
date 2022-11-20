'use strict';

angular.module('fpmApp')
  .controller('ProfileOrganizationCtrl', ['$rootScope', '$scope', '$sanitize', 'flash', 'config', 'types', 'countries', 'Google', function($rootScope, $scope, $sanitize, flash, config, types, countries, Google) {

    if (Google.profile && !Google.profile.subject) {
      Google.profile.subject = {};
    }

    $scope.Google = Google;
    $scope.countries = countries;
    $scope.billTo = (Google.profile.subject.billTo || '').replace(/<br>/g,'\n');
    $scope.saving = false;

    $scope.save = function() {

      $scope.saving = true;

      Google.profile.subject.billTo = ($scope.billTo || '').replace(/\n/g,'<br>');
      Google.profile.subject.billTo = Google.profile.subject.billTo && $sanitize(Google.profile.subject.billTo);
      Google.profile.subject.org = Google.profile.subject.org && $sanitize(Google.profile.subject.org);
      Google.profile.subject.vatId = Google.profile.subject.vatId && $sanitize(Google.profile.subject.vatId);

      Google.profileGoogleSaveOrganization(function(err) {
        if (err) {
          var msg = err.error && err.error.message;
          flash.pop({title: 'Organization info update', body: msg || 'We are sorry but we have not been able to update organization info. Please try again.', type: 'error'});
        } else {
          flash.pop({title: 'Organization info update', body: 'Organization info was successfully updated.', type: 'success'});
        }
        $scope.saving = false;
      });
    };
  }]);