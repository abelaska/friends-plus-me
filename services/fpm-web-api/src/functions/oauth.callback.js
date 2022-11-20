/* eslint camelcase: "off" */
const { args, method } = require("../utils/http");

module.exports = [
	method("GET"),
	args("code"),
	async (req) => {
		const {
			query: { code, state },
			deps: { hydra },
		} = req;

		const token = await hydra.authorizationCodeToAccessToken({
			code,
			redirect_uri: "http://localhost:3000/oauth.callback",
			grant_type: "authorization_code",
			client_id: "XXX~XXX",
			client_secret: "XXX~XXX",
		});

		const dtoken = await hydra.introspectToken(token.access_token);

		return { state, code, token, dtoken };
	},
];
