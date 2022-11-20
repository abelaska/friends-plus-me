require("app-root-dir").set(__dirname);

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
} else {
	process.on("unhandledRejection", (reason) =>
		console.error("Unhandled Promise Rejection", { stack: reason.stack }),
	);
}

const express = require("express");
const nextJs = require("next");
const mobxReact = require("mobx-react");
const sessions = require("client-sessions");
const log = require("@fpm/logging").default;
const { dbConnect } = require("@fpm/db");
const { CacheRedis } = require("@fpm/cache-redis");
const { OAuthTokenCryptor } = require("@fpm/token");
const { AssetsManager } = require("@fpm/assets");
const { Hydra } = require("@fpm/hydra");
const { Auth0Mgmt } = require("@fpm/auth0");
const onHeaders = require("on-headers");
const { sendError, signOut } = require("./http");
const challenge = require("./challenge");
const apiConset = require("./api/consent");
const apiApprove = require("./api/approve");
const apiSignout = require("./api/signout");
const apiRegister = require("./api/register");
const { auth0CodeToIdToken } = require("./auth0");

dbConnect();

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT, 10) || 3000;
const app = nextJs({ dev });
const handle = app.getRequestHandler();
const cryptor = new OAuthTokenCryptor();
const cache = new CacheRedis({ cryptor, config });
const auth0 = new Auth0Mgmt({ cache });
const assetsManager = new AssetsManager({
	imageProxyConfig: config.get("image:proxy"),
});
const hydra = new Hydra({
	cache,
	scope: config.get("hydra:consent:scope"),
	clientId: config.get("hydra:consent:clientId"),
	clientSecret: config.get("hydra:consent:clientSecret"),
});
const dependencies = { cryptor, cache, hydra, auth0, assetsManager };

const injectDeps = (deps) => (req, res, next) => {
	req.deps = deps;
	req.config = config.get();
	next();
};

mobxReact.useStaticRendering(true);

app.prepare().then(() => {
	const server = express();
	server.enable("trust proxy");
	server.set("x-powered-by", false);

	const api = express.Router();

	api.use((req, res, next) => {
		try {
			next();
		} catch (e) {
			sendError(res, 500, "internal_error");
		}
	});
	api.get("/consent", apiConset);
	api.get("/approve", apiApprove);
	api.get("/register", apiRegister);

	server.use((req, res, next) => {
		if (
			req.path.indexOf("/static/") === 0 ||
			req.path.indexOf("/_next/") === 0 ||
			req.path === "/health"
		) {
			return next();
		}
		const tm = new Date();
		log.debug(`> ${req.ip} ${req.method} ${req.originalUrl}`);
		onHeaders(res, () =>
			log.debug(
				`< ${req.ip} ${req.method} ${req.originalUrl} in ${new Date() - tm}ms`,
			),
		);
		next();
	});

	server.use((req, res, next) => {
		req.connection.proxySecure = true;
		next();
	});
	server.get("/health", (req, res) => res.send("ok"));
	server.use(
		sessions({
			cookieName: "fpm",
			requestKey: "cookieAuth",
			secret: config.get("session:secret"),
			duration: 7 * 24 * 60 * 60 * 1000,
			activeDuration: 1 * 24 * 60 * 60 * 1000,
			cookie: {
				httpOnly: true,
				secure: config.get("isProd"),
			},
		}),
	);
	server.use((req, res, next) => {
		if (["/", "/register"].indexOf(req.path) === -1) {
			return next();
		}
		const { signout, code } = req.query;
		const shouldSignOut =
			(signout && signout.toLowerCase() === "true") ||
			(!req.query.challenge && !code);
		if (shouldSignOut) {
			signOut(req);
		}
		next();
	});
	server.get("/signout", apiSignout);
	server.use(injectDeps(dependencies));
	server.use(challenge());
	server.use(auth0CodeToIdToken());
	server.use("/api", api);
	server.get("/register", (req, res) => app.render(req, res, "/", req.query));
	server.use((req, res, next) => {
		res.set("x-frame-options", "SAMEORIGIN");
		res.set("x-robots-tag", "noindex, nofollow, nosnippet, noarchive");
		res.set("x-content-type-options", "nosniff");
		res.set("x-xss-protection", "1; mode=block");
		next();
	});
	server.get("*", handle);

	server.listen(port, (err) => {
		if (err) throw err;
		log.info(`Ready on http://localhost:${port}`);
	});
});
