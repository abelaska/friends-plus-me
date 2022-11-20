window.__config = {
	env: "production",

	api: {
		// url: 'https://app.friendsplus.me/1',
		ops: {
			auth: "/auth",
			authCheck: "/auth/check",
			paypal: {
				success: "/paypal/callback/success",
			},
			bitly: {
				authProfile: "/bitly/auth/profile/:profile",
				authAccount: "/bitly/auth/account/:account",
			},
			googl: {
				authProfile: "/googl/auth/profile/:profile",
				authAccount: "/googl/auth/account/:account",
			},
		},
	},

	recaptcha: {
		// recaptcha invisible
		sitekey: "XXX-XXX",
	},

	crawler: {
		url: "https://crawler.friendsplus.me/",
	},

	extension: {
		// production
		id: "XXX",
	},

	events: {
		enabled: false,
		url: "https://track.friendsplus.me",
		db: "fpm-events",
		username: "ui",
		password: "XXX",
		flushInterval: 3000,
	},

	log: {
		debug: false,
		token: "XXX",
	},

	web: {
		urlplus: "https://friendsplus.me",
		// url: 'https://app.friendsplus.me',
		// root: 'https://app.friendsplus.me',
		// app: 'https://app.friendsplus.me',
		// signin: 'https://app.friendsplus.me/signin',
		// signout: 'https://app.friendsplus.me/signout'
	},

	google: {
		scope:
			"https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
		requestvisibleactions: "",
		clientid: "XXX-XXX.apps.googleusercontent.com",
		autoSignup: false,
		afterSigninRedirectTo: false, // '/accounts'
	},

	analytics: {
		token: "UA-XXX-10",
		config: {
			cookieDomain: "app.friendsplus.me",
		},
	},

	kissmetrics: {
		enabled: false,
		token: "XXX",
	},

	braintree: {
		merchantId: "XXX",
	},

	paypal: {
		currency: "USD",
		merchantId: "XXX",
		env: "www",
		ipnCallback: "https://api.friendsplus.me/1/paypal/ipn/callback",
	},
};
