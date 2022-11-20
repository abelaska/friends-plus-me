global.Promise = require("bluebird");

require("app-root-dir").set(__dirname);

const config = require("@fpm/config");
const log = require("@fpm/logging").default;
const Raven = require("raven");

if (!config.get("isDev")) {
	Raven.config("https://XXX:XXX@sentry.io/XXX", {
		release: config.get("version"),
		environment: config.get("env"),
		tags: {
			node: process.versions.node,
		},
	}).install();
}

const geoip = require("geoip-lite");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const morgan = require("morgan");
const http = require("http");
const https = require("https");
const responseTime = require("response-time");
const cookieParser = require("cookie-parser");
const favicon = require("serve-favicon");
const bodyParser = require("body-parser");
const session = require("express-session");
const RedisStore = require("connect-redis")(session);

const { dbConnect } = require("@fpm/db");
const { SSOSessionManager } = require("@fpm/sso");
const { AssetsManager } = require("@fpm/assets");
const { GoogleTokens } = require("@fpm/token");
const { PostScheduler } = require("@fpm/post");
const { CacheRedis } = require("@fpm/cache-redis");
const { OAuthTokenCryptor } = require("@fpm/token");
const { Hydra } = require("@fpm/hydra");
const grant = require("@fpm/grant").default;
const { QueueManager } = require("@fpm/queue");
const { ProfileManager } = require("@fpm/accounts");

const token = require("./lib/token");
const { tokenRequired } = require("./lib/tools");
const csrf = require("./middleware/csrf");
const notifyMiddleware = require("./middleware/notify");
const blacklistByCountry = require("./middleware/blacklistByCountry");
const checkController = require("./controllers/checkController");
const photoController = require("./controllers/photoController");
const apiController = require("./controllers/apiController");
const api2Controller = require("./controllers/api2Controller");
const invoiceController = require("./controllers/invoiceController");
const bitlyController = require("./controllers/bitlyController");
const googlController = require("./controllers/googlController");
const paypalController = require("./controllers/paypalController");
const braintreeController = require("./controllers/braintreeController");
const accountController = require("./controllers/accountController");
const profileController = require("./controllers/profileController");
const discountController = require("./controllers/discountController");
const landingPageController = require("./controllers/landingPageController");
const teamController = require("./controllers/teamController");
const teamProfilesController = require("./controllers/teamProfilesController");
const userController = require("./controllers/userController");
const postController = require("./controllers/postController");
const affiliateController = require("./controllers/affiliateController");
const shareController = require("./controllers/shareController");
const queueController = require("./controllers/queueController");
const gaeController = require("./controllers/gaeController");
const creditController = require("./controllers/creditController");
const mailgunController = require("./controllers/mailgunController");
const TaskDowngrader = require("./tasks/TaskDowngrader");
const TaskCheckExpirations = require("./tasks/TaskCheckExpirations");
const PremiumManager = require("./lib/PremiumManager");
const AccountManager = require("./lib/AccountManager");
const PostManager = require("./lib/PostManager");
const CustomerLifecycle = require("./lib/CustomerLifecycle");
const FileEngine = require("./engine/FileEngine");

const app = express();
const router = express.Router();
const isDev = app.get("env") === "development";

dbConnect();

const cryptor = new OAuthTokenCryptor();
const cache = new CacheRedis({ cryptor, config });
const hydra = new Hydra({ cache });
const postScheduler = new PostScheduler();
const premiumManager = new PremiumManager(postScheduler);
const postManager = new PostManager(postScheduler);
const customerLifecycle = new CustomerLifecycle();
const assetsManager = new AssetsManager({
	imageProxyConfig: config.get("image:proxy"),
});
const googleTokens = new GoogleTokens();
const ssoSessionManager = new SSOSessionManager({
	config,
	hydra,
	clientId: config.get("fpm:app:clientId"),
	clientSecret: config.get("fpm:app:clientSecret"),
	...config.get("sso"),
});
const queueManager = new QueueManager({ config });
const profileManager = new ProfileManager({ queueManager });
const accountManager = new AccountManager({ profileManager });

ssoSessionManager
	.init()
	.then(() => log.info("SSO sessions initialized"))
	.catch((error) =>
		log.error("SSO sessions failed to initialize", {
			message: error.message,
			stack: error.stack,
		}),
	);

const deps = {
	queueManager,
	profileManager,
	accountManager,
	assetsManager,
	customerLifecycle,
	googleTokens,
	hydra,
	postScheduler,
	premiumManager,
	router,
	ssoSessionManager,
	tokenRequired,
};

const sessionConfig = {
	resave: false,
	rolling: false, // musi byt false jinak obsahuje i duplicitni hodnotu pro _csrf
	saveUninitialized: true,
	key: config.get("session:key"),
	secret: config.get("session:secret"),
	cookie: {
		secure: true,
		httpOnly: true,
		path: "/",
		maxAge: config.get("session:ttl") * 1000,
	},
	store: new RedisStore({
		port: config.get("redis:port"),
		host: config.get("redis:host"),
		prefix: `${config.get("session:key")}:`,
		pass: config.get("redis:auth_pass"),
		ttl: config.get("session:ttl"),
	}),
};

