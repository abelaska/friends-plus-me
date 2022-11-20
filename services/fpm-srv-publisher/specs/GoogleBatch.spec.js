"use strict";

process.env.NODE_ENV = "test";

var expect = require("chai").expect,
	config = require(__dirname + "/../src/lib/config").config,
	GoogleBatch = require(__dirname + "/../src/lib/GoogleBatch"),
	GoogleRequestPlus = require(__dirname + "/../src/lib/GoogleRequestPlus"),
	GoogleRequestPlusActivity = require(__dirname +
		"/../src/lib/GoogleRequestPlusActivity");

describe("GoogleBatch", function () {
	require("chai").config.includeStack = true;

	var clientId = config.get("google:clientId"),
		clientSecret = config.get("google:clientSecret"),
		refreshToken = "XXX",
		invalidAccessToken = "XXX";

	it("should fetch G+ activities in batch", function (done) {
		var g = new GoogleBatch();
		//g.add(new GoogleRequestPlus('103778702993142591484', 'XXX'));
		//g.add(new GoogleRequestPlus('103778702993142591484', 'XXX'));
		//g.add(new GoogleRequestPlus('103778702993142591484', 'invalid_token'));
		//g.add(new GoogleRequestPlusActivity('z12lhrfxomn5wpuku22nv5giqoq0fvhgn04','XXX'));
		//g.add(new GoogleRequestPlusActivity('xxx','XXX'));
		g.execute(function (err, requests) {
			//console.log('requests',JSON.stringify(requests,null,2));
			done();
		});
	});
});
