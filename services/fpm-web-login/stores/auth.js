import { action, observable } from 'mobx';

export default class Store {
  @observable idToken = null;
  cookieAuth = null;
  signout = false;

  constructor(state) {
    Object.assign(this, state);
  }

  @action
  setIdToken = idToken => {
    this.idToken = idToken;
  };

  @action
  clear = () => {
    this.idToken = null;
  };
}

export const initialState = async ({ req }) => ({
  cookieAuth: req.cookieAuth,
  idToken: req.idToken,
  signout: (req.query.signout && req.query.signout.toLowerCase() === 'true') || false
});