app
	.disable("x-powered-by")
	.disable("etag")
	.set("trust proxy", true)
	.set("views", `${__dirname}/../views`)
	.set("view engine", "html")
	.engine("html", FileEngine)
	.use(gaeController())
	.use(checkController())
	.use((req, res, next) => {
		const xAppEngineHttps = req.headers["x-appengine-https"];
		if (!req.headers["x-forwarded-proto"] && xAppEngineHttps) {
			req.headers["x-forwarded-proto"] =
				xAppEngineHttps.toLowerCase() === "on" ? "https" : "http";
		}
		req.userIp = req.headers["x-appengine-user-ip"] || req.ip;

		if (!req.headers["x-appengine-country"]) {
			const gi = geoip.lookup(req.userIp);
			const country = gi && gi.country;
			if (country) {
				req.headers["x-appengine-country"] = country;
			}
		}

		return next();
	})
	.use(responseTime())
	.use(favicon(`${__dirname}/../public/favicon.ico`))
	.use(
		express.static(`${__dirname}/../public`, {
			setHeaders(res /* , path */) {
				res.set(
					"Cache-Control",
					!isDev ? "public, max-age=31536000, immutable" : "public, max-age=0",
				);
				res.set(
					"Expires",
					new Date(Date.now() + (!isDev ? 31536000 : 0)).toUTCString(),
				);
				res.set("access-control-allow-origin", "*");
				res.set("x-frame-options", "SAMEORIGIN");
				res.set("x-content-type-options", "nosniff");
				res.set("x-xss-protection", "1; mode=block");
			},
		}),
	)
	// verify => req.rawBody is required by isValidXHub function in FB webhook controller
	.use(
		bodyParser.json({
			limit: "1024kB",
			verify: (req, res, buf) => {
				req.rawBody = buf;
			},
		}),
	)
	.use(bodyParser.urlencoded({ extended: true, limit: "1024kB" }))
	.use(cookieParser(config.get("cookie:secret")))
	.use(session(sessionConfig))
	.use(blacklistByCountry())
	.use(csrf())
	.use(notifyMiddleware())
	.use(token.useInApp(app));

if (isDev) {
	app.use(morgan("dev"));
	app.use(require("errorhandler")());
} else {
	const ignoreUrls = ["/1/extension/ping"]; // '/health', new RegExp('/static/')
	app.use(
		morgan(
			":remote-addr :method :url :status :res[content-length] - :response-time ms",
			{
				skip: (req) =>
					!!ignoreUrls.find((u) =>
						u instanceof RegExp ? u.test(req.url) : req.url === u,
					),
			},
		),
	);
}

app.use("/", router);

const corsConfig = {
	origin: "*",
	methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
	allowedHeaders: [
		"X-Requested-With",
		"Content-Type",
		"Origin",
		"x-fpme-token",
		"Referrer",
		"Accept",
		"X-FPME-Client",
		"X-FPME-Client-Version",
	],
	credentials: true,
};

router.all("/1/*", cors(corsConfig));

const skipTasks = process.env.TASKS === "no";
if (skipTasks) {
	log.info("Skipping tasks...");
} else {
	// Tasks
	const taskDowngrader = new TaskDowngrader({
		customerLifecycle,
		profileManager,
	});
	const taskCheckExpirations = new TaskCheckExpirations();
	taskDowngrader.start();
	taskCheckExpirations.start();
}

// API
grant(deps);
affiliateController(router);
apiController({ router, ssoSessionManager });
api2Controller(router, postManager);
creditController(router, premiumManager, accountManager);
mailgunController(deps);
photoController(router);
profileController(deps);
accountController(deps);
invoiceController(router);
bitlyController(router);
googlController(router, accountManager);
paypalController(deps);
braintreeController(deps);
discountController(router);
teamController(deps);
teamProfilesController(deps);
userController(router);
postController(deps);
shareController(deps);
queueController(deps);

// landing pages !!! musi byt predposledni routa v rade
landingPageController(deps);

// error handler must be registered as last
app.use((error, req, res, next) => {
	if (!error) {
		return next();
	}

	if (!isDev) {
		Raven.captureException(
			error instanceof Error ? error : JSON.stringify(error),
		);
	}

	if (error.statusCode) {
		const body = {};

		if (error.message) {
			body.message = error.message;
		}

		log.warn("Returning uncaught error", { error });

		return res.status(error.statusCode).json(body);
	}

	log.error("Uncaught error", {
		message: error.toString(),
		stack: error.stack,
		error,
	});

	if (
		req.xhr ||
		req.path.indexOf("/1/") === 0 ||
		req.path.indexOf("/2/") === 0
	) {
		res.status(500).json({ message: "Internal error" });
	} else {
		res.redirect("back");
	}
});

// HTTP(S)

http.globalAgent.maxSockets = 32 * 1024;
https.globalAgent.maxSockets = 32 * 1024;

const httpPort = process.env.PORT || config.get("http:port");
const httpBind = config.get("http:bind") || "localhost";

// https://certsimple.com/blog/localhost-ssl-fix
const createHttpsServer = (serverApp) => {
	const pem = fs.readFileSync(`${__dirname}/../conf/localhost.pem`);
	return https.createServer({ key: pem, cert: pem }, serverApp);
};

const server = isDev ? createHttpsServer(app) : http.createServer(app);
const protocol = isDev ? "https" : "http";

server.listen(httpPort, httpBind, () => {
	log.info(`Server started at ${protocol}://${httpBind}:${httpPort}`);
});

// if (isDev) {
//   http.createServer(app).listen(3000, httpBind, () => {
//     log.info(`Server started at http://${httpBind}:3000`);
//   });
// }
