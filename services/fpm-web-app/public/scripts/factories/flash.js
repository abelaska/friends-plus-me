/* global angular */
'use strict';

angular.module('flash', []).factory('flash', ['$mdToast', function($mdToast) {

  var pop = function(type, title, body) {
    var color = type === 'success' ? 'rgb(76,175,80)': type === 'error' ? 'rgb(229, 57, 53)': type === 'warning' ? 'rgb(255,152,0)': '#fff';
    var icon = type === 'info' ? 'information': type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle': type === 'warning' ? 'alert': '';
    $mdToast.show({
      hideDelay: type === 'error' || type === 'warning' ? 5000 : 2000,
      position: 'bottom left',
      template:
        '<md-toast>' +
          '<div layout="column" layout-align="start start" ng-click="close()" style="width: 100%;min-height: 48px;padding: 20px;font-size: 14px;background-color: #323232;color: rgb(250,250,250);cursor: pointer;">' +
            '<div layout="row" layout-align="start center" style="width: 100%;">' +
              (icon ? '<md-icon md-svg-icon="/images/icons/'+icon+'.svg" style="margin-right:10px;width: 40px;height: 40px;color:'+color+'"></md-icon>' : '') +
              '<strong flex style="margin-right:10px;color:'+color+'">'+(title || body)+'</strong>' +
              '<md-icon md-svg-icon="/images/icons/close.svg" style="color:#fff"></md-icon>' +
            '</div>'+
            (body && title ? '<div flex style="margin-top:10px">'+body+'</div>' : '') +
          '</div>' +
        '</md-toast>',
      controller: ['$scope', '$mdToast', function($scope, $mdToast) {
        $scope.close = function() { $mdToast.hide(); };
      }]
    });
  };

  var pops = {
    error: function(title, body) { pop('error', title, body); },
    warning: function(title, body) { pop('warning', title, body); },
    success: function(title, body) { pop('success', title, body); },
    info: function(title, body) { pop('info', title, body); }
  };

  return {
    pop: function(message) {
      switch(message.type) {
      case 'success':
        pops.success(message.body, message.title);
        break;
      case 'info':
        pops.info(message.body, message.title);
        break;
      case 'warning':
        pops.warning(message.body, message.title);
        break;
      case 'error':
        pops.error(message.body, message.title);
        break;
      }
    },
    success: pops.success,
    info: pops.info,
    warning: pops.warning,
    error: pops.error
  };
}]);