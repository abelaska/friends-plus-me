import { action, observable } from "mobx";
import { showLock } from "../utils/lock";

export default class Store {
	@observable sign = "in";
	@observable consent = null;
	@observable redirecting = false;
	@observable consenting = false;

	constructor(state) {
		Object.assign(this, state);
	}

	@action
	switchToSignUp = (args) => {
		this.sign = "up";
		showLock(args);
	};

	@action
	switchToSignIn = (args) => {
		this.sign = "in";
		showLock(args);
	};

	@action
	startRedirecting = () => {
		this.redirecting = true;
	};

	@action
	startConsenting = () => {
		this.consenting = true;
	};

	@action
	stopConsenting = () => {
		this.consenting = false;
	};

	@action
	showConsent = ({
		user,
		app,
		additional_scopes,
		granted_scopes,
		auth0IdToken,
	}) => {
		this.consent = {
			user,
			app,
			additional_scopes,
			granted_scopes,
			auth0IdToken,
		};
	};
}

export const initialState = async ({ req }) => ({
	sign: req.path === "/register" ? "up" : "in",
	consenting: req.cookieAuth && req.idToken,
	// consent: {
	//   granted_scopes: [],
	//   additional_scopes: ['admin', 'offline'],
	//   app: {
	//     name: 'Demo App 2',
	//     picture: 'https://friendsplus.me/favicon.ico',
	//     url: 'https://friendsplus.me'
	//   },
	//   user: {
	//     locale: 'en',
	//     name: 'Alois Bělaška',
	//     picture:
	//       'https://lh3.googleusercontent.com/1xrxrF0FST7Bqk3nH6609pmrdeQZtxwbUMhf56rp-fmI4SV3UB7Ti7EY8ipMFWP0xAit56bch_RTOc5dP-HfbTdIvh89=s50'
	//   },
	//   auth0IdToken:
	//     'XXX.XXX.XXX-XXX-XXX-XXX-3w-XXX-XXX'
	// }
});
