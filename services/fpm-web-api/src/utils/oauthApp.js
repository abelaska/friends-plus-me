/* eslint no-unused-vars: "off", no-multi-assign: "off" */
const Promise = require('bluebird');
const log = require('@fpm/logging').default;
const { ObjectId, dbUpdatedCount, OAuthApp, OAuthAppUser } = require('@fpm/db');
const { States, Types } = require('@fpm/constants');
const { unix } = require('../utils/time');
const { scheduleDays } = require('../utils/scheduling');
const { twoDigits } = require('../utils/text');

const fetchOAuthApp = (module.exports.fetchOAuthApp = async ({ query, app, user }) => {
  const oauthAppId = ObjectId.isValid((query && query.app) || app) && ((query && query.app) || app);
  return oauthAppId && OAuthApp.findOne({ _id: oauthAppId, createdBy: user._id }).exec();
});

const deleteOAuthApp = (module.exports.deleteOAuthApp = async dbOAuthApp => {
  await OAuthAppUser.remove({ aid: dbOAuthApp._id });
  return dbUpdatedCount(await OAuthApp.remove({ _id: dbOAuthApp._id })) > 0;
});

const oauthAppUsersCount = async ({ clientId }) => OAuthAppUser.count({ clientId }).exec();

const transformDbOAuthApp = (module.exports.transformDbOAuthApp = async ({ dbOAuthApp, cryptor }) => ({
  app_id: dbOAuthApp._id.toString(),
  name: dbOAuthApp.name,
  description: dbOAuthApp.description,
  url: dbOAuthApp.url,
  picture: dbOAuthApp.picture,
  client_id: dbOAuthApp.clientId,
  client_secret: cryptor.decrypt(dbOAuthApp.clientSecret),
  callbacks: dbOAuthApp.callbacks,
  created: unix(dbOAuthApp.createdAt),
  updated: unix(dbOAuthApp.updatedAt),
  created_by: dbOAuthApp.createdBy && {
    user_id: dbOAuthApp.createdBy.toString()
  },
  company: dbOAuthApp.company && {
    name: dbOAuthApp.company.name,
    url: dbOAuthApp.company.url
  },
  users: await oauthAppUsersCount(dbOAuthApp)
}));
