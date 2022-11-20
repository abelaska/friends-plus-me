/* global angular */
angular.module('fpmApp')
  .controller('UserNotificationsCtrl', ['$rootScope', '$scope', 'Google', 'flash', function ($rootScope, $scope, Google, flash) {
    $scope.notifications = Google.user.notifications;

    $scope.update = function (key) {
      Google.apiUpdateUser({ notifications: $scope.notifications }, function (err, data) {
        if (err || !data || !data.ok) {
          flash.error('User Notifications', 'Failed to update user notifications. Please try again.');
        } else {
          flash.success('User Notifications', 'User notifications successfully updated.');
        }
      });
    };
}]);
