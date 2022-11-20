/* eslint no-case-declarations: "off" */
const log = require('@fpm/logging').default;
const { oauth, scopes } = require('../utils/oauth');
const { createError } = require('../utils/error');
const { args, method, rateLimit } = require('../utils/http');
const { transformDbOAuthApp, fetchOAuthApp } = require('../utils/oauthApp');
const { newClientSecret } = require('../utils/text');

module.exports = [
  method('GET'),
  args('app'),
  oauth(),
  scopes('apps', 'apps.write'),
  rateLimit(),
  async req => {
    const { query, user, deps: { hydra, cryptor } } = req;

    const dbOAuthApp = await fetchOAuthApp({ query, user });
    if (!dbOAuthApp) {
      return createError('app_not_found');
    }

    const clientSecret = newClientSecret();

    try {
      const client = await hydra.fetchClient(dbOAuthApp.clientId);
      client.client_secret = clientSecret;
      await hydra.updateClient(dbOAuthApp.clientId, client);
    } catch (e) {
      const { error, response } = e;
      log.error('Failed to rotate oauth application secret', {
        clientId: dbOAuthApp.clientId,
        userId: user._id.toString(),
        response,
        stack: !error && e.stack,
        error: !error && e
      });
      return createError('internal_error', 'App secret rotation failure');
    }

    dbOAuthApp.clientSecret = cryptor.encrypt(clientSecret);
    await dbOAuthApp.save();

    const app = await transformDbOAuthApp({ dbOAuthApp, cryptor });

    return { ok: true, app };
  }
];
