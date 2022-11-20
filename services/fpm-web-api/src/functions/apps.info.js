/* eslint no-case-declarations: "off" */
const { oauth, scopes } = require('../utils/oauth');
const { createError } = require('../utils/error');
const { method, args, rateLimit } = require('../utils/http');
const { transformDbOAuthApp, fetchOAuthApp } = require('../utils/oauthApp');

module.exports = [
  method('GET'),
  args('app'),
  oauth(),
  scopes('apps', 'apps.read'),
  rateLimit(),
  async req => {
    const { user, query, deps: { cryptor } } = req;

    const dbOAuthApp = await fetchOAuthApp({ query, user });
    if (!dbOAuthApp) {
      return createError('app_not_found');
    }

    const app = await transformDbOAuthApp({ dbOAuthApp, cryptor });

    return { ok: true, app };
  }
];
