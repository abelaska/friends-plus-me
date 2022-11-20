"use strict";

process.env.NODE_ENV = "test";

var expect = require("chai").expect,
	config = require(__dirname + "/../src/lib/config").config,
	Rest = require(__dirname + "/../src/lib/Rest");

describe("Rest", function () {
	this.timeout(30000);

	require("chai").config.includeStack = true;

	it("should get new access token", function (done) {
		new Rest().form(
			{
				url: "https://accounts.google.com/o/oauth2/token",
				timeout: 1500,
				data: {
					client_id: "XXX",
					client_secret: "XXX",
					refresh_token: "XXX",
					grant_type: "refresh_token",
				},
			},
			function (err, rsp, data, tm) {
				//console.log('XXX',err,tm+'ms',rsp?rsp.statusCode:null,data);
				done();
			},
		);
	});

	it("should get batched", function (done) {
		var accessToken = "XXX";

		new Rest().multipart(
			{
				url: "https://www.googleapis.com/batch",
				timeout: 1500,
				data: [
					{
						"Content-Type": "application/http",
						"Content-ID": "0",
						body: [
							"GET /plus/v1/people/103778702993142591484/activities/public?alt=json&prettyPrint=false&maxResults=1&access_token=" +
								accessToken,
							"",
						].join("\r\n"),
					},
					{
						"Content-Type": "application/http",
						"Content-ID": "1",
						body: [
							"GET /plus/v1/people/103778702993142591484/activities/public?alt=json&prettyPrint=false&maxResults=1&access_token=" +
								accessToken,
							"",
						].join("\r\n"),
					},
				],
			},
			function (err, rsp, data, tm) {
				//console.log('XXX',err,tm+'ms',rsp?rsp.statusCode:null,data);
				done();
			},
		);
	});

	it("should download file from http", function (done) {
		new Rest().download(
			{
				timeout: 30000,
				url: "http://static.friendsplus.me/images/logo-114x1142.png",
				//url: 'https://s3.amazonaws.com/static.friendsplus.me/images/logo-80x80.png'
				//url: 'http://static.friendsplus.me/images/logo-150x150.png'
				//url: 'https://socialanxietyinstitute.org/sites/default/files/Testing.jpg'
				//url: 'https://lh5.googleusercontent.com/-uBqb4556w7I/UvoKolRsZqI/AAAAAAAAAgU/sE8yezhwls8/w600-h500/social-media-manager-1.jpg',
				//url: 'https://lh4.googleusercontent.com/proxy/j6Z3rBStFlJZd4HdKZIqTdV0gguzkYYC2wUBRRpnoO4GlVmQzvm4HHuMhid9TUtKWUHzY4i3PuU7Zp3EB4rDRDs4UNyYCZCeBklHGw6VdIaRku8BlFJ0jpyhDQ6170es5Us=w120-h120'
			},
			function (err, rsp, data, tm) {
				//console.log(err,rsp?rsp.statusCode:null,data?data.length:null);
				done();
			},
		);
	});
});
