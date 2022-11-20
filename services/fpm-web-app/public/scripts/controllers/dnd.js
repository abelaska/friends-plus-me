'use strict';

angular.module('fpmApp')
  .controller('DndCtrl', ['$rootScope', '$scope', '$window', '$timeout', function($rootScope, $scope, $window, $timeout) {

    var dndActive = false,
        diff = {x: 0, y: 0},
        dndStart = {x: 0, y: 0};

    $rootScope.$on('dnd-start', function(event, $event) {
      dndStart = {x: $event.x, y: $event.y};
      dndActive = true;
    });

    $rootScope.$on('share:dialog:close', function(event, msg) {
      $scope.close(null, null, msg);
    });

    $scope.close = function($event, $hotkey, msg) {

      msg = msg||{};
      msg.type = 'close';

      try {
        $window.parent.postMessage(msg, '*');
        if ($window.parent.parent) {
          $window.parent.parent.postMessage(msg, '*');
        }
      } catch (e) {
        try {
          if ($window.parent.parent) {
            $window.parent.parent.postMessage(msg, '*');
          }
        } catch(e) {}
      }
    };

    $scope.closeCheck = function($event) {
      var close = true;
      var el = $event.target;
      var className, nodeName;
      while (el) {
        className = el.className && el.className.toLowerCase() || '';
        nodeName = el.nodeName && el.nodeName.toLowerCase() || '';
        if ((['md-virtual-repeat-container', 'md-menu-content', 'md-dialog'].indexOf(nodeName) > -1) ||
            (className.indexOf('menu-container') > -1 || className.indexOf('md-menu-backdrop') > -1))
        {
          close = false;
          break;
        }
        el = el.parentNode;
      }
      if (close) {
        $scope.close();
      }
    };

    $scope.dndStop = function(/*$event*/) {
      if (dndActive) {
        dndActive = false;
        $rootScope.$broadcast('dnd-stop');
      }
    };

    $scope.dndMove = function($event) {
      if (dndActive) {

        diff = {
          x: $event.x - dndStart.x,
          y: $event.y - dndStart.y
        };

        $timeout(function() {
          $rootScope.$broadcast('dnd-diff', diff);
        }, 80);
      }
    };
  }]);
