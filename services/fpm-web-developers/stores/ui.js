import { action, observable } from 'mobx';
import { analyticsEvent } from '../utils/analytics';
import { Router } from '../routes';

export default class Store {
  store = null;
  query = null;
  counters = {};

  @observable app = null;
  @observable apps = [];
  @observable appsLoaded = false;
  @observable appsLoading = false;

  @observable appCreating = false;
  @observable appUpdating = false;
  @observable appDeleting = false;

  @observable showClientSecret = false;

  @observable form = null;

  constructor(state = {}) {
    Object.assign(this, state);
  }

  @action
  editApp = app => {
    this.app = app;
    Router.pushRoute('apps-edit', { app_id: app.app_id });
  };

  @action
  fetchApp = async ({ app_id }) => {
    this.appsLoading = true;
    this.app = (await this.store.api.fetchApp({ app_id })) || [];
    this.appsLoading = false;
  };

  @action
  fetchApps = async () => {
    this.appsLoading = true;
    this.apps = (await this.store.api.listApps()) || [];
    this.appsLoaded = true;
    this.appsLoading = false;
  };

  @action
  createApp = async ({ name, description, url, picture, callbacks }) => {
    if (typeof callbacks === 'string') {
      callbacks = callbacks.split(',').map(cb => cb.trim());
    }
    this.appCreating = true;
    const app = await this.store.api.createApp({ name, description, url, picture, callbacks });
    if (app) {
      analyticsEvent('app', 'created', app.app_id);
      this.app = app;
      this.apps.push(app);
      Router.pushRoute('apps-edit', { app_id: app.app_id });
    }
    this.appCreating = false;
    return app;
  };

  @action
  updateApp = async ({ app_id, name, description, url, picture, callbacks }) => {
    if (typeof callbacks === 'string') {
      callbacks = callbacks.split(',').map(cb => cb.trim());
    }
    this.appUpdating = true;
    const app = await this.store.api.updateApp({ app_id, name, description, url, picture, callbacks });
    if (app) {
      analyticsEvent('app', 'updated', app_id);
      this.app = app;
      this.apps = this.apps.map(a => (a.app_id === app_id ? app : a));
    }
    this.appUpdating = false;
    return app;
  };

  @action
  regenerateAppSecret = async ({ app_id }) => {
    this.appUpdating = true;
    const app = await this.store.api.regenerateAppSecret({ app_id });
    if (app) {
      analyticsEvent('app', 'secret.rotated', app_id);
      this.app = app;
      this.apps = this.apps.map(a => (a.app_id === app_id ? app : a));
    }
    this.appUpdating = false;
    return app;
  };

  @action
  deleteApp = async ({ app_id }) => {
    this.appDeleting = true;
    const deleted = await this.store.api.deleteApp({ app_id });
    if (deleted) {
      analyticsEvent('app', 'deleted', app_id);
      this.apps = this.apps.filter(app => app.app_id !== app_id);
    }
    Router.pushRoute('apps');
    this.appDeleting = false;
  };
}

export const initialState = async ({ query, req }) => ({
  query
});
