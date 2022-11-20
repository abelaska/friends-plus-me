'use strict';

process.env.NODE_ENV = 'test';

var async = require('async'),
    _ = require('lodash'),
    expect = require('chai').expect,
    crawl = require('../src/lib/crawl');

describe('crawl', function() {

  this.timeout(10*60000);

  require('chai').config.includeStack = true;

  var ddd,
      links = {},
      data = JSON.parse(require('fs').readFileSync(__dirname+'/data.json')).splice(0, 10);

  async.eachLimit(data, 4, function(link, cb) {

    if (links[link.url]) {
      return cb();
    }
    links[link.url] = true;

    describe('suite '+link.url, function() {

      this.timeout(1*60000);

      it('should crawl', function(done) {

        //console.log(link.url);

        crawl({
          url: link.url,
          skipImages: false
        }, function(err, reply) {

          //console.log(link.url,'err',err,reply);

          if (err && (
             (_.contains(['ETIMEDOUT'], err.code)) ||
             (err.error && _.contains(['EMPTY_RESPONSE'], err.error.code)) ||
             (err.error && _.contains([403,404,503], err.error.statusCode)))) {
            done();
            return cb();
          }

          expect(err).to.be.null;
          expect(reply.url).to.eq(link.url);

          if (link.title) expect(reply.title).to.eq(link.title);
          if (link.description) expect(reply.description).to.eq(link.description);

          if (link.photo) {
            var imgCrawled = _.findWhere(reply.images, {
              height: link.photo.height,
              width: link.photo.width,
              size: link.photo.size,
              contentType: link.photo.contentType
            });
            expect(imgCrawled).to.not.be.null;
          }

          done();
          cb();
        });
      });
    });
  });
});

