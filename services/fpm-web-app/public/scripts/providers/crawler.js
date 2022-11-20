'use strict';
/*jshint -W106*/

angular.module('crawler', []).provider('Crawler', function() {

  var Crawler = ['$http', 'Log', 'config', function($http, Log, config) {

    this.crawlerUrl = config.crawler.url;

    this.link = function(url, callback) {
      $http({method: 'GET',
        url: this.crawlerUrl,
        params: {
          url: url
        }
      })
      .success(function(data/*, status, headers, config*/) {
        callback(null, data || true);
      })
      .error(function(data, status/*, headers, config*/) {
        Log.warn('Failed to crawl url', {
          url: url,
          status: status,
          error : data
        });
        callback(data || true);
      });
    }.bind(this);
  }];

  this.$get = ['$injector', function($injector) {
    return $injector.instantiate(Crawler, {});
  }];
});