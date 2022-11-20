/* global window */
import { action, observable } from "mobx";
import { apiUserIdentity } from "./api";
import isServer from "../utils/isServer";

export default class Store {
	refreshIframeEventListener = null;
	refreshIframeTimeoutHandle = null;
	refreshIframe = null;

	state = null;

	@observable token = null;
	@observable tokenExpiresAt = null;
	@observable user = null;

	constructor(state = {}) {
		Object.assign(this, state);
	}

	@action
	logout = () => {
		this.token = null;
		this.tokenExpiresAt = null;
		this.user = null;
	};

	@action
	setUser = ({ user }) => {
		this.user = user;
	};

	@action
	setToken = ({ token, tokenExpiresAt }) => {
		this.token = token;
		this.tokenExpiresAt = tokenExpiresAt;
		this.destroyRefreshIframe();
		this.startRefreshToken();
	};

	destroyRefreshIframe = () => {
		if (this.refreshIframeTimeoutHandle) {
			clearTimeout(this.refreshIframeTimeoutHandle);
			this.refreshIframeTimeoutHandle = null;
		}
		if (this.refreshIframe && this.refreshIframeEventListener) {
			this.refreshIframe.removeEventListener(
				"load",
				this.refreshIframeEventListener,
				false,
			);
			this.refreshIframeEventListener = null;
		}
		if (this.refreshIframe) {
			window.document.body.removeChild(this.refreshIframe);
			this.refreshIframe = null;
		}
	};

	startRefreshToken = () => {
		if (!this.token || !this.tokenExpiresAt || isServer) {
			return;
		}
		const refreshIn = Math.max(
			0,
			this.tokenExpiresAt - new Date().valueOf() - 5 * 60 * 1000,
		);
		setTimeout(() => this.refreshToken(), refreshIn);
	};

	refreshToken = () => {
		const url = `${this.store.config.server.url}/api/refresh.token`;

		this.refreshIframeEventListener = (e) => {
			const hash = this.refreshIframe.contentWindow.location.hash;
			this.destroyRefreshIframe();

			if (hash && hash.indexOf("#") === 0) {
				// #access_token=XXX-XXX.XXX&expires_in=3599&scope=identity.basic%20identity.avatar&state=1504692703811&token_type=bearer
				const token = hash
					.substr(1)
					.split("&")
					.map((kv) => kv.split("=").map((v) => decodeURIComponent(v)))
					.reduce((r, p) => {
						r[p[0]] = p[1];
						return r;
					}, {});
				if (token.access_token) {
					const expiresIn = (token.expires_in || 60 * 60) - 5 * 60;
					const expiresAt = new Date(
						new Date().valueOf() + expiresIn * 1000,
					).valueOf();
					this.setToken({
						token: token.access_token,
						tokenExpiresAt: expiresAt,
					});
				}
			}
		};

		this.refreshIframe = window.document.createElement("iframe");
		this.refreshIframe.style.display = "none";
		this.refreshIframe.src = url;
		this.refreshIframe.addEventListener(
			"load",
			this.refreshIframeEventListener,
			false,
		);
		window.document.body.appendChild(this.refreshIframe);

		this.refreshIframeTimeoutHandle = setTimeout(() => {
			this.destroyRefreshIframe();
		}, 60 * 1000);
	};
}

export const getTokenFromReq = (req) => req.cookieAuth && req.cookieAuth.token;
export const getTokenExpiresAtFromReq = (req) =>
	req.cookieAuth && req.cookieAuth.tokenExpiresAt;

const fetchUser = async (req) => {
	const token = getTokenFromReq(req);
	if (token) {
		const { user } = await apiUserIdentity({
			token,
			apiUrl: req.config.api.url,
		});
		if (user) {
			return user;
		}
		// invalidate token
		req.logout();
	}
	return null;
};

const randomStr = () => Math.random().toString(36).replace(/[^a-z]+/g, "");

const randomState = () =>
	[
		randomStr(),
		randomStr(),
		randomStr(),
		randomStr(),
		randomStr(),
		randomStr(),
	].join("");

export const initialState = async ({ req }) => ({
	state: randomState(),
	user: await fetchUser(req),
	token: getTokenFromReq(req),
	tokenExpiresAt: getTokenExpiresAtFromReq(req),
});
