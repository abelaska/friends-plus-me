/* jshint node: true, esversion: 6, -W106 */
"use strict";

const config = require("@fpm/config");
const log = require("@fpm/logging").default;
const { GoogleRefreshToken } = require("@fpm/db");
const { GoogleTokens } = require("@fpm/token");
const urlParser = require("url");
const Rest = require("./Rest");
const request = require("request").defaults({ pool: { maxSockets: Infinity } });

const googleTokens = new GoogleTokens();

function plusListPeople(actorId, collection, accessToken, callback, qs) {
	request.get(
		{
			url:
				"https://www.googleapis.com/plusPages/v2/people/" +
				actorId +
				"/people/" +
				(collection || "pages"),
			qs: Object.assign({}, qs || {}, {
				access_token: accessToken,
			}),
			timeout: config.get("defaults:network:timeout"),
			json: true,
		},
		function (err, rsp, body) {
			//  {"kind": "plus#peopleFeed",
			// "etag": "\"4bbslODtfZFkEdLHSUmNzZyViqs/8d5KaoEyxw5C3lXjt4VFa19qr7k\"",
			// "title": "Google+ List of Pages",
			// "totalItems": 2,
			// "items": [{"kind": "plus#person",
			//   "etag": "\"4bbslODtfZFkEdLHSUmNzZyViqs/s8qd1s_j2KJjtadYPLkG8VppFj0\"",
			//   "objectType": "page",
			//   "id": "105750980959577516811",
			//   "displayName": "Friends+Me",
			//   "url": "https://plus.google.com/+FriendsplusMe",
			//   "image": {"url": "https://lh3.googleusercontent.com/-dHBGGCq7AD4/AAAAAAAAAAI/AAAAAAAAAV0/hF0NH1HCoSo/photo.jpg?sz=50"}},{
			//   "kind": "plus#person",
			//   "etag": "\"4bbslODtfZFkEdLHSUmNzZyViqs/x7UAmjsW-U9ZuLEDHw9U7I7INc0\"",
			//   "objectType": "page",
			//   "id": "113544734326063431494",
			//   "displayName": "Loy",
			//   "url": "https://plus.google.com/113544734326063431494",
			//   "image": {"url": "https://lh4.googleusercontent.com/-yE6stSSFBjo/AAAAAAAAAAI/AAAAAAAAAAA/RxksJvI-Hpk/photo.jpg?sz=50"}}]}

			if (err) {
				log.error("Failed to receive Google+ people list", {
					collection: collection,
					error: err,
				});
				callback(err);
			} else {
				if (rsp && rsp.statusCode === 200 && body) {
					callback(null, body);
				} else {
					log.warn("Failed to receive Google+ people list", {
						collection: collection,
						body: body,
						statusCode: rsp ? rsp.statusCode : null,
						error: err,
					});
					callback({});
				}
			}
		},
	);
}
exports.plusListPeople = plusListPeople;

function plusListCollections(actorId, accessToken, callback) {
	request.get(
		{
			url:
				"https://www.googleapis.com/plusPages/v2/people/" +
				(actorId || "me") +
				"/collections",
			qs: {
				access_token: accessToken,
			},
			timeout: config.get("defaults:network:timeout"),
			json: true,
		},
		function (err, rsp, body) {
			if (err) {
				log.error("Failed to receive Google+ collections", { error: err });
				return callback(err);
			}
			if (rsp && rsp.statusCode === 200 && body) {
				callback(null, body);
			} else {
				log.warn("Failed to receive Google+ collections", {
					body: body,
					statusCode: rsp ? rsp.statusCode : null,
					error: err,
				});

				callback({});
			}
		},
	);
}
exports.plusListCollections = plusListCollections;

function plusListMyPages(accessToken, callback, qs) {
	plusListPeople(
		"me",
		"pages",
		accessToken,
		function (err, data) {
			if (err) {
				return callback(err);
			}
			if (data) {
				var items = data.items;
				data.items = [];
				for (var i = 0; i < items.length; i++) {
					if (items[i].objectType === "page") {
						data.items.push(items[i]);
					}
				}
			}
			callback(null, data);
		},
		qs,
	);
}
exports.plusListMyPages = plusListMyPages;

