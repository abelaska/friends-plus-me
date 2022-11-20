//  https://github.com/zeit/next.js/issues/1852#issuecomment-370603560

import Raven from "raven-js";

// https://gist.github.com/impressiver/5092952
const clientIgnores = {
	ignoreErrors: [
		"iubenda",
		"$ is not defined",
		"jQuery is not defined",
		"top.GLOBALS",
		"originalCreateNotification",
		"canvas.contentDocument",
		"MyApp_RemoveAllHighlights",
		"http://tt.epicplay.com",
		"Can't find variable: ZiteReader",
		"jigsaw is not defined",
		"ComboSearch is not defined",
		"http://loading.retry.widdit.com/",
		"atomicFindClose",
		"fb_xd_fragment",
		"bmi_SafeAddOnload",
		"EBCallBackMessageReceived",
		"conduitPage",
		"Script error.",
	],
	ignoreUrls: [
		/cdn\.iubenda\.com\/cookie_solution/i,
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
		// Other plugins
		/127\.0\.0\.1:4001\/isrunning/i, // Cacaoweb
		/webappstoolbarba\.texthelp\.com\//i,
		/metrics\.itunes\.apple\.com\.edgesuite\.net\//i,
	],
};

const options = {
	autoBreadcrumbs: true,
	captureUnhandledRejections: true,
	// eslint-disable-next-line global-require
	release: require("../package.json").version,
	environment: process.env.NODE_ENV,
};

const IsomorphicRaven =
	(process.env.NODE_ENV === "production" &&
		(process.browser === true
			? Raven
			: // https://arunoda.me/blog/ssr-and-server-only-modules
			  // eslint-disable-next-line no-eval
			  eval("require('raven')"))) ||
	null;

if (IsomorphicRaven) {
	if (process.browser === true) {
		IsomorphicRaven.config("https://XXX@sentry.io/XXX", {
			...clientIgnores,
			...options,
		}).install();
	} else {
		IsomorphicRaven.config("https://XXX:XXX@sentry.io/XXX", options).install();
	}
}

export default IsomorphicRaven;
