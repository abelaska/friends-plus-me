"use strict";

process.env.NODE_ENV = "test";

var fs = require("fs"),
	expect = require("chai").expect,
	Twitter = require(__dirname + "/../src/lib/Twitter");

describe("Twitter", function () {
	this.timeout(5000);

	require("chai").config.includeStack = true;

	it("should tweet", function (done) {
		/*(new Twitter()).tweet(
      'While waiting for God. Faith grows and Flesh dies. X!*\'();:@&=+$,/?%#[]{}<>X+~Joyce ',
      //'test '+(new Date()),
      'XXX',
      'XXX', function(err, data, tm) {
        console.log(JSON.stringify(err,null,2), JSON.stringify(data,null,2));
        expect(err).to.be.null;
        expect(data).not.to.be.null;
        expect(data.id).to.be.defined;
        expect(data.id).not.to.be.null;
        expect(data.id_str.length).to.be.above(0);
        expect(tm).to.be.defined;

        done();
      });*/
		done();
	});

	it("should fetch png image", function (done) {
		this.timeout(10000);

		var t = new Twitter();

		t._fetchImageFile(
			"https://s3.amazonaws.com/static.friendsplus.me/images/logo-80x80.png",
			function (
				err,
				content,
				contentType,
				downloadTime,
				convertTime,
				isAnimatedGif,
			) {
				expect(err).to.be.null;
				expect(contentType).to.eq("image/png");
				expect(content.length).to.be.above(0);
				expect(downloadTime).to.be.above(0);
				expect(convertTime).to.be.above(-1);
				expect(isAnimatedGif).to.be.false;

				//require('fs').writeFileSync('outimage.png',content);
				done();
			},
		);
	});

	it("should fetch animated gif", function (done) {
		this.timeout(30000);

		var t = new Twitter();

		t._fetchImageFile(
			"https://lh4.googleusercontent.com/-t9vOLM5Q09o/U1zF_VveReI/AAAAAAAAD7w/pXmXxRLWxAI/w506-h750/_DSC1924-MOTION.gif",
			function (
				err,
				content,
				contentType,
				downloadTime,
				convertTime,
				isAnimatedGif,
			) {
				expect(err).to.be.null;
				expect(contentType).to.eq("image/gif");
				expect(content.length).to.be.above(0);
				expect(downloadTime).to.be.above(0);
				expect(convertTime).to.be.above(0);
				expect(isAnimatedGif).to.be.true;

				//require('fs').writeFileSync('outimage.jpg',content);
				done();
			},
		);
	});

	it("should fetch jpeg image", function (done) {
		this.timeout(30000);

		var t = new Twitter();

		t._fetchImageFile(
			"https://lh3.googleusercontent.com/-vSm1oLDeQOo/UqoUA_vJxLI/AAAAAAAAwh0/zoee6_tT_RU/w4128-h2322/13%2B-%2B1",
			function (
				err,
				content,
				contentType,
				downloadTime,
				convertTime,
				isAnimatedGif,
			) {
				expect(err).to.be.null;
				expect(contentType).to.eq("image/jpeg");
				expect(content.length).to.be.above(0);
				expect(downloadTime).to.be.above(0);
				expect(convertTime).to.be.at.least(0);
				expect(isAnimatedGif).to.be.false;

				//require('fs').writeFileSync('outimage2.jpg',content);
				done();
			},
		);
	});

	//tctechcrunch2011.files.wordpress.com/2014/06/twitter-rise.gif?w=738

	http: it("should publish tweet with animated gif", function (done) {
		this.timeout(30000);

		var t = new Twitter();

		//    t.tweetPic('test -!*()\'~- '+new Date(),'https://s3.amazonaws.com/static.friendsplus.me/images/logo-80x80.png', '747422887-1yrqO6qrLJ83QLEyAlJpjFH36H3cbhzyQVM9UTUt', 'UGwTRC0SR8NwcKmaY4hwEO9xNSLhjqIUGpKxKKH5c', function(err, data, tm) {
		t.tweetPic(
			"animated gif test -!*()'~- " + new Date(),
			"http://tctechcrunch2011.files.wordpress.com/2014/06/twitter-rise.gif",
			"XXX-XXX",
			"XXX",
			function (err, data, tm) {
				expect(err).to.be.null;
				expect(data.id).to.be.above(0);
				expect(tm).to.be.above(0);

				done();
			},
		);
	});

	it("should publish tweet with image", function (done) {
		this.timeout(30000);

		var t = new Twitter();

		//    t.tweetPic('test -!*()\'~- '+new Date(),'https://s3.amazonaws.com/static.friendsplus.me/images/logo-80x80.png', '747422887-1yrqO6qrLJ83QLEyAlJpjFH36H3cbhzyQVM9UTUt', 'UGwTRC0SR8NwcKmaY4hwEO9xNSLhjqIUGpKxKKH5c', function(err, data, tm) {
		t.tweetPic(
			"test -!*()'~- " + new Date(),
			"http://www.blogcdn.com/www.autoblog.com/media/2012/02/2013-ferrari-f12-berlinetta-lead.jpg",
			"XXX-XXX",
			"XXX",
			function (err, data, tm) {
				expect(err).to.be.null;
				expect(data.id).to.be.above(0);
				expect(tm).to.be.above(0);

				done();
			},
		);
	});

	it("should upload image", function (done) {
		this.timeout(30000);

		var t = new Twitter();

		t.uploadMedia(
			"http://www.blogcdn.com/www.autoblog.com/media/2012/02/2013-ferrari-f12-berlinetta-lead.jpg",
			"XXX-XXX",
			"XXX",
			function (err, data, tm) {
				expect(err).to.be.null;

				expect(data.media_id).to.be.above(0);
				expect(data.size).to.be.above(0);
				expect(data.expires_after_secs).to.be.above(0);
				expect(data.image).to.be.ok;
				expect(data.image.image_type).to.eq("image/jpeg");
				expect(tm).to.be.above(0);

				done();
			},
		);
	});
});