function isNotGoogleAppsAccount(accessToken, callback) {
	plusListPeople(
		"me",
		"pages",
		accessToken,
		function (err, data) {
			if (err) {
				return callback(err);
			}
			var items = (data && data.items) || [];
			for (var i = 0; i < items.length; i++) {
				if (items[i].objectType === "person") {
					return callback(undefined, true);
				}
			}
			callback(undefined, false);
		},
		{
			fields: "items/objectType",
		},
	);
}
exports.isNotGoogleAppsAccount = isNotGoogleAppsAccount;

function revokeAccessToken(accessToken, callback, timeout) {
	var tm = new Date();

	request.get(
		{
			url: "https://accounts.google.com/o/oauth2/revoke",
			qs: {
				token: accessToken,
			},
			timeout: timeout || config.get("defaults:network:timeout"),
			json: true,
		},
		function (error, response, body) {
			tm = new Date() - tm;

			//log.info('Google refresh token response', {time:tm});

			if (response && response.statusCode === 200) {
				callback(null, body, tm);
			} else {
				if (!body) {
					body = {};
				} else if (body.error) {
					var message = body.error;
					body.message = message;
					delete body.error;
				}
				if (response) {
					body.code = response.statusCode;
				} else if (error && error.code) {
					// error.code==='ETIMEDOUT'
					body.code = error.code;
				}
				callback(body, null, tm);
			}
		},
	);
}
exports.revokeAccessToken = revokeAccessToken;

function googleHttpCallback(reqData, callback) {
	return function (error, response, body, tm) {
		if (response && response.statusCode === 200) {
			callback(null, body, tm);
		} else {
			/*jshint -W041*/
			if (body === undefined || body === null) {
				body = {};
			} else if (body.error) {
				var message = body.error;
				body.message = message;
				delete body.error;
			}
			if (response) {
				body.code = response.statusCode;
			} else if (error && error.code) {
				// error.code==='ETIMEDOUT'
				body.code = error.code;
			}
			callback(body, null, tm);
		}
	};
}

exports.json = function json(data, callback) {
	new Rest("google").json(data, googleHttpCallback(data, callback));
};

exports.multipart = function multipart(data, callback) {
	new Rest("google").multipart(data, googleHttpCallback(data, callback));
};

exports.post = function post(data, callback) {
	new Rest("google").form(data, googleHttpCallback(data, callback));
};

exports.get = function get(data, callback) {
	new Rest("google").get(data, googleHttpCallback(data, callback));
};

exports.delete = function _delete(data, callback) {
	new Rest("google").delete(data, googleHttpCallback(data, callback));
};

function getGoogleUserInfo(accessToken, callback) {
	request.get(
		{
			url: "https://www.googleapis.com/oauth2/v2/userinfo",
			qs: {
				key: config.get("google:clientSecret"),
			},
			headers: {
				Authorization: "Bearer " + accessToken,
			},
			timeout: config.get("defaults:network:timeout"),
			json: true,
		},
		function (err, rsp, body) {
			if (err) {
				log.error("Failed to receive Google user profile", { error: err });

				callback(err);
			} else {
				if (rsp && rsp.statusCode === 200 && body) {
					body.picture =
						body.picture ||
						"https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50";
					body.isGooglePlusPage =
						body.objectType === "page" ||
						/@pages\.plusgoogle\.com$/.test(body.email || "");

					callback(null, body);
				} else {
					log.warn("Failed to receive Google user profile", {
						body: body,
						statusCode: rsp ? rsp.statusCode : null,
						error: err,
					});

					callback({});
				}
			}
		},
	);
}
exports.getGoogleUserInfo = getGoogleUserInfo;

