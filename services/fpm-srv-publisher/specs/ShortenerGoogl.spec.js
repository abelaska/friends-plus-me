"use strict";

process.env.NODE_ENV = "test";

var expect = require("chai").expect,
	config = require(__dirname + "/../src/lib/config").config,
	ShortenerGoogl = require(__dirname + "/../src/lib/ShortenerGoogl");

describe("ShortenerGoogl", function () {
	this.timeout(10000);

	require("chai").config.includeStack = true;

	it("should detect goo.gl url", function () {
		var s = new ShortenerGoogl();
		expect(s._isGooglUrl("http://goo.gl/aa")).to.be.true;
		expect(s._isGooglUrl("https://goo.gl/aa")).to.be.true;
		expect(s._isGooglUrl("http://google.com/aa")).to.be.false;
		expect(s._isGooglUrl("https://google.com/aa")).to.be.false;
	});

	it("should shorten url", function (done) {
		var s = new ShortenerGoogl();
		s.shortenUrl(
			"https://google.com",
			{
				id: "103778702993142591484",
				secret: "1/XXX-XXX",
				token: "XXX",
			},
			function (err, url, tm) {
				expect(err).to.be.null;
				expect(url).to.ok;
				done();
			},
		);
	});

	it("should shorten url with key", function (done) {
		var s = new ShortenerGoogl();
		s.shortenUrlWithKey("https://friendsplus.me", function (err, url, tm) {
			expect(err).to.be.null;
			expect(url).to.eq("https://goo.gl/PJQUJg");
			expect(url.replace(/https?:\/\/goo.gl/, "http://fpme.link")).to.eq(
				"http://fpme.link/PJQUJg",
			);
			expect(
				"https://goo.gl/PJQUJg".replace(
					/https?:\/\/goo.gl/,
					"http://fpme.link",
				),
			).to.eq("http://fpme.link/PJQUJg");
			done();
		});
	});
});
