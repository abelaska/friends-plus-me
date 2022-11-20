/* eslint no-case-declarations: "off" */
const log = require('@fpm/logging').default;
const config = require('@fpm/config');
const { Scopes } = require('@fpm/constants');
const { OAuthApp } = require('@fpm/db');
const { oauth, scopes } = require('../utils/oauth');
const { createError } = require('../utils/error');
const { method, json, sanitizeBody, rateLimit } = require('../utils/http');
const { validateBody } = require('../utils/validations');
const { transformDbOAuthApp } = require('../utils/oauthApp');
const { newClientId, newClientSecret } = require('../utils/text');

const reservedCallbacks = config.get('reserved:callbacks') || [];

module.exports = [
  method('POST'),
  json(),
  validateBody(),
  oauth(),
  scopes('apps', 'apps.write'),
  rateLimit(),
  sanitizeBody(),
  async req => {
    const { body, user, isAdmin, deps: { hydra, cryptor, assetsManager } } = req;

    const name = body.name.replace(/[<>]/g, '');

    // check uniqueness of app name
    const foundNames = await OAuthApp.count({ name: new RegExp(name, 'i') }).exec();
    if (foundNames) {
      return createError('invalid_request', `Application name '${name}' is not unique.`);
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

    const clientId = newClientId();
    const clientSecret = newClientSecret();

    try {
      await hydra.createClient({
        id: clientId,
        client_name: name,
        client_secret: clientSecret,
        redirect_uris: body.callbacks,
        client_uri: body.url || '',
        grant_types: ['implicit', 'refresh_token', 'authorization_code'],
        response_types: ['id_token', 'code', 'token'],
        scope: Scopes.thirdPartyRootScopes(clientId).join(' '),
        owner: user._id.toString(),
        public: true
      });
    } catch (e) {
      const { error, response } = e;
      log.error('Failed to register oauth application', {
        name,
        userId: user._id.toString(),
        response,
        stack: !error && e.stack,
        error: !error && e
      });
      return createError('internal_error', 'App registration failure');
    }

    const dbOAuthApp = new OAuthApp({
      name,
      picture,
      clientId,
      clientSecret: cryptor.encrypt(clientSecret),
      description: body.description || '',
      url: body.url || '',
      createdBy: user._id,
      callbacks: body.callbacks,
      company: body.company &&
        (body.company.name || body.company.url) && {
          name: body.company.name || '',
          url: body.company.url || ''
        }
    });

    await dbOAuthApp.save();

    const app = await transformDbOAuthApp({ dbOAuthApp, cryptor });

    return { ok: true, app };
  }
];