function plusPeople(actorId, accessToken, callback) {
	request.get(
		{
			url: "https://www.googleapis.com/plusPages/v2/people/" + actorId,
			qs: {
				access_token: accessToken,
			},
			timeout: config.get("defaults:network:timeout"),
			json: true,
		},
		function (err, rsp, body) {
			//{"kind": "plus#person",
			// "etag": "\"uYrzoZsxQM1LGjix0pfxxKDsvgg/VyF_z9gaZVUWAelqKLNgREmvbcA\"",
			// "urls": [
			//  {"value": "http://www.friendsplus.me","label": "www.friendsplus.me"},
			//  {"value": "http://www.facebook.com/FriendsPlusMe", "type": "other", "label": "Facebook Fan Page"},
			//  {"value": "https://twitter.com/FriendsPlusMe", "type": "other", "label": "Twitter @FriendsPlusMe"},
			//  {"value": "http://blog.friendsplus.me", "type": "other", "label": "Blog" }],
			// "objectType": "page",
			// "id": "105750980959577516811",
			// "displayName": "Friends+Me",
			// "tagline": "Automatic reposts of publicly published personal Google+ and Google+ Page activities to personal Facebook Wall, Facebook Page, Twitter and LinkedIn",
			// "aboutMe": "...",
			// "url": "https://plus.google.com/105750980959577516811",
			// "image": {"url": "https://lh3.googleusercontent.com/-dHBGGCq7AD4/AAAAAAAAAAI/AAAAAAAAAV0/hF0NH1HCoSo/photo.jpg?sz=50"},
			// "isPlusUser": true,
			// "plusOneCount": 5678,
			// "circledByCount": 1662,
			// "verified": true,
			// "cover": {"layout": "banner","coverPhoto": {
			//   "url": "https://lh5.googleusercontent.com/-XviJW_7A56Q/T9kKKA9_iCI/AAAAAAAAAGI/DZCUNY97J0c/s1000-fcrop64=1,000000008b1675d9/Green%2BGrass.jpg",
			//   "height": 626, "width": 940 },
			//  "coverInfo": {"topImageOffset": -447, "leftImageOffset": 0}}}

			if (err) {
				log.error("Failed to receive Google+ people profile", { error: err });

				callback(err);
			} else {
				if (rsp && rsp.statusCode === 200 && body) {
					if (!body.image) {
						body.image = {};
					}
					if (!body.image.url) {
						body.image.url =
							"https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50";
					}
					body.isGooglePlusPage =
						body.objectType === "page" ||
						/@pages\.plusgoogle\.com$/.test(body.email || "");

					isNotGoogleAppsAccount(accessToken, function (err, isNotAppsAccount) {
						body.publishViaApi = !!isNotAppsAccount;
						callback(null, body);
					});
				} else {
					log.warn("Failed to receive Google+ people profile", {
						body: body,
						statusCode: rsp ? rsp.statusCode : null,
						error: err,
					});

					callback({});
				}
			}
		},
	);
}
exports.plusPeople = plusPeople;

function plusPeopleByAccessToken(accessToken, callback) {
	plusPeople("me", accessToken, callback);
}
exports.plusPeopleByAccessToken = plusPeopleByAccessToken;

exports.isGoogl = function isGoogl(url) {
	return urlParser.parse(url, true).host.toLowerCase() === "goo.gl";
};

var refreshAndPersistAccessToken = (exports.refreshAndPersistAccessToken =
	function refreshAndPersistAccessToken(accountId, refreshToken, callback) {
		const uid = refreshToken;
		GoogleRefreshToken.findOne({ uid }, "val")
			.lean()
			.exec()
			.then((rt) => {
				const encryptedRefreshToken = rt && rt.val;
				if (!encryptedRefreshToken) {
					return callback();
				}
				googleTokens
					.createAccessToken({ uid, encryptedRefreshToken })
					.then(({ plainAccessToken }) => {
						callback(null, plainAccessToken);
					})
					.catch(callback);
			})
			.catch(callback);
	});

// callback(err, accessToken, tm)
var prepareAccessToken = (exports.prepareAccessToken =
	function prepareAccessToken(accountId, refreshToken, callback) {
		googleTokens
			.getPlainAccessTokenForAccount({ secret: refreshToken })
			.then((accessToken) => {
				if (accessToken) {
					return callback(null, accessToken);
				}
				refreshAndPersistAccessToken(accountId, refreshToken, callback);
			})
			.catch(callback);
	});

// fce(accessToken, callback)
function callWithToken(accountId, refreshToken, fce, callback) {
	var retryCountDown = 1,
		tm = new Date();

	var tryIt = function (err, accessToken) {
		if (err || !accessToken) {
			callback(err, null, new Date() - tm);
		} else {
			fce(accessToken, function (err, rspData) {
				if (err || !rspData) {
					if (err && err.code === 401 && retryCountDown-- > 0) {
						refreshAndPersistAccessToken(accountId, refreshToken, tryIt);
					} else {
						callback(err, null, new Date() - tm);
					}
				} else {
					callback(null, rspData, new Date() - tm);
				}
			});
		}
	};

	prepareAccessToken(accountId, refreshToken, tryIt);
}
exports.callWithToken = callWithToken;

