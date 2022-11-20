/* global window */
import Auth0Lock from "auth0-lock";
import { apiConsent, apiRegister } from "./api";
import { errors } from "./errors";

// https://auth0.com/docs/libraries/lock/v11/configuration
const auth0Config = {
	closable: false,
	allowLogin: true,
	allowSignUp: false,
	container: "hiw-login-container",
	theme: {
		logo: "https://storage.googleapis.com/static.friendsplus.me/images/fpm.png",
		primaryColor: "#0f3966",
	},
	languageDictionary: {
		title: "Friends+Me",
		loginAtLabel: "Sign in at %s",
		loginLabel: "Sign In",
		loginSubmitLabel: "Sign In",
		loginWithLabel: "Sign in with %s",
		mfaSubmitLabel: "Sign In",
	},
	auth: {
		redirect: true,
		responseType: "code",
		params: {
			scope: "openid",
		},
	},
};

const signinAllowedConnections = [
	"google-oauth2",
	"facebook",
	"linkedin",
	"Username-Password-Authentication",
];
const signupAllowedConnections = [
	"google-oauth2",
	"Username-Password-Authentication",
];

const flashError = (text) => ({ type: "error", text });

let lock;

const hide = () => {
	if (lock) {
		lock.hide();
		lock = null;
	}
};

export const showLock = ({
	store,
	flashMessage,
	skipConsentingStop,
	options = {},
}) => {
	if (!skipConsentingStop) {
		store.ui.stopConsenting();
	}

	hide();

	const { config, ui, core, auth } = store;
	const isSignUp = ui.sign === "up";

	options = Object.assign({}, auth0Config, options);
	options.auth.redirectUrl = `${config.server.url}${
		isSignUp ? "/register" : "/"
	}`;
	options.allowLogin = !isSignUp;
	options.allowSignUp = isSignUp;
	options.allowedConnections = isSignUp
		? signupAllowedConnections
		: signinAllowedConnections;
	options.rememberLastLogin = !auth.signout;
	const processIdToken = ({ idToken }) => {
		// {
		//   accessToken: 'XXX';
		//   expiresIn: 86400;
		//   idToken: 'XXX.XXX.XXX-XXX';
		//   state: 'XXX-nJ.XXX';
		//   tokenType: 'Bearer';
		// }
		if (!options.auth.redirect) {
			hide();
		}
		ui.startConsenting();

		if (isSignUp) {
			return apiRegister({
				store,
				auth0IdToken: idToken,
			})
				.then(({ redirect_url: redirectUrl }) => {
					window.location.href = redirectUrl;
				})
				.catch(({ response: { data } = {} }) => {
					const text =
						(data && data.error && errors[data.error]) ||
						"Sign Up failed. Please try again.";
					showLock({ store, flashMessage: flashError(text) });
				});
		}

		if (!core.challenge || !core.challenge.clientId) {
			window.location.href = config.fpm.redirectUrl;
			return null;
		}

		apiConsent({
			store,
			clientId: core.challenge.clientId,
			challenge: core.challenge.original,
			auth0IdToken: idToken,
		})
			.then(
				({
					user,
					app,
					additional_scopes,
					granted_scopes,
					consent_required: consentRequired,
					consent,
				}) => {
					if (!user) {
						return showLock({
							store,
							flashMessage: flashError(
								"Something went wrong and user was not found",
							),
						});
					}
					const isConsentRequired =
						(consentRequired && !consent) ||
						core.challenge.prompt === "consent";
					if (isConsentRequired) {
						ui.stopConsenting();
						ui.showConsent({
							user,
							app,
							additional_scopes,
							granted_scopes,
							auth0IdToken: idToken,
						});
						hide();
					} else {
						window.location.href = `${core.challenge.redir}&consent=${consent}`;
					}
				},
			)
			.catch(({ response: { data } = {} }) => {
				auth.clear();
				const text =
					(data && data.error && errors[data.error]) ||
					"Authorization failed. Please try again.";
				showLock({ store, flashMessage: flashError(text) });
			});
	};

	if (auth.idToken) {
		processIdToken({ idToken: auth.idToken });
	} else {
		lock = new Auth0Lock(config.auth0.clientId, config.auth0.domain, options);
		lock.on("authenticated", processIdToken);
		lock.show({ flashMessage });
	}
};
