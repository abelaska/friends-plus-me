"use strict";

process.env.NODE_ENV = "test";

var expect = require("chai").expect,
	config = require(__dirname + "/../src/lib/config").config,
	google = require(__dirname + "/../src/lib/google");

describe("google", function () {
	require("chai").config.includeStack = true;

	var clientId = config.get("google:clientId"),
		clientSecret = config.get("google:clientSecret"),
		refreshToken = "XXX",
		invalidAccessToken = "XXX";

	/*  it('should get new access token', function(done) {
    google.newGoogleAccessToken(clientId, clientSecret, refreshToken, function(err, data) {
      expect(err).to.be.null;
      expect(data.access_token).to.be.defined;
      expect(data.token_type).to.eq('Bearer');
      done();
    });
  });

  it('should timeout get new access token', function(done) {
    google.newGoogleAccessToken(clientId, clientSecret, refreshToken, function(err, data) {
      expect(data).to.be.null;
      expect(err.code).to.be.defined;
      expect(err.code).to.eq('ETIMEDOUT');
      done();
    }, 10);
  });

  it('should get on public activity', function(){
    google.googlePlusActivityList('me', 'public', 'XXX', refreshToken, clientId, clientSecret,
      function(err, data, newAccessToken) {
        expect(err).to.be.null;
        expect(newAccessToken).not.to.be.null;
        expect(newAccessToken.access_token).to.be.defined;
        expect(newAccessToken.token_type).to.eq('Bearer');
        expect(data).not.to.be.null;
        expect(data.kind).to.eq('plus#activityFeed');
        done();
    }, 1, '', 1000);
  });

  it('should not get on public activity because of timeout', function(done) {
    google.googlePlusActivityList('me', 'public', invalidAccessToken, refreshToken, clientId, clientSecret,
      function(err, data, newAccessToken) {
        expect(data).to.be.null;
        expect(newAccessToken).to.be.null;
        expect(err.code).to.be.defined;
        expect(err.code).to.eq('ETIMEDOUT');
        done();
      }, 1, '', 10);
  });*/
});