function getGoogleToken(code, callback, redirectURI) {
	request.post(
		{
			url: "https://www.googleapis.com/oauth2/v4/token",
			json: true,
			timeout: config.get("defaults:network:timeout"),
			form: {
				code: code,
				grant_type: "authorization_code",
				redirect_uri: redirectURI || "postmessage",
				client_id: config.get("google:clientId"),
				client_secret: config.get("google:clientSecret"),
			},
		},
		function (error, rsp, body) {
			if (error || !rsp || rsp.statusCode !== 200 || !body) {
				log.error("Failed to convert Google signin code to access_token", {
					message: error && error.toString(),
					error,
				});
				return callback(error);
			}

			// first use of 200 { access_token: 'ya29.XXX',
			// token_type: 'Bearer',
			// expires_in: 3176,
			// id_token: 'XXX.XXX.XXX-XXX-XXX-XXX',
			// refresh_token: '1/XXX-XXX' }

			// next use of code 400 { error: 'invalid_grant' }
			// next call with new code 200 { access_token: 'ya29.XXX',
			// token_type: 'Bearer',
			// expires_in: 3581,
			// id_token: 'XXX.XXX.XXX-XXX-XXX-XXX' }

			const plainRefreshToken = body.refresh_token;
			const plainAccessToken = body.access_token;
			const expiresInSeconds = body.expires_in || 0;

			if (!plainAccessToken || !plainRefreshToken) {
				return callback(new Error("No access or refresh token received"));
			}

			plusPeopleByAccessToken(plainAccessToken, (error, guser) => {
				const uid = guser && guser.id;
				if (error || !uid) {
					return callback(error);
				}

				GoogleRefreshToken.store(uid, plainRefreshToken, (error) => {
					if (error) {
						return callback(error);
					}
					googleTokens
						.storeAccessToken({
							uid,
							plainAccessToken,
							plainRefreshToken,
							expiresInSeconds,
						})
						.then(() => {
							callback(null, plainAccessToken, plainRefreshToken);
						})
						.catch(callback);
				});
			});
		},
	);
}
exports.getGoogleToken = getGoogleToken;

var accessTokenInfo = (exports.accessTokenInfo = function accessTokenInfo(
	access_token,
	callback,
	timeout,
) {
	var tm = new Date();
	request.get(
		{
			url: "https://www.googleapis.com/oauth2/v2/tokeninfo",
			json: true,
			timeout: timeout || config.get("defaults:network:timeout"),
			qs: { access_token },
		},
		function (error, response, body) {
			tm = new Date() - tm;
			if (response && response.statusCode === 200) {
				callback(null, body, tm);
			} else {
				if (!body) {
					body = {};
				} else if (body.error) {
					var message = body.error;
					body.message = message;
					delete body.error;
				}
				if (response) {
					body.code = response.statusCode;
				} else if (error && error.code) {
					// error.code==='ETIMEDOUT'
					body.code = error.code;
				}
				callback(body, null, tm);
			}
		},
	);
});

// account: { token, secret }
// callback(err, newSecret)
exports.storeGoogleRefreshToken = function storeGoogleRefreshToken(
	account,
	callback,
) {
	if (!account.secret || !account.token) {
		if (callback) {
			callback(null, account.secret);
		}
		return;
	}
	accessTokenInfo(account.token, (error, tokenInfo) => {
		if (error) {
			log.error("Failed to fetch google access token info", {
				message: error.toString(),
				error,
			});
		}
		const uid = tokenInfo && tokenInfo.user_id;
		if (!uid) {
			if (callback) {
				callback(null, account.secret);
			}
			return;
		}
		GoogleRefreshToken.store(uid, account.secret, (error) => {
			if (error) {
				log.error("Failed to store google refresh token", {
					message: error.toString(),
					error,
				});
			}
			if (callback) {
				callback(null, account.secret);
			}
		});
	});
};
