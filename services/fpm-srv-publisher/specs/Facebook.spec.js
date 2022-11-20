"use strict";

process.env.NODE_ENV = "test";

var expect = require("chai").expect,
	facebook = require(__dirname + "/../src/lib/facebook");

describe("Facebook", function () {
	require("chai").config.includeStack = true;

	it("should get timeline photos album id", function (done) {
		// facebook.findTimelinePhotoAlbumId(1309367970, 'XXX', function(err, id, tm) {
		//   expect(id).to.equal('3893036526924');
		//   done();
		// });
		done();
	});

	it("should not get timeline photos album id", function (done) {
		/*facebook.findTimelinePhotoAlbumId(1309367970, 'XXX', function(err, id, tm) {
      expect(id).to.be.null;
      done();
    });*/ done();
	});

	it("should post", function (done) {
		/*require('request').post({
      url: 'https://graph.facebook.com/1309367970/feed',
      json: true,
      timeout: 15000,
      form: {"access_token":"XXX","created_time":"2013-06-24T20:48:51.882Z","privacy":"{\"value\": \"EVERYONE\"}","actions":"[{\"name\":\"Comment on Google+\",\"link\": \"http://fplus.me/p/264S\"}]","message":"Where?"}
    }, function(error, response, body) {
      console.log(error,response.statusCode,body);
      done();
    });*/
		/*require('request').post({
      // url: 'https://graph.facebook.com/3893036526924/photos', // Timeline Photos album
      //url: 'https://graph.facebook.com/1309367970/photos', // album aplikace
      json: true,
      timeout: 15000,
      form: {
        "access_token":"XXX",
        "privacy":"{\"value\": \"SELF\"}",
        url: 'http://static.friendsplus.me/test/5.png',
        name: 'Photo description - Timeline Photos'}
    }, function(error, response, body) {
      console.log(error,response.statusCode,body);
      done();
    });*/
		/*require('request').post({
      url: 'https://graph.facebook.com/552323448168233/feed', // group feed
      json: true,
      timeout: 15000,
      form: {
        "access_token":"XXX",
        "created_time":"2013-09-03T10:27:08.173Z",
        //"actions":"[{\"name\":\"Comment on Google+\",\"link\": \"http://fplus.me/p/34Q6\"}]",
        "link":"http://fplus.me/p/37Ea",
        "message":"test 5"}
    }, function(error, response, body) {
      console.log(error,response.statusCode,body);
      done();
    });*/
		done();
	});
});
