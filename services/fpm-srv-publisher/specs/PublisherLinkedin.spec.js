"use strict";

process.env.NODE_ENV = "test";

var _dir = __dirname + "/../src/",
	expect = require("chai").expect,
	ObjectId = require("mongoose").Types.ObjectId,
	Types = require(_dir + "lib/Types"),
	Post = require(_dir + "models/Post"),
	Profile = require(_dir + "models/Profile").Profile,
	Publisher = require(_dir + "lib/publishers/PublisherLinkedin");

describe("PublisherLinkedin", function () {
	this.timeout(60000);

	require("chai").config.includeStack = true;

	it("should publish photo post", function (done) {
		var profile = new Profile({
				_id: ObjectId(),
				accounts: [
					{
						_id: ObjectId(),
						uid: "5168428",
						network: Types.network.linkedin.code,
						account: Types.account.group.code,
						token: "XXX",
						secret: "XXX",
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
			shortenedSuffix = "-shortened",
			pub = new Publisher();

		// pub.publishPost({
		//   // title: '.',
		//   // summary: 'test 14',
		//   comment: 'test 11',
		//   content: {
		//     title: 'Photo',
		//     description: '',
		//     'submitted-url': 'https://s3.amazonaws.com/static.friendsplus.me/newsletter/images/fpm-extension-screenshot-newsletter-small-2.jpg',
		//     'submitted-image-url': 'https://s3.amazonaws.com/static.friendsplus.me/newsletter/images/fpm-extension-screenshot-newsletter-small-2.jpg'
		//   }
		//   // ,visibility: {
		//   //   code: 'connections-only'
		//   // }
		// }, post, profile, profile.accounts[0], function(err, result) {
		//   console.log('err',err,'result',result);

		//   // expect(err).not.to.be.defined;
		//   // expect(req).to.be.ok;
		//   // expect(req).to.deep.equal({
		//   //   "photoUrl": "https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s0/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png",
		//   //   "status": "0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789"
		//   // });

		done();
		// });
	});
});
