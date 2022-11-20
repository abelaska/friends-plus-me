/* global window, Raven */
"use strict";

var config = window.__config;
var user = window.__initialState.user;
var ignorePatterns = [
	/\/scripts\/.*\.share-vendor\.js/,
	/\/scripts\/.*\.vendor\.js/,
];

function isPatternDetected(value) {
	if (ignorePatterns && ignorePatterns.length) {
		for (var k = 0; k < ignorePatterns.length; k++) {
			if (ignorePatterns[k].test(value)) {
				return true;
			}
		}
	}
	return false;
}

Raven.config("https://XXX@sentry.io/XXX", {
	release: config.version,
	environment: config.env,
	tags: {
		release: config.version || "?",
		environment: config.env || "?",
	},

	// https://gist.github.com/impressiver/5092952
	ignoreErrors: [
		"Can't find variable: Set",
		"NS_ERROR_ILLEGAL_VALUE",
		"Can't find variable: inf",
		"Can't find variable: nan",
		"angular is not defined",
		"jQuery is not defined",
		"Cannot find module 'jquery'",
		"Unable to find valid container.",
		"_registerComponent(...): Target container is not a DOM element.",
		"Cannot read property 'changeCursor' of undefined",
		"Failed to read the 'contentDocument' property from 'HTMLIFrameElement': Blocked a frame with origin \"null\" from accessing a cross-origin frame.",
		// Firebase
		'Blocked a frame with origin "null" from accessing a cross-origin frame.',
		// Random plugins/extensions
		"top.GLOBALS",
		// See: http://blog.errorception.com/2012/03/tale-of-unfindable-js-error.html
		"originalCreateNotification",
		"canvas.contentDocument",
		"MyApp_RemoveAllHighlights",
		"http://tt.epicplay.com",
		"Can't find variable: ZiteReader",
		"jigsaw is not defined",
		"ComboSearch is not defined",
		"http://loading.retry.widdit.com/",
		"atomicFindClose",
		// Facebook borked
		"fb_xd_fragment",
		// ISP "optimizing" proxy - `Cache-Control: no-transform` seems to reduce this. (thanks @acdha)
		// See http://stackoverflow.com/questions/4113268/how-to-stop-javascript-injection-from-vodafone-proxy
		"bmi_SafeAddOnload",
		"EBCallBackMessageReceived",
		// See http://toolbar.conduit.com/Developer/HtmlAndGadget/Methods/JSInjection.aspx
		"conduitPage",
		// Generic error code from errors outside the security sandbox
		// You can delete this if using raven.js > 1.0, which ignores these automatically.
		"Script error.",
		"__gCrWeb.autofill.extractForms",
		"undefined is not an object (evaluating '__gCrWeb.autofill.extractForms')",
		// recaptcha
		"ReCAPTCHA placeholder element must be empty",
		"ReCAPTCHA placeholder element must be an element or id",
		"Cannot read property 'render' of null",
		"a.la is null",
		// helpscount
		"this.refs.content is undefined",
		"undefined is not an object (evaluating 'this.refs.content.searchSuggestions')",
		"Cannot read property 'ok' of undefined",
	],
	ignoreUrls: [
		// Facebook flakiness
		/graph\.facebook\.com/i,
		// Facebook blocked
		/connect\.facebook\.net\/en_US\/all\.js/i,
		// Woopra flakiness
		/eatdifferent\.com\.woopra-ns\.com/i,
		/static\.woopra\.com\/js\/woopra\.js/i,
		// Chrome extensions
		/extensions\//i,
		/^chrome:\/\//i,
		// Firefox extensions
		/^resource:\/\//i,
		// Other plugins
		/127\.0\.0\.1:4001\/isrunning/i, // Cacaoweb
		/webappstoolbarba\.texthelp\.com\//i,
		/metrics\.itunes\.apple\.com\.edgesuite\.net\//i,
	],

	whitelistUrls: [/https?:\/\/((staging|app)\.)?friendsplus\.me/],

	shouldSendCallback: function (data) {
		var exs = data && data.exception && data.exception.values;
		if (!exs || !exs.length) {
			return true;
		}
		var frames, filename;
		for (var i = 0; i < exs.length; i++) {
			frames = exs[i] && exs[i].stacktrace && exs[i].stacktrace.frames;
			if (frames && frames.length) {
				for (var j = 0; j < frames.length; j++) {
					filename = frames[j] && frames[j].filename;
					if (isPatternDetected(filename)) {
						return false;
					}
				}
			}
		}
		return true;
	},
}).install();

if (user) {
	Raven.setUserContext({
		id: user._id,
		email: user.email,
		username: user.name,
	});
}
