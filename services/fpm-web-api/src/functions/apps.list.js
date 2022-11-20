/* eslint no-case-declarations: "off" */
const Promise = require('bluebird');
const { OAuthApp } = require('@fpm/db');
const { oauth, scopes } = require('../utils/oauth');
const { method, rateLimit } = require('../utils/http');
const { transformDbOAuthApp } = require('../utils/oauthApp');

module.exports = [
  method('GET'),
  oauth(),
  scopes('apps', 'apps.read'),
  rateLimit(),
  async req => {
    const { user, deps: { cryptor } } = req;

    const dbOAuthApps = await OAuthApp.find({ createdBy: user._id }).exec();

    const apps = await Promise.map(dbOAuthApps, dbOAuthApp => transformDbOAuthApp({ dbOAuthApp, cryptor }));

    return { ok: true, apps };
  }
];
