"use strict";

process.env.NODE_ENV = "test";

var _dir = __dirname + "/../src/",
	expect = require("chai").expect,
	ObjectId = require("mongoose").Types.ObjectId,
	Types = require(_dir + "lib/Types"),
	Post = require(_dir + "models/Post"),
	Profile = require(_dir + "models/Profile").Profile,
	Publisher = require(_dir + "lib/publishers/PublisherFacebook");

describe("PublisherFacebook", function () {
	this.timeout(60000);

	require("chai").config.includeStack = true;

	it("should detect error", function () {
		var pub = new Publisher(),
			err = {
				error: {
					message: "(#220) Album or albums not visible",
					type: "OAuthException",
					code: 220,
				},
			};

		expect(pub._errorMessage(err)).to.eq("(#220) Album or albums not visible");
		expect(pub._isError(err, 220)).to.be.true;
		expect(pub._isError(err, 220, "(#220) Album or albums not visible")).to.be
			.true;
	});

	it("should publish photo post", function (done) {
		var profile = new Profile({
				_id: ObjectId(),
				accounts: [
					{
						_id: ObjectId(),
						uid: "1309367970",
						privacy: "SELF",
						network: Types.network.facebook.code,
						account: Types.account.profile.code,
						token: "XXX",
					},
				],
			}),
			post = new Post({
				_id: ObjectId(),
				uid: "twitter-id",
				accountCode: 10000,
				html: "<p>0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789</p>",
				processor: "repost:twitter:profile",
				attachments: {
					photo: {
						aniGif: false,
						contentType: "image/png",
						height: 666,
						width: 761,
						url: "https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s0/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png",
					},
				},
				repost: {
					is: false,
				},
			}),
			pub = new Publisher();

		done();
		// });
	});
});
