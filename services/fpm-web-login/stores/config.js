import getHost from '../utils/host';

export default class Store {
  constructor(state) {
    Object.assign(this, state);
  }
}

export const initialState = async ({ req }) => ({
  server: {
    url: getHost(req)
  },
  auth0: {
    clientId: req.config.auth0.clientId,
    domain: req.config.auth0.domain
  },
  fpm: {
    clientId: req.config.fpm.app.clientId,
    scopes: req.config.fpm.app.scopes,
    redirectUrl: req.config.fpm.app.redirectUrl
  }
});
