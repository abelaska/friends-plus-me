/* jshint node: true */
/* jshint -W064, -W106 */
"use strict";

const config = require("@fpm/config");
const log = require("@fpm/logging").default;
const { States } = require("@fpm/constants");
const {
	dbUpdatedCount,
	ObjectId,
	Profile,
	Audit,
	User,
	PricingPlan,
} = require("@fpm/db");
const { teamMemberAccepted } = require("@fpm/events");
const fs = require("fs");
const moment = require("moment");
const async = require("async");
const crypto = require("crypto");
const { template } = require("lodash");
const qs = require("querystring");
const _ = require("underscore");
const urlParser = require("url");
const tools = require("../lib/tools");
const AvatarImage = require("../lib/AvatarImage");
const request = require("request");
const AppHtml = require("../lib/AppHtml");

module.exports = ({
	router,
	customerLifecycle,
	premiumManager,
	hydra,
	ssoSessionManager,
}) => {
	var appHtml = new AppHtml(),
		shareHtml = new AppHtml("share.html", "share.html"),
		isProd = "production" === config.get("env"),
		isDev = !isProd,
		avatarImage = new AvatarImage();

	const verificationTemplate = template(
		fs.readFileSync(`${__dirname}/../../templates/verification.html`),
	);
	const verificationEmailSentTemplate = template(
		fs.readFileSync(`${__dirname}/../../templates/verificationEmailSent.html`),
	);

	function initialConfig(req, user) {
		const url = `${req.protocol}://${req.get("host")}`;
		return {
			version: config.get("version"),
			api: {
				url: `${url}/1`,
				public: {
					url: config.get("http:api:public:url"),
				},
			},
			intercom: {
				// disabled: !!req.session.isAuthSwitch,
				disabled: true,
				appId: config.get("intercom:appId"),
				userHash:
					user &&
					crypto
						.createHmac("sha256", config.get("intercom:secret"))
						.update(user._id.toString())
						.digest("hex"),
			},
			web: {
				url,
				root: url,
				app: url,
				signin: `${url}/signin`,
				signout: `${url}/signout`,
			},
		};
	}

	function fixPicture(url) {
		if (!url) {
			return url;
		}
		if (url.indexOf("gravatar.com") > -1) {
			var p = urlParser.parse(url);
			p.query = { s: 50 };
			p.search = "";
			p.hash = "";
			url = urlParser.format(p);
		}
		return url;
	}

	function getGoogleIdentityId(body) {
		var googleIdentities =
			body &&
			body.identities &&
			body.identities.length &&
			body.identities.filter(function (i) {
				return i.provider === "google-oauth2";
			});
		var googleIdentity =
			googleIdentities && googleIdentities.length && googleIdentities[0];
		var actorId = googleIdentity && googleIdentity.user_id;
		return actorId;
	}

	function signoutUser(req, res, next) {
		if (!req.session) {
			return next();
		}
		req.session.regenerate(next);
	}

	function signoutSession(req, res, redirectUrl) {
		if (req.session && Object.keys(req.session).length) {
			_.chain(req.session)
				.keys()
				.without("cookie")
				.each(function (key) {
					delete req.session[key];
				});
		}

		var next = function () /*err*/ {
			res.header("Set-Cookie", config.get("session:key") + "=;");

			if (redirectUrl) {
				res.redirect(redirectUrl);
			}
		};

		if (req.session) {
			req.session.destroy(next);
		} else {
			next();
		}
	}

	function catchAffiliateRefferer(req, res, done) {
		var affilCampaignId = req.query.campaignid,
			affilShortCode = req.query.mbsy,
			isAffiliate = affilCampaignId && affilShortCode ? true : false;

		if (isAffiliate) {
			res.cookie(
				"arefferer",
				{
					campaignId: affilCampaignId,
					mbsy: affilShortCode,
				},
				{ signed: true, maxAge: 180 * 24 * 60 * 60 * 1000 },
			);

			signoutSession(req);
		}

		done();
	}

	function listAvailablePlans(user, callback) {
		PricingPlan.findAllAvailable(user, function (err, plans) {
			if (err || !plans || !plans.length) {
				callback(err || { error: { message: "No plan found" } });
			} else {
				var plansObj = {};

				for (var i = 0; i < plans.length; i++) {
					delete plans[i].members;

					plansObj[plans[i].id] = plans[i];
				}

				callback(null, plansObj, plans);
			}
		});
	}

	router.get("/switch", function (req, res) {
		var url = "/administration/user/switch";
		if (req.query.id) {
			url += "/id/" + req.query.id;
		} else if (req.query.email) {
			url += "/email/" + req.query.email;
		} else if (req.query.actorid) {
			url += "/actorid/" + req.query.actorid;
		}
		url = `/?${qs.stringify({ url })}`;
		signoutSession(req, res, url);
	});

	const fpmLoginRedirectUrl = ({ prompt = "none" } = {}) => {
		const query = qs.stringify({
			prompt,
			response_type: "code",
			state: new Date().valueOf(),
			client_id: config.get("fpm:app:clientId"),
			redirect_uri: `${config.get("http:ui:url")}/signin`,
			scope: (config.get("fpm:app:scopes") || []).join(" "),
		});
		return `https://api.friendsplus.me/oauth.authorize?${query}`;
	};

	const authorizationCodeToAccessToken = async (code) =>
		hydra.authorizationCodeToAccessToken({
			code,
			redirect_uri: `${config.get("http:ui:url")}/signin`,
			grant_type: "authorization_code",
			client_id: config.get("fpm:app:clientId"),
			client_secret: config.get("fpm:app:clientSecret"),
		});

	function redirectLoginUrl(isSignUp) {
		// // https://accounts.google.com/o/oauth2/auth?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fplus.login%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile&state=generate_a_unique_state_value&redirect_uri=http://localhost:3000/auth/google/return&response_type=code&client_id=XXX-XXX.apps.googleusercontent.com&access_type=offline&approval_prompt=force
		// // https://developers.google.com/accounts/docs/OAuth2Login#response-type
		// // var q = {
		// //       scope: 'profile email',
		// //       client_id: config.get('google:clientId'),
		// //       redirect_uri: config.get('http:landingpage:signin'),
		// //       state: crypto.randomBytes(32).toString('hex'),
		// //       response_type: 'code',
		// //       prompt: 'select_account'
		// //     };
		// // return 'https://accounts.google.com/o/oauth2/auth?' + qs.stringify(q);
		// const q = {
		//   client: config.get('auth0:clientId'),
		//   redirectUrl: `${config.get('http:ui:url')}/signin`
		// };
		// if (isSignUp) {
		//   q.auth = 'signup';
		// }
		// return `https://${config.get('auth0:domain')}/login?${qs.stringify(q)}`;
		return fpmLoginRedirectUrl();
	}

	function redirectLogin(req, res) {
		res.redirect(redirectLoginUrl(req.path === "/signup"));
	}

	function doRespond(req, res, response) {
		// 1/ ziskat index.html pro produkci z disku pro dev z proxy a ten cachovat
		// 2/ s kazdym requestem slozit odpoved tim, ze se pred </head> doplni skript s user profilem

		var csrfToken = (response["XSRF-TOKEN"] = req.csrfToken());
		if (req.session) {
			req.session.csrfToken = csrfToken;
		}

		appHtml.render(response, function (err, content) {
			if (err || !content) {
				log.error("Failed to fetch application index html file", {
					error: err,
				});
				res.redirect(config.get("http:landingpage:url"));
			} else {
				res.send(content);
			}
		});
	}

	function protectProfileAccounts(profile, user) {
		if (profile) {
			//profile.analytics = {};
			profile.__v = undefined;
			profile.notifications = [];

			if (profile.profiles && profile.profiles.length > 0) {
				profile.profiles.forEach(function (p) {
					p.oauth = undefined;
				});
			}

			if (profile.accounts && profile.accounts.length > 0) {
				// odfiltrovat ucty, na ktere account manager nema pristup
				if (!user.canManageProfile(profile)) {
					profile.accounts = _.map(profile.accounts, (a) => {
						if (user.canManageAccount(a)) {
							return a;
						}
						return {
							_id: a._id,
							name: a.name,
							image: a.image,
							state: a.state,
							network: a.network,
							account: a.account,
							members: a.members,
							url: a.url,
							dir: a.dir,
							started: a.started,
						};
					});
				}
				profile.accounts.forEach(function (account) {
					account.token = undefined;
					account.secret = undefined;
					account.tagline = undefined;
				});
			}
		}
	}

	function transferNetworkType(network, type, response, req) {
		if (req.session[network + ":" + type]) {
			response[network][type] = req.session[network + ":" + type];
			delete req.session[network + ":" + type];
		}
	}

	function transferNetwork(network, types, response, req) {
		var i,
			found = false;

		for (i = 0; i < types.length; i++) {
			if (req.session[network + ":" + types[i]]) {
				found = true;
				break;
			}
		}

		if (found) {
			var user = req.session[network + ":user"];
			response[network] = user
				? { parentUid: user.parentUid, name: user.name }
				: {};
			for (i = 0; i < types.length; i++) {
				transferNetworkType(network, types[i], response, req);
			}
		}
	}

	function fetchProfiles(req, res, user, callback) {
		User.fetchProfilesWithName(user, function (err, profiles) {
			if (profiles && profiles.length > 0) {
				var profileList = [];

				async.each(
					profiles,
					function (profile, cb) {
						protectProfileAccounts(profile, user);

						profile = profile.toObject();

						profileList.push(profile);

						listAvailablePlans(user, function (err, plans /*, plansArray*/) {
							if (plans) {
								profile.plans = plans;
							}
							cb(err);
						});
					},
					function (err) {
						if (err) {
							callback(err);
						} else {
							callback(null, profileList);
						}
					},
				);
			} else if (err) {
				log.error("Failed to load signing in user profile from database", {
					userId: user._id.toString(),
					error: err,
				});
				redirectLogin(req, res);
			} else {
				log.warn("No profile found for user", {
					userId: user._id.toString(),
				});

				// signout
				signoutSession(req, res, redirectLoginUrl());
			}
		});
	}

	function renderShare(req, res, response) {
		response = response || {};

		var csrfToken = (response["XSRF-TOKEN"] = req.csrfToken());
		if (req.session) {
			req.session.csrfToken = csrfToken;
		}

		if (response.query && _.size(response.query)) {
			for (var key in response.query) {
				response.query[key] = encodeURIComponent(response.query[key]);
			}
		}

		shareHtml.render(response, function (err, content) {
			if (err || !content) {
				log.error("Failed to fetch share html file", {
					error: err,
				});
				res.redirect(config.get("http:landingpage:url"));
			} else {
				res.send(content);
			}
		});
	}

	function fetchProfilesForShare(req, res, user, callback) {
		User.fetchProfilesWithName(user, function (err, profiles) {
			if (profiles && profiles.length > 0) {
				var profileList = [];

				async.each(
					profiles,
					function (profile, cb) {
						protectProfileAccounts(profile, user);

						profile = profile.toObject();

						profileList.push(profile);

						cb();
					},
					function (err) {
						if (err) {
							callback(err);
						} else {
							callback(null, profileList);
						}
					},
				);
			} else if (err) {
				log.error("Failed to load signing in user profile from database", {
					userId: user._id.toString(),
					error: err,
				});
				renderShare(req, res);
			} else {
				log.warn("No profile found for user", {
					userId: user._id.toString(),
				});
				renderShare(req, res);
			}
		});
	}

	function fetchDataAndRenderShare(req, res) {
		var userId = req.token && req.token.data ? req.token.data.uid : null;
		var response = {
			config: initialConfig(req, userId && { _id: userId }),
			query: req.session.shareQuery || req.query,
		};
		delete req.session.shareQuery;
		if (userId) {
			if (response.query.popup && response.query.loginonly) {
				return res.send(
					`<html><body><script>window.opener.postMessage(${JSON.stringify({
						type: "signed-in",
					})},"*");</script></body></html>`,
				);
			}
			if (response.query.tab && response.query.loginonly) {
				return res.send(
					`<html><body><script>setInterval(function(){window.parent.postMessage(${JSON.stringify(
						{ type: "signed-in-tab" },
					)},'*');},250);</script></body></html>`,
				);
			}

			User.findByIdAndUpdate(
				userId,
				{
					$set: { shareLast: moment.utc().toDate() },
					$inc: { shareCount: 1 },
				},
				{
					new: true,
				},
				function (err, user) {
					if (err) {
						log.error("Failed to load signing in user profile from database", {
							userId: userId,
							error: err,
						});
						renderShare(req, res, response);
					} else if (user && user.isEnabled) {
						fetchProfilesForShare(req, res, user, function (err, profiles) {
							response.user = user;
							response.profiles = profiles;

							renderShare(req, res, response);
						});
					} else {
						if (user) {
							log.warn("User is not enabled", {
								state: States.user.codeToName(user.state),
								userId: userId,
							});
						} else {
							log.warn("User not found", {
								userId: userId,
							});
						}
						renderShare(req, res, response);
					}
				},
			);
		} else {
			if (req.query.iframe) {
				const data = JSON.stringify({ type: "not-signed-in" });
				const html = `<html><body><script>window.parent.postMessage(${data},"*");</script></body></html>`;
				return res.send(html);
			} else {
				req.session.goto = "/share";
				req.session.shareQuery = req.query;
				redirectLogin(req, res);
				// renderShare(req, res, response);
			}
		}
	}

	function processShare(req, res) {
		if (_.size(req.query)) {
			res.redirect("/share?" + qs.stringify(req.query));
		} else {
			fetchDataAndRenderShare(req, res);
		}
	}

	// callback(error, isValid)
	function checkVerifiedEmail(user, callback) {
		callback(null, !user.email ? true : user.emailVerified);
	}

	function getApp(req, res) {
		const userId = req.token && req.token.data ? req.token.data.uid : null;
		if (!userId) {
			if (req.query.url) {
				res.cookie("gt", req.query.url, {
					httpOnly: true,
					secure: true,
					signed: true,
				});
			}
			return redirectLogin(req, res);
		}

		req.session.goto = req.signedCookies.gt || req.query.url;

		if (req.signedCookies.gt) {
			res.clearCookie("gt");
		}

		User.findByIdAndUpdate(
			userId,
			{ $set: { loginLast: new Date() }, $inc: { loginCount: 1 } },
			{ new: true },
			(err, user) => {
				if (err) {
					log.error("Failed to load signing in user profile from database", {
						userId,
						error: err,
					});
					return redirectLogin(req, res);
				}

				if (user && user.isEnabled) {
					checkVerifiedEmail(user, (_, isEmailVerified) => {
						if (!isEmailVerified) {
							return res.redirect("/verify");
						}

						fetchProfiles(req, res, user, function (err, profiles) {
							// Metric('user-events', { ev: 'signin', uid: user._id.toString() });

							user.__v = undefined;

							var token = (req.session.fpmetoken = req.encryptToken(
									{
										uid: user._id.toString(),
									},
									config.get("token:expiresInSeconds") * 1000,
								)),
								goto = req.session.goto || undefined,
								googlePages = req.session["google:pages"],
								googleCollections = req.session["google:collections"],
								response = {
									config: initialConfig(req, user),
									user: user,
									profiles: profiles,
									newAccount: false,
									goto: goto,
									token: isDev ? token : undefined,
									sso: {
										sessionId: req.session.ssoSessionId,
									},
									notify: req.notify() || [],
									funds: config.get("premium:funds"),
									country:
										req.headers["x-appengine-country"] &&
										req.headers["x-appengine-country"].toUpperCase(),
								};

							if (googlePages) {
								response.google = {
									parentId: req.session["google:user"]
										? req.session["google:user"].parentId
										: null,
									pages: googlePages,
								};
								delete req.session["google:pages"];
							} else if (googleCollections) {
								response.google = {
									parentId: req.session["google:user"]
										? req.session["google:user"].parentId
										: null,
									collections: googleCollections,
								};
								delete req.session["google:collections"];
							}

							transferNetwork("tumblr", ["blogs"], response, req);
							transferNetwork("linkedin", ["groups", "pages"], response, req);
							transferNetwork("facebook", ["groups", "pages"], response, req);
							transferNetwork("pinterest", ["boards"], response, req);

							delete req.session.goto;

							doRespond(req, res, response);
						});
					});
				} else {
					if (user) {
						log.warn("User is not enabled", {
							state: States.user.codeToName(user.state),
							userId,
						});
					} else {
						log.warn("User not found", { userId });
					}
					redirectLogin(req, res);
				}
			},
		);
	}

	function updateUserProfile(user, body, callback) {
		var set = {};
		var meta = body.user_metadata || {};
		var locale = meta.locale || (body.locale && body.locale.split("-")[0]);
		var emailVerified = !!body.email_verified;

		if (locale && !user.locale) {
			set.locale = locale;
			user.locale = locale;
		}
		if (meta.tz && !user.tz) {
			set.tz = meta.tz;
			user.tz = meta.tz;
		}
		if (meta.country && !user.country) {
			set.country = meta.country.toUpperCase();
			user.country = meta.country.toUpperCase();
		}
		if (!user.auth0Id && body.user_id) {
			set.auth0Id = body.user_id;
			user.auth0Id = body.user_id;
		}
		if (emailVerified !== user.emailVerified) {
			set.emailVerified = body.emailVerified;
			user.emailVerified = body.emailVerified;
		}
		if (body.name && body.name !== user.name) {
			set.name = body.name;
			user.name = body.name;
		}
		if (body.given_name && body.given_name !== user.fname) {
			set.fname = body.given_name;
			user.fname = body.given_name;
		}
		if (body.family_name && body.family_name !== user.lname) {
			set.lname = body.family_name;
			user.lname = body.family_name;
		}
		avatarImage.storeForce(fixPicture(body.picture), user, null, (picture) => {
			if (picture && picture !== user.image) {
				set.image = picture;
				user.image = picture;
			}
			if (_.size(set)) {
				User.update({ _id: user._id }, { $set: set }, callback);
			} else {
				callback();
			}
		});
	}

	function signin(req, res) {
		if (req.query.error === "unauthorized") {
			return signoutSession(req, res, config.get("http:landingpage:signin"));
		}

		/*req.query:{ state: 'generate_a_unique_state_value',
        code: '4/XXX.Ipz-XXX',
        authuser: '0',
        prompt: 'consent',
        session_state: 'XXX..b381' }
      req.query:{ error: 'access_denied',
        state: 'generate_a_unique_state_value' }*/

		var invitation = req.session && req.session.teaminvitation;

		if (
			invitation &&
			(!invitation.id || !invitation.role || !invitation.profileId)
		) {
			invitation = null;
		}

		function prepareNewProfile(override, user, callback) {
			var planName = config.get("users:defaultPlan");

			PricingPlan.findOne({ id: planName }, function (err, plan) {
				if (err || !plan) {
					callback(
						err || { error: { message: "Plan " + planName + " not found" } },
					);
				} else {
					var use = _.defaults(plan.use || {}, config.get("users:use")),
						profile = new Profile(
							_.extend(
								{
									use: use,
									plan: {
										name: planName,
									},
								},
								override || {},
							),
						);

					if (planName === "TRIAL") {
						const instaExpiresInDays = config.get(
							"premium:trial:instagram:expireInDays",
						);
						if (instaExpiresInDays > 0) {
							profile.use.instagram = moment
								.utc()
								.add(instaExpiresInDays, "days")
								.toDate();
						}
						profile.plan.validUntil = moment
							.utc()
							.add("days", config.get("premium:trial:signup:expireInDays"))
							.toDate();
					}

					var gaeCountryCode =
						req.headers["x-appengine-country"] || user.country;
					if (gaeCountryCode) {
						profile.subject = {
							country: gaeCountryCode.toUpperCase(),
						};
					}

					callback(null, profile);
				}
			});
		}

		function redirectToApp(user, isSignup) {
			req.session.fpmetoken = req.encryptToken(
				{
					uid: user._id.toString(),
				},
				config.get("token:expiresInSeconds") * 1000,
			);

			var pid = (invitation && invitation.profileId) || user.profiles.owner[0];

			var goto =
				req.session.goto ||
				(isSignup && !invitation
					? "/teams/" + pid + "/queues/add"
					: "/teams/" + pid + "/queue");

			if (
				!goto.indexOf("http://") &&
				!goto.indexOf("https://") &&
				goto[0] !== "/"
			) {
				goto = "/" + goto;
			}

			delete req.session.goto;

			res.redirect(goto);
		}

		function updateProfileByInvitation(user, invitation, callback) {
			var set = {
				$addToSet: {},
				$unset: {},
			};
			set.$addToSet["members." + invitation.role] = user._id;
			set.$unset["invitations." + invitation.id] = "";
			Profile.update(
				{ _id: invitation.profileId },
				set,
				function (err, updated) {
					if (err) {
						log.error("Failed to assign invited user to profile", {
							userId: user._id.toString(),
							profileId: invitation.profileId,
							role: invitation.role,
							error: err,
						});
					}
					callback(err, updated);
				},
			);
		}

		function updateUserByInvitation(user, invitation, callback) {
			var set = {
				$addToSet: {},
			};
			set.$addToSet["profiles." + invitation.role] = new ObjectId(
				invitation.profileId,
			);
			User.update({ _id: user._id }, set, function (err, updated) {
				if (err) {
					log.error("Failed to assign profile to user", {
						userId: user._id.toString(),
						profileId: invitation.profileId,
						role: invitation.role,
						error: err,
					});
				}
				callback(err, updated);
			});
		}

		function createMissingOwnProfileAndGoToApp(user, isSignup) {
			if (user.ownsAnyProfile) {
				redirectToApp(user, isSignup);
			} else {
				// pokud uzivatel neni vlastnikem vlastniho profilu, tak mu jej rovnou vytvor

				prepareNewProfile(
					{
						name: "Personal Team",
						contact: {
							name: user.name,
							email: user.email,
						},
						members: {
							owner: [user._id],
						},
						hashtags: {
							ns: { noshare: true, dst: [] },
							noshare: { noshare: true, dst: [] },
							plusonly: { noshare: true, dst: [] },
						},
						affiliate: user.affiliate ? user.affiliate.toObject() : undefined,
					},
					user,
					function (err, profile) {
						if (err || !profile) {
							log.error("Failed to prepare profile for user without any", {
								userId: user._id.toString(),
								error: err,
							});
							res.redirect(config.get("http:landingpage:force"));
						} else {
							profile.save(function (err, profile) {
								if (err) {
									log.error("Failed to create profile for user without any", {
										userId: user._id.toString(),
										error: err,
									});
									res.redirect(config.get("http:landingpage:force"));
								} else {
									User.update(
										{ _id: user._id },
										{ $addToSet: { "profiles.owner": profile._id } },
										function (err, updated) {
											if (err) {
												log.error(
													"Failed to assign new profile to user without any",
													{
														userId: user._id.toString(),
														profileId: profile._id.toString(),
														updated: updated && updated.result,
														error: err,
													},
												);
												res.redirect(config.get("http:landingpage:force"));
											} else {
												user.profiles = { owner: [profile._id] };
												if (profile.plan.name === "PAYWYU") {
													premiumManager.newTrial(profile._id, function (err) {
														if (err) {
															log.error(
																"Failed to create trial credit for new profile",
																{
																	profileId: profile._id.toString(),
																	error: err,
																},
															);
														}
														redirectToApp(user, isSignup);
													});
												} else {
													redirectToApp(user, isSignup);
												}
											}
										},
									);
								}
							});
						}
					},
				);
			}
		}

		function finish(user, isSignup) {
			if (invitation) {
				delete req.session.teaminvitation;

				Profile.findById(invitation.profileId, (error, invitationProfile) => {
					if (error) {
						log.error("Failed to find invitation team", {
							profileId: invitation.profileId,
							error,
						});
					}
					if (!invitationProfile) {
						return createMissingOwnProfileAndGoToApp(user, isSignup);
					}
					User.findById(invitation.inviterId, (error, inviter) => {
						if (error) {
							log.error("Failed to find invitation inviter", {
								userId: invitation.inviterId,
								error,
							});
						}
						if (!inviter) {
							return createMissingOwnProfileAndGoToApp(user, isSignup);
						}
						async.parallel(
							[
								function (cb) {
									updateUserByInvitation(
										user,
										invitation,
										function (err, updated) {
											if (!err) {
												if (dbUpdatedCount(updated)) {
													log.info("Profile assigned to user", {
														userId: user._id.toString(),
														profileId: invitation.profileId,
														role: invitation.role,
													});
												} else {
													log.warn("Profile was not assigned to user", {
														userId: user._id.toString(),
														profileId: invitation.profileId,
														role: invitation.role,
													});
												}
											}
											cb(err);
										},
									);
								},
								function (cb) {
									updateProfileByInvitation(
										user,
										invitation,
										function (err, updated) {
											if (!err) {
												if (dbUpdatedCount(updated)) {
													log.info("User assigned to profile team", {
														userId: user._id.toString(),
														profileId: invitation.profileId,
														role: invitation.role,
													});
												} else {
													log.warn("User was not assigned to profile team", {
														userId: user._id.toString(),
														profileId: invitation.profileId,
														role: invitation.role,
													});
												}
											}
											cb(err);
										},
									);
								},
							],
							function () /*err*/ {
								// odeslat oznameni o akceptaci pozvanky
								teamMemberAccepted({
									invitee: user,
									inviter,
									profile: invitationProfile,
								}).then(
									() => {
										log.info(
											"Accepted team member invitation email successfully queued",
											{
												role: invitation.role,
												inviteeEmail: user.email,
												inviteeId: user._id.toString(),
												profileId: invitation.profileId,
												inviterId: invitation.inviterId,
											},
										);
									},
									(error) => {
										log.error(
											"Failed to queue team member invitation accepted",
											{
												role: invitation.role,
												inviteeEmail: user.email,
												inviteeId: user._id.toString(),
												profileId: invitation.profileId,
												inviterId: invitation.inviterId,
												message: error.toString(),
												error,
											},
										);
									},
								);

								Audit.profile(
									"member:accepted",
									user._id,
									invitation.profileId,
									{
										role: invitation.role,
									},
								);

								createMissingOwnProfileAndGoToApp(user, isSignup);
							},
						);
					});
				});
			} else {
				createMissingOwnProfileAndGoToApp(user, isSignup);
			}
		}

		function assignAffiliateToUser(req, res, user) {
			var arefferer = req.signedCookies && req.signedCookies.arefferer;
			if (arefferer && arefferer.campaignId && arefferer.mbsy) {
				user.affiliate = {
					referrer: {
						campaignId: arefferer.campaignId,
						mbsy: arefferer.mbsy,
					},
				};
				res.clearCookie("arefferer");
			}
		}

		function checkUserState(user /*, body*/) {
			switch (user.state) {
				case States.user.deleted.code:
					assignAffiliateToUser(req, res, user);

					user.state = States.user.enabled.code;
					user.deleted = undefined;
					user.blocked = undefined;
					user.blockReason = undefined;
					user.save(function (err) {
						if (err) {
							log.error("Failed to reactivate user", {
								userId: user._id.toString(),
								error: err,
							});
						}

						log.info("Registered previously deleted user", {
							email: user.email,
						});

						customerLifecycle.signup(user);

						// /* jshint -W064 */
						// Metric('user-events', { ev: 'signup', uid: user._id.toString() });

						finish(user, true);
					});
					break;
				case States.user.enabled.code:
					finish(user);
					break;
				case States.user.blocked.code:
					req.notify(
						"warning",
						"Your account is blocked. Please contact support.",
					);
					res.redirect(config.get("http:landingpage:signin"));
					break;
			}
		}

		function continueWithUser(user, body) {
			if (user) {
				if (body) {
					updateUserProfile(user, body, function () {
						checkUserState(user, body);
					});
				} else {
					checkUserState(user);
				}
			} else {
				var actorId = getGoogleIdentityId(body);
				var meta = (body && body.user_metadata) || {};

				/* jshint -W106 */
				user = new User({
					_id: new ObjectId(),
					auth0Id: body.user_id,
					actorId,
					name: body.name,
					fname: body.given_name,
					lname: body.family_name,
					email: body.email,
					emailVerified: !!body.email_verified,
					tz: meta.tz,
					country: meta.country && meta.country.toUpperCase(),
					locale: meta.locale || (body.locale && body.locale.split("-")[0]),
				});

				avatarImage.storeForce(
					fixPicture(body.picture),
					user,
					null,
					(image) => {
						user.image = image;

						assignAffiliateToUser(req, res, user);

						if (invitation) {
							user.profiles = {};
							user.profiles[invitation.role] = [
								new ObjectId(invitation.profileId),
							];
						}

						user.save(function (err, user) {
							if (err) {
								log.error("Failed to signup user", {
									actorId: actorId,
									error: err,
								});
								res.redirect(config.get("http:landingpage:force"));
							} else {
								log.info("Registered user", {
									email: user.email,
								});

								customerLifecycle.signup(user);

								// /* jshint -W064 */
								// Metric('user-events', { ev: 'signup', uid: user._id.toString() });

								finish(user, true);
							}
						});
					},
				);
			}
		}

		if (req.path === "/share-login") {
			req.session.goto = `/share?${qs.stringify(req.query)}`;
		} else if (req.query.url) {
			req.session.goto = req.query.url;
		}

		if (req.query.code) {
			authorizationCodeToAccessToken(req.query.code)
				.then((token) => {
					// token: { access_token: 'XXX.XXX',
					// expires_in: 3599,
					// refresh_token: 'Qp-XXX.XXX',
					// scope: 'admin offline',
					// token_type: 'bearer' }
					const {
						access_token: accessToken,
						refresh_token: refreshToken,
						expires_in: expiresIn,
					} = token || {};
					if (!accessToken) {
						log.error("Got empty fpm login access token");
						return res.redirect(config.get("http:landingpage:force"));
					}

					hydra
						.introspectToken(accessToken)
						.then((dtoken) => {
							// { "active": true,
							//   "scope": "admin",
							//   "client_id": "XXX",
							//   "sub": "54fd954db853be010073c4d7",
							//   "exp": 1512404527,
							//   "iat": 1512400927,
							//   "aud": "HyaTrgjiK7ZZ4GpmqmAWV0CG",
							//   "iss": "https://hydra.friendsplus.me" }
							const { sub: tokenUserId } = dtoken || {};
							if (!tokenUserId) {
								log.error("Got empty access token sub field");
								return res.redirect(config.get("http:landingpage:force"));
							}

							const userAliases = config.get("users:alias") || {};
							const userId =
								(userAliases && userAliases[tokenUserId]) || tokenUserId;
							if (tokenUserId !== userId) {
								log.info(`For user ${tokenUserId} used alias ${userId}`);
							}

							User.findById(userId)
								.exec()
								.then((user) => {
									if (!user) {
										log.error("User not found", { userId });
										return res.redirect(config.get("http:landingpage:force"));
									}

									const ssoSession = {
										accessToken,
										refreshToken,
										atExpiresAt: ssoSessionManager.expiresIn(expiresIn),
									};

									ssoSessionManager
										.create(ssoSession)
										.then((ssoSessionId) => {
											req.session.ssoSessionId = ssoSessionId;
											return continueWithUser(user, null, { ssoSessionId });
										})
										.catch((err) => {
											log.error("Failed to create sso session", {
												userId,
												message: err.toString(),
												stack: err.stack,
											});
											res.redirect(config.get("http:landingpage:force"));
										});
								})
								.catch((err) => {
									log.error("Failed to load user from db", {
										userId,
										message: err.toString(),
										stack: err.stack,
									});
									res.redirect(config.get("http:landingpage:force"));
								});
						})
						.catch((err) => {
							log.error("Failed to introspect access token", {
								message: err.toString(),
								stack: err.stack,
							});
							res.redirect(config.get("http:landingpage:force"));
						});
				})
				.catch((err) => {
					log.error("Failed to get fpm login access token", {
						message: err.toString(),
						stack: err.stack,
					});
					res.redirect(config.get("http:landingpage:force"));
				});
		} else if (req.user) {
			continueWithUser(req.user);
		} else {
			redirectLogin(req, res);
		}
	}

	function redirectWildcardToApp(req, res) {
		let url = req.params[0];
		if (url && url[0] !== "/") {
			url = `/${url}`;
		}
		const q = qs.stringify(Object.assign({}, req.query || {}, { url }));
		res.redirect(`/?${q}`);
	}

	function sendVerificationEmail(req, res, onSuccess, { errorUrl } = {}) {
		const { user } = req;
		if (!user.email) {
			return redirectLogin(req, res);
		}
		return ssoSessionManager
			.accessToken(req.session.ssoSessionId)
			.then((accessToken) => {
				request(
					{
						method: "GET",
						url: `${config.get("api:url")}/users.sendVerificationEmail`,
						qs: {
							redirect: config.get("http:ui:url"),
						},
						headers: {
							Authorization: `Bearer ${accessToken}`,
						},
						encoding: "utf-8",
						timeout: 30 * 1000,
						json: true,
					},
					(err, rsp, reply) => {
						if (err) {
							log.error("API request users.sendVerificationEmail failed", {
								userId: user._id.toString(),
								statusCode: rsp.statusCode,
								reply,
								message: err.toString(),
								stack: err.stack,
							});
							if (errorUrl) {
								res.redirect(errorUrl);
							} else {
								redirectLogin(req, res);
							}
						} else {
							log.info("Sent API users.sendVerificationEmail request", {
								userId: user._id.toString(),
								statusCode: rsp.statusCode,
								reply,
							});
							if (onSuccess) {
								onSuccess(req, res);
							}
						}
					},
				);
			})
			.catch((err) => {
				log.error("Failed to get sso session access token", {
					userId: user._id.toString(),
					message: err.toString(),
					stack: err.stack,
				});
				if (errorUrl) {
					res.redirect(errorUrl);
				} else {
					redirectLogin(req, res);
				}
			});
	}

	router.get("/verify", tools.tokenRequired, (req, res) => {
		sendVerificationEmail(req, res, () => {
			res.send(verificationTemplate({ user: req.user }));
		});
	});

	router.get("/verify/resend", tools.tokenRequired, (req, res) => {
		sendVerificationEmail(
			req,
			res,
			() => {
				res.send(verificationEmailSentTemplate({ user: req.user }));
			},
			{ errorUrl: "/verify" },
		);
	});

	router.get("/share", fetchDataAndRenderShare);

	router.get("/share.html", processShare);

	router.get("/share-login", signin);

	router.get("/force", (req, res) => {
		const signoutQuery = qs.stringify({
			redirect_url: fpmLoginRedirectUrl(),
		});
		signoutSession(
			req,
			res,
			`${config.get("login:url")}/signout?${signoutQuery}`,
		);
	});

	router.get("/signout", (req, res) => {
		signoutSession(req, res, `${config.get("login:url")}/signout`);
	});

	router.get("/signup", (req, res) => {
		const redirect = () => {
			res.redirect(`${config.get("login:url")}/register`);
		};
		if (req.session) {
			req.session.regenerate(redirect);
		} else {
			redirect();
		}
	});

	router.get("/signin", tools.tokenOptional, signin);

	router.get("/a/*", catchAffiliateRefferer, redirectWildcardToApp);

	router.get("/", catchAffiliateRefferer, getApp);

	router.get(
		"*",
		catchAffiliateRefferer,
		tools.tokenOptional,
		redirectWildcardToApp,
	);
};
