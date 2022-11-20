const Raven = require("raven");
const config = require("@fpm/config");
const log = require("@fpm/logging").default;

if (!config.get("isDev") && !config.get("isTest")) {
	Raven.config("https://XXX:XXX@sentry.io/285865", {
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
