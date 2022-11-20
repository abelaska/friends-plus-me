import Promise from 'bluebird';
import * as ConfigStore from '../stores/config';
import * as AuthStore from '../stores/auth';
import * as UiStore from '../stores/ui';
import * as ApiStore from '../stores/api';

const stores = {
  api: ApiStore,
  auth: AuthStore,
  config: ConfigStore,
  ui: UiStore
};

let browserStore;

export const initialState = async ctx =>
  Object.assign(
    {},
    ...(await Promise.map(Object.keys(stores), async name => ({
      [name]: (stores[name].initialState && (await stores[name].initialState(ctx))) || {}
    })))
  );

export const restore = state => {
  const store = {};
  Object.keys(stores).forEach(name => {
    store[name] = new stores[name].default(Object.assign({}, (state && state[name]) || {}, { store }));
  });
  return store;
};

export default (isServer, state) => {
  if (isServer) {
    return restore(state);
  } else {
    if (!browserStore) {
      browserStore = restore(state);
    }
    return browserStore;
  }
};
