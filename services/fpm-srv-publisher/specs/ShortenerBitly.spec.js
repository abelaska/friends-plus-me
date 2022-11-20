"use strict";

process.env.NODE_ENV = "test";

var expect = require("chai").expect,
	ShortenerBitly = require(__dirname + "/../src/lib/ShortenerBitly");

describe("ShortenerBitly", function () {
	require("chai").config.includeStack = true;

	var shortener = new ShortenerBitly();
	/*
  it('should shorten url with apiKey', function(done) {

    shortener.shortenUrl('http://www.google.com', {username:'abelaska', apiKey:'XXX'},
      function(shortenUrl, stat) {
        expect(shortenUrl).to.eq('http://bit.ly/WP8aqQ');
        expect(stat).to.not.be.null;
        expect(stat.name).to.eq('URLShortener');
        expect(stat.type).to.eq('bit.ly');
        expect(stat.time).to.be.defined;
        expect(stat.usedToken).to.eq(false);
        expect(stat.tm).to.be.defined;
        expect(stat.queuedFor).to.be.defined;

        done();
      });
  });

  it('should shorten url with token', function(done) {

    shortener.shortenUrl('http://www.google.com', {token:'XXX'},
      function(shortenUrl, stat) {
        expect(shortenUrl).to.eq('http://bit.ly/WP8aqQ');
        expect(stat).to.not.be.null;
        expect(stat.name).to.eq('URLShortener');
        expect(stat.type).to.eq('bit.ly');
        expect(stat.usedToken).to.eq(true);
        expect(stat.time).to.be.defined;
        expect(stat.tm).to.be.defined;
        expect(stat.queuedFor).to.be.defined;

        done();
      });
  });*/
});
