'use strict';

angular.module('fpmApp')
  .controller('DateTimePickerCtrl', ['$scope', '$mdDialog', 'moment', 'jstz', 'time', function($scope, $mdDialog, moment, jstz, time) {

    var tz = jstz.determine().name();

    $scope.time = time || null;
    $scope.selectedTime = null;
    $scope.tzName = tz.replace('_',' ').replace('/',': ');

    $scope.onTimeSet = function (newDate/*, oldDate*/) {
      $scope.selectedLocalTime = moment(newDate);
      $scope.selectedTime = $scope.selectedLocalTime.clone().utc();
    };

    $scope.cancel = function() { $mdDialog.cancel(); };

    $scope.confirm = function() {
      $mdDialog.hide($scope.selectedTime);
    };
  }]);