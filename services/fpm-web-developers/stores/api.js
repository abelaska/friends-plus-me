import fetch from 'isomorphic-fetch';
import { toast } from 'react-toastify';

export const apiUserIdentity = async ({ apiUrl, token }) => {
  const reply = await fetch(`${apiUrl}/users.identity`, {
    method: 'GET',
    headers: { authorization: `Bearer ${token}` }
  });
  return reply && reply.json();
};

export const apiListApps = async ({ apiUrl, token }) => {
  const reply = await fetch(`${apiUrl}/apps.list`, {
    method: 'GET',
    headers: { authorization: `Bearer ${token}` }
  });
  return reply && reply.json();
};

export const apiFetchApp = async ({ apiUrl, token, app_id: appId }) => {
  const reply = await fetch(`${apiUrl}/apps.info?app=${appId}`, {
    method: 'GET',
    headers: { authorization: `Bearer ${token}` }
  });
  return reply && reply.json();
};

export const apiDeleteApp = async ({ apiUrl, token, app_id: appId }) => {
  const reply = await fetch(`${apiUrl}/apps.delete?app=${appId}`, {
    method: 'GET',
    headers: { authorization: `Bearer ${token}` }
  });
  return reply && reply.json();
};

export const apiCreateApp = async ({ apiUrl, token, name, description, url, picture, callbacks }) => {
  const reply = await fetch(`${apiUrl}/apps.create`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, description, url, picture, callbacks })
  });
  return reply && reply.json();
};

export const apiUpdateApp = async ({ apiUrl, token, app_id: appId, name, description, url, picture, callbacks }) => {
  const reply = await fetch(`${apiUrl}/apps.update?app=${appId}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, description, url, picture, callbacks })
  });
  return reply && reply.json();
};

export const apiRegenerateAppSecret = async ({ apiUrl, token, app_id: appId }) => {
  const reply = await fetch(`${apiUrl}/apps.rotateSecret?app=${appId}`, {
    method: 'GET',
    headers: { authorization: `Bearer ${token}` }
  });
  return reply && reply.json();
};

export default class Store {
  store = null;

  constructor(state = {}) {
    Object.assign(this, state);
  }

  userIdentity = async ({ apiUrl, token } = {}) => {
    apiUrl = apiUrl || this.store.config.api.url;
    token = token || this.store.auth.token;
    const { user } = apiUserIdentity({ apiUrl, token });
    return user;
  };

  listApps = async ({ apiUrl, token } = {}) => {
    apiUrl = apiUrl || this.store.config.api.url;
    token = token || this.store.auth.token;
    const { apps, error, error_description: errorDesc } = await apiListApps({ apiUrl, token });
    if (error) {
      toast.error(`${errorDesc || 'Failed to list apps.'} Error:${error}`);
    }
    return apps;
  };

  fetchApp = async ({ apiUrl, token, app_id } = {}) => {
    apiUrl = apiUrl || this.store.config.api.url;
    token = token || this.store.auth.token;
    const { app, error, error_description: errorDesc } = await apiFetchApp({ apiUrl, token, app_id });
    if (error) {
      toast.error(`${errorDesc || 'Failed to fetch app.'} Error:${error}`);
    }
    return app;
  };

  deleteApp = async ({ apiUrl, token, app_id } = {}) => {
    apiUrl = apiUrl || this.store.config.api.url;
    token = token || this.store.auth.token;
    const { deleted, error, error_description: errorDesc } = await apiDeleteApp({ apiUrl, token, app_id });
    if (error) {
      toast.error(`${errorDesc || 'Failed to delete app.'} Error:${error}`);
    }
    if (deleted) {
      toast.success('App successfully deleted');
    }
    return deleted;
  };

  createApp = async ({ apiUrl, token, name, description, url, picture, callbacks } = {}) => {
    apiUrl = apiUrl || this.store.config.api.url;
    token = token || this.store.auth.token;
    const { app, error, error_description: errorDesc } = await apiCreateApp({
      apiUrl,
      token,
      name,
      description,
      url,
      picture,
      callbacks
    });
    if (error) {
      toast.error(`${errorDesc || 'Failed to create app.'} Error:${error}`);
    }
    if (app) {
      toast.success('App successfully created');
    }
    return app;
  };

  updateApp = async ({ apiUrl, token, app_id, name, description, url, picture, callbacks } = {}) => {
    apiUrl = apiUrl || this.store.config.api.url;
    token = token || this.store.auth.token;
    const { app, error, error_description: errorDesc } = await apiUpdateApp({
      apiUrl,
      token,
      app_id,
      name,
      description,
      url,
      picture,
      callbacks
    });
    if (error) {
      toast.error(`${errorDesc || 'Failed to update app.'} Error:${error}`);
    }
    if (app) {
      toast.success('App successfully updated');
    }
    return app;
  };

  regenerateAppSecret = async ({ apiUrl, token, app_id } = {}) => {
    apiUrl = apiUrl || this.store.config.api.url;
    token = token || this.store.auth.token;
    const { app, error, error_description: errorDesc } = await apiRegenerateAppSecret({ apiUrl, token, app_id });
    if (error) {
      toast.error(`${errorDesc || 'Failed to regenerate app secret.'} Error:${error}`);
    }
    if (app) {
      toast.success('App secret regenerated');
    }
    return app;
  };
}

export const initialState = async ({ req }) => ({});
