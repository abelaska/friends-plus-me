"use strict";

process.env.NODE_ENV = "test";

var expect = require("chai").expect,
	config = require(__dirname + "/../src/lib/config").config,
	User = require(__dirname + "/../src/models/User").Model,
	GooglePlus = require(__dirname + "/../src/lib/GooglePlus");

describe("GooglePlus", function () {
	require("chai").config.includeStack = true;

	it("should fetch G+ activities", function (done) {
		User.findOne({ email: "ab@gmail.com" });

		/*var g = new GooglePlus();
    g.add(new GoogleRequestPlus('103778702993142591484', 'XXX'));
    g.add(new GoogleRequestPlus('103778702993142591484', 'XXX'));
    g.add(new GoogleRequestPlus('103778702993142591484', 'invalid_token'));
    g.execute(function(err, requests) {
      console.log('requests',JSON.stringify(requests,null,2));*/
		done();
		//});
	});
});
