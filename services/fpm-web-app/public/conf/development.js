window.__config = {
	env: "development",

	api: {
		// url: 'https://localhost:9000/1',
		ops: {
			auth: "/auth",
			authCheck: "/auth/check",
			signin: "/signin",
			signout: "/signout",
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
		sitekey: "XXX",
	},

	crawler: {
		url: "https://crawler.friendsplus.me/",
	},

	extension: {
		id: "mplepcfnmkpmpeaeoiijbcdpffbkampo",
	},

	events: {
		enabled: false,
		url: "http://localhost:8086",
		db: "fpm-events",
		username: "ui",
		password: "uiui",
		flushInterval: 3000,
	},

	log: {
		debug: true,
		token: "XXX",
	},

	web: {
		urlplus: "https://friendsplus.me",
		// url: 'https://localhost:9000',
		// root: 'https://localhost:9000',
		// app: 'https://localhost:9000',
		// signin: 'https://localhost:9000/signin',
		// signout: 'https://localhost:9000/signout'
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
		token: "",
		config: {
			cookieDomain: "none",
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
		merchantId: "paypal-facilitator@loysoft.com",
		currency: "USD",
		env: "www.sandbox",
		ipnCallback: "https://localhost:9000/1/paypal/ipn/callback",
	},
};
