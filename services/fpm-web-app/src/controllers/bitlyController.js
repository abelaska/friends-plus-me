/* jshint node: true */
/* jshint -W064, -W106 */
"use strict";

const config = require("@fpm/config");
const log = require("@fpm/logging").default;
const { dbUpdatedCount, Profile } = require("@fpm/db");
const passport = require("passport");
const BitlyStrategy = require("passport-bitly").Strategy;
const tools = require("../lib/tools");

BitlyStrategy.prototype.userProfile = function (accessToken, done) {
	done(null, {
		provider: "bitly",
		_raw: {},
		_json: {},
		id: "1",
		fullName: "Bit.ly",
		displayName: "Bit.ly",
		profileUrl: "",
		profileImage: "",
	});
	// this._oauth2.get('https://api-ssl.bitly.com/v4/user', accessToken, function (err, body/*, res*/) {
	//   if (err) { return done(new Error('failed to fetch user profile: '+JSON.stringify(err)+" token: "+accessToken, err)); }
	//   try {
	//     var json = JSON.parse(body),
	//         data = json;

	//     var profile = { provider: 'bitly' };
	//     profile.id = (data && data.login) || '';
	//     profile.fullName = (data && data.name) || '';
	//     profile.displayName = (data && data.name) || '';
	//     profile.profileUrl = ''; // data && data.profile_url;
	//     profile.profileImage = ''; // data && data.profile_image;

	//     profile._raw = body;
	//     profile._json = json;

	//     done(null, profile);
	//   } catch(e) {
	//     done(e);
	//   }
	// });
};

function bitlyPassportAuth(failureRedirect) {
	return passport.authorize(
		"bitly-authz",
		{
			failureRedirect: failureRedirect,
		},
		function (/*req, res*/) {
			// this function will not be called.
		},
	);
}

module.exports = function (app) {
	var baseUrl = config.get("http:ui:redirect:url"),
		errorUrl = baseUrl + "/";

	passport.use(
		"bitly-authz",
		new BitlyStrategy(
			{
				clientID: config.get("bitly:clientID"),
				clientSecret: config.get("bitly:clientSecret"),
				callbackURL: config.get("http:api:url") + "/1/bitly/auth/return",
				passReqToCallback: true,
			},
			function (req, accessToken, refreshToken, profile, done) {
				//log.debug('Bitly callback', {accessToken:accessToken, profile:profile});

				return done(null, {
					profile: profile,
					token: accessToken,
				});
			},
		),
	);

	function createReturnUrl(req) {
		return req.query.r || errorUrl;
	}

	app.get(
		"/1/bitly/auth/profile/:profile",
		tools.tokenRequired,
		function (req, res, next) {
			var url = createReturnUrl(req);

			req.session["bitly:assign"] = {
				pid: req.params.profile,
				returnUrl: url,
			};

			bitlyPassportAuth(url)(req, res, next);
		},
	);

	app.get(
		"/1/bitly/auth/account/:account",
		tools.tokenRequired,
		function (req, res, next) {
			var url = createReturnUrl(req);

			req.session["bitly:assign"] = {
				accountId: req.params.account,
				returnUrl: url,
			};

			bitlyPassportAuth(url)(req, res, next);
		},
	);

	app.get(
		"/1/bitly/auth/return",
		tools.tokenRequired,
		function (req, res, next) {
			if (req.query.code) {
				next();
			} else {
				res.redirect(errorUrl);
			}
		},
		passport.authorize("bitly-authz", { failureRedirect: errorUrl }),
		function (req, res) {
			var all,
				user = req.user,
				assign = req.session["bitly:assign"],
				url = assign && assign.returnUrl ? assign.returnUrl : errorUrl,
				profile = req.account;

			delete req.session["bitly:assign"];

			/* {"profile": {"status_code": 200, "data": {"apiKey": "XXX.............", "domain_options": ["bit.ly", "bitly.com", "j.mp"], "member_since": 1356027006, "enterprise_permissions": [], "profile_image": "http://bitly.com/u/abelaska.png", "share_accounts": [], "full_name": null, "is_enterprise": false, "tracking_domains": [], "default_link_privacy": "public", "display_name": null, "custom_short_domain": null, "login": "abelaska", "is_verified": false, "profile_url": "http://bitly.com/u/abelaska"}, "status_txt": "OK"},
        "token": "XXX"
      }*/

			function callback(err, updated) {
				if (err) {
					req.notify(
						"error",
						"Failed to enable Bit.ly link shortener for queue. Please try again.",
					);
					log.error("Failed to enable Bit.ly shortener for queue", {
						userId: user._id.toString(),
						accountId: assign.accountId ? assign.accountId : null,
						profileId: assign.pid ? assign.pid : null,
						error: err,
					});
				} else if (dbUpdatedCount(updated)) {
					if (all) {
						req.notify(
							"success",
							"Link shortener successfully switched to Bit.ly for all queues.",
						);
					} else {
						req.notify(
							"success",
							"Queue link shortener successfully switched to Bit.ly.",
						);
					}
				} else {
					if (all) {
						req.notify("warning", "No queues found.");
						log.warn("No Bit.ly queues not found for user " + user.email, {
							userId: user._id.toString(),
						});
					} else {
						req.notify("warning", "Queue not found.");
						log.warn(
							'Bit.ly queue "' +
								assign.accountId +
								'" not found for user ' +
								user.email,
							{
								userId: user._id.toString(),
							},
						);
					}
				}
				res.redirect(url);
			}

			if (assign && (assign.pid || assign.accountId)) {
				var set,
					s = {
						type: "bitly",
						bitly: {
							id: profile.profile && profile.profile.id,
							name:
								(profile.profile &&
									(profile.profile.displayName || profile.profile.fullName)) ||
								null,
							token: profile.token,
						},
					};
				all = assign.pid ? true : false;
				var query = all
					? { _id: assign.pid }
					: { "accounts._id": assign.accountId };

				Profile.findOne(
					query,
					"_id use members accounts._id",
					function (err, profile) {
						if (profile) {
							if (user.canManageProfile(profile)) {
								if (all) {
									if (profile.accounts.length > 0) {
										set = {};
										for (var i = 0; i < profile.accounts.length; i++) {
											set["accounts." + i + ".shortener"] = s;
										}
									}
								} else {
									set = { "accounts.$.shortener": s };
								}
								if (set) {
									Profile.update(query, { $set: set }, callback);
								} else {
									callback(null, 0);
								}
							} else {
								req.notify(
									"warning",
									"You are not allowed to manage this profile.",
								);
								log.warn(
									"User " +
										user.email +
										" cannot manage profile " +
										profile._id.toString() +
										" Bit.ly configuration",
								);
								res.redirect(url);
							}
						} else {
							req.notify("warning", "Profile not found in database.");
							log.warn("Profile for Bit.ly configuration update not found", {
								query: JSON.stringify(query),
							});
							res.redirect(url);
						}
					},
				);
			} else {
				req.notify("warning", "Required paramers not assigned!");
				res.redirect(url);
			}
		},
	);
};
