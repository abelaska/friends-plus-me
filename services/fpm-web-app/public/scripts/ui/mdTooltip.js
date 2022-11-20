'use strict';

// https://github.com/angular/material/issues/4176
// http://stackoverflow.com/questions/35329388/how-to-dynamically-remove-a-md-tooltip-with-angular-material

angular.module('fpmApp')
.directive('mdTooltip', function(){  //create your overriding directive
  return{
    replace: true,
    template: '<span style="display:none"></span>',
    scope: {}, //create an isolated scope
    link: function(scope, element){
       element.remove();
       scope.$destroy();
    }
  };
}).decorator('mdTooltipDirective', ['$delegate', '$isMobile', function($delegate, $isMobile){
  var version = $isMobile ? 1 : 0;
  return [$delegate[version]];
}]);