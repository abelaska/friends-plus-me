/* eslint no-case-declarations: "off" */
const log = require('@fpm/logging').default;
const config = require('@fpm/config');
const { OAuthApp } = require('@fpm/db');
const { oauth, scopes } = require('../utils/oauth');
const { createError } = require('../utils/error');
const { args, method, json, sanitizeBody, rateLimit } = require('../utils/http');
const { validateBody } = require('../utils/validations');
const { transformDbOAuthApp, fetchOAuthApp } = require('../utils/oauthApp');

const reservedCallbacks = config.get('reserved:callbacks') || [];

module.exports = [
  method('POST'),
  args('app'),
  json(),
  validateBody(),
  oauth(),
  scopes('apps', 'apps.write'),
  rateLimit(),
  sanitizeBody(),
  async req => {
    const { query, body, user, isAdmin, deps: { hydra, cryptor, assetsManager } } = req;

    const dbOAuthApp = await fetchOAuthApp({ query, user });
    if (!dbOAuthApp) {
      return createError('app_not_found');
    }

    // check uniqueness of app name
    const name = body.name && body.name.replace(/[<>]/g, '').trim();

    if (name && dbOAuthApp.name !== name) {
      const foundNames = await OAuthApp.count({ name: new RegExp(`^${name}$`, 'i') }).exec();
      if (foundNames) {
        return createError('invalid_request', `Application name '${name}' is not unique.`);
      }
    }

    // check that callbacks do not contain reserved address
    if (!isAdmin) {
      const isInvalidCallbacks = body.callbacks.some(url =>
        reservedCallbacks.some(reserved => url.toLowerCase().indexOf(reserved) > -1)
      );
      if (isInvalidCallbacks) {
        return createError('invalid_request', 'Reserved callback');
      }
    }

    // store body.picture as an avatar asset
    const asset = body.picture && (await assetsManager.fetchAndStoreAvatar({ url: body.picture, user }));
    const picture = asset && asset.picture.proxy;

    let client;
    try {
      client = await hydra.fetchClient(dbOAuthApp.clientId);
    } catch (e) {
      const { error, response } = e;
      log.error('Failed to fetch oauth application', {
        clientId: dbOAuthApp.clientId,
        userId: user._id.toString(),
        response,
        stack: !error && e.stack,
        error: !error && e
      });
      return createError('internal_error', 'App not registered');
    }

    if (picture) {
      dbOAuthApp.picture = picture;
    }
    if (name && dbOAuthApp.name !== name) {
      dbOAuthApp.name = name;
      client.client_name = name;
    }
    if (body.description !== undefined) {
      dbOAuthApp.description = body.description || '';
    }
    if (body.url !== undefined) {
      dbOAuthApp.url = body.url || '';
    }
    if (body.callbacks !== undefined) {
      dbOAuthApp.callbacks = body.callbacks;
      client.redirect_uris = body.callbacks;
    }
    if (body.company !== undefined) {
      dbOAuthApp.company = body.company &&
        (body.company.name || body.company.url) && {
          name: body.company.name || '',
          url: body.company.url || ''
        };
    }

    try {
      await hydra.updateClient(dbOAuthApp.clientId, client);
    } catch (e) {
      const { error, response } = e;
      log.error('Failed to oauth application update', {
        clientId: dbOAuthApp.clientId,
        userId: user._id.toString(),
        response,
        stack: !error && e.stack,
        error: !error && e
      });
      return createError('internal_error', 'App update failure');
    }

    await dbOAuthApp.save();

    const app = await transformDbOAuthApp({ dbOAuthApp, cryptor });

    return { ok: true, app };
  }
];
