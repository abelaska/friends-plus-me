/* jshint node: true, esversion: 6 */

require("app-root-dir").set(__dirname);

const config = require("@fpm/config");
const Raven = require("raven");
const App = require("./lib/App");

if (config.get("isProd")) {
	Raven.config("https://XXX:XXX@sentry.io/XXX", {
		release: config.get("version"),
		environment: config.get("env"),
		tags: {
			node: process.versions.node,
		},
	}).install();
}

const { PostScheduler } = require("@fpm/post");

process.env.APP = "publisher";

new App((app, config, log) => {
	const postScheduler = new PostScheduler();
	const shortenerBitly = app.i("ShortenerBitly");
	const services = [];

	["Twitter", "Tumblr", "Linkedin", "Facebook", "Pinterest"].forEach((name) => {
		services.push(
			app.i(`publishers/Publisher${name}`, shortenerBitly, postScheduler),
		);
	});

	return services;
});
