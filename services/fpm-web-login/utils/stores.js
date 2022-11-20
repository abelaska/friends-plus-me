import CoreStore, { initialState as coreInitialState } from '../stores/core';
import ConfigStore, { initialState as configInitialState } from '../stores/config';
import AuthStore, { initialState as authInitialState } from '../stores/auth';
import UiStore, { initialState as uiInitialState } from '../stores/ui';

/**
  Inject Inital State into Stores
 */
export default state => ({
  core: new CoreStore(state.core),
  config: new ConfigStore(state.config),
  auth: new AuthStore(state.auth),
  ui: new UiStore(state.ui)
});

export const initialState = async ({ req }) => ({
  core: await coreInitialState({ req }),
  config: await configInitialState({ req }),
  auth: await authInitialState({ req }),
  ui: await uiInitialState({ req })
});
