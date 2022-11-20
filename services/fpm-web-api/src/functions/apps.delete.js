/* eslint no-case-declarations: "off" */
const log = require('@fpm/logging').default;
const { oauth, scopes } = require('../utils/oauth');
const { createError } = require('../utils/error');
const { args, method, rateLimit } = require('../utils/http');
const { deleteOAuthApp, fetchOAuthApp } = require('../utils/oauthApp');

module.exports = [
  method('GET'),
  args('app'),
  oauth(),
  scopes('apps', 'apps.write'),
  rateLimit(),
  async req => {
    const { query, user, deps: { hydra } } = req;

    const dbOAuthApp = await fetchOAuthApp({ query, user });
    if (!dbOAuthApp) {
      return createError('app_not_found');
    }

    try {
      await hydra.deleteClient(dbOAuthApp.clientId);
    } catch (e) {
      const { error, response } = e;
      log.error('Failed to remove oauth application', {
        clientId: dbOAuthApp.clientId,
        userId: user._id.toString(),
        response,
        stack: !error && e.stack,
        error: !error && e
      });
      return createError('internal_error', 'App removal failure');
    }

    const deleted = await deleteOAuthApp(dbOAuthApp);

    return { ok: true, deleted };
  }
];
