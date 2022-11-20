/*jshint -W015*/
'use strict';

angular.module('urls', [])
.factory('urls', ['$window', '_', function($window, _) {

    function urlParams(url, params, query) {
      
      _.pairs(params).forEach(function(pair) {
        url = url.replace(new RegExp(':'+pair[0], 'g'), pair[1]);
      });

      var q = '';

      if (query) {
        _.pairs(query).forEach(function(pair) {
          if (q) {
            q += '&';
          }
          q += pair[0]+'='+encodeURIComponent(pair[1]);
        });
      }

      return url + (q ? '?'+q : '');
    }

    function redirect(url, params, query) {
      $window.location.href = urlParams(url, params, query);
    }

    return {
      urlParams: urlParams,
      redirect: redirect
    };
  }]);