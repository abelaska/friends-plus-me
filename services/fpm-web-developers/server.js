require("app-root-dir").set(`${__dirname}/.next`);

const Raven = require("raven");
const config = require("@fpm/config");

if (config.get("isProd")) {
	Raven.config("https://XXX:XXX@sentry.io/XXX", {
		captureUnhandledRejections: true,
		release: config.get("version"),
		environment: config.get("env"),
		tags: {
			node: process.versions.node,
		},
	}).install();
}

const express = require("express");
const nextjs = require("next");
const mobxReact = require("mobx-react");
const qs = require("querystring");
const sessions = require("client-sessions");
const fetch = require("isomorphic-fetch");
const log = require("@fpm/logging").default;
const routes = require("./routes");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT, 10) || 3000;
const app = nextjs({ dev });
const handle = routes.getRequestHandler(app);

mobxReact.useStaticRendering(true);

const callbackUrl = `${config.get("http:url")}/apps`;
const createAuthUrl = ({ response_type, redirect_uri }) =>
	`${config.get("hydra:url")}/oauth2/auth?${qs.stringify(
		Object.assign(
			{
				response_type,
				redirect_uri,
				client_id: config.get("hydra:developers:clientId"),
				scope: config.get("hydra:developers:scope"),
			},
			config.get("isDev") ? { prompt: "consent" } : {},
		),
	)}`;
const refreshUrl = createAuthUrl({
	response_type: "token",
	redirect_uri: `${config.get("http:url")}/api/tokens.refresh`,
});
const authUrl = createAuthUrl({
	response_type: "code",
	redirect_uri: callbackUrl,
});

const injectDeps = (deps) => (req, res, next) => {
	req.deps = deps || {};
	req.config = config.get();
	req.auth = {
		refreshUrl,
		authUrl,
	};
	req.logout = () => {
		delete req.cookieAuth.token;
		delete req.cookieAuth.tokenExpiresAt;
	};
	// expire token in cookie
	if (
		req.cookieAuth.tokenExpiresAt &&
		req.cookieAuth.tokenExpiresAt < new Date().valueOf()
	) {
		req.logout();
	}
	next();
};

app.prepare().then(() => {
	const server = express();
	server.set("x-powered-by", false);

	server.get("/health", (req, res) => res.send("ok"));

	server.use((req, res, next) => {
		req.connection.proxySecure = true;
		res.set("x-frame-options", "SAMEORIGIN");
		res.set("x-content-type-options", "nosniff");
		res.set("x-xss-protection", "1; mode=block");
		next();
	});

	server.use(
		express.static(`${__dirname}/static`, {
			setHeaders(res /* , path */) {
				res.set("access-control-allow-origin", "*");
			},
		}),
	);

	server.use(
		sessions({
			cookieName: "fpmdevelopers",
			requestKey: "cookieAuth",
			secret: config.get("session:secret"),
			duration: 7 * 24 * 60 * 60 * 1000,
			activeDuration: 1 * 24 * 60 * 60 * 1000,
			cookie: {
				httpOnly: true,
				// secure: config.get('isProd')
			},
		}),
	);
	server.use(injectDeps());
	server.get("/api/refresh.token", (req, res) => res.redirect(302, refreshUrl));
	// aplikace muze vycist iframe url pokud se nejedna o cross-domain
	server.get("/api/token.refreshed", (req, res) => res.send("ok"));
	server.get("/logout", (req, res) => {
		req.logout();
		res.redirect(302, "/");
	});
	server.get("/apps", async (req, res, next) => {
		const { code } = req.query;
		if (code) {
			const reply = await fetch(
				`${config.get("api:url")}/oauth.access?${qs.stringify({
					code,
					redirect_uri: callbackUrl,
					client_id: config.get("hydra:developers:clientId"),
					client_secret: config.get("hydra:developers:clientSecret"),
				})}`,
			);
			const json = reply.status === 200 && (await reply.json());
			req.cookieAuth.token = json && json.access_token;
			req.cookieAuth.tokenExpiresAt =
				json &&
				new Date(
					new Date().valueOf() + (json.expires_in || 60 * 60) * 1000,
				).valueOf();
		}
		next();
	});
	server.get("*", handle);

	server.listen(port, (err) => {
		if (err) throw err;
		log.info(`Ready on http://localhost:${port}`);
	});
});
