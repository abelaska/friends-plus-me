'use strict';

process.env.NODE_ENV = 'test';

var mongoose = require('mongoose'),
    moment = require('moment'),
    async = require('async'),
    _ = require('underscore'),
    expect = require('chai').expect,
    ShortenerGoogl = require('../src/lib/ShortenerGoogl'),
    config = require('../src/lib/config').config;

describe('ShortenerGoogl', function() {

  this.timeout(30000);

  require('chai').config.includeStack = true;

  var sh = new ShortenerGoogl();

  it('should work shorten already amzn.to shortened link', function(done) {
    sh.shortenUrlWithKey('http://amzn.to/1GQBQu5', function(err, shortenedUrl, tm) {
      expect(err).to.be.null;
      expect(shortenedUrl).to.eq('http://goo.gl/cUUTxS');
      expect(tm).to.be.above(0);
      done();
    })
  });

  it('should work shorten already bit.ly shortened link', function(done) {
    sh.shortenUrlWithKey('http://bit.ly/1GQzkUz', function(err, shortenedUrl, tm) {
      expect(err).to.be.null;
      expect(shortenedUrl).to.eq('http://goo.gl/LFNQla');
      expect(tm).to.be.above(0);
      done();
    })
  });
});