const Raven = require("raven");
const log = require("@fpm/logging").default;
const config = require("@fpm/config");

if (config.get("isProd")) {
	Raven.config("https://XXX:XXX@sentry.io/XXX", {
		release: config.get("version"),
		environment: config.get("env"),
		tags: {
			node: process.versions.node,
		},
		captureUnhandledRejections: true,
	}).install();
} else {
	process.on("unhandledRejection", (reason) =>
		log.error("Unhandled Promise Rejection", { stack: reason.stack }),
	);
}
