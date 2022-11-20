/* eslint camelcase: "off" */
const { dbUpdatedCount, OAuthAppUser } = require('@fpm/db');
const { oauth } = require('../utils/oauth');
const { method, rateLimit } = require('../utils/http');

module.exports = [
  method('GET'),
  oauth(),
  rateLimit(),
  async req => {
    const { user, token: { client_id } } = req;

    const deauthorized = dbUpdatedCount(await OAuthAppUser.remove({ clientId: client_id, uid: user._id })) > 0;

    return { ok: true, deauthorized };
  }
];
