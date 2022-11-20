/* jshint node: true */
/* jshint -W064, -W106 */
'use strict';

const config = require('@fpm/config');
const { Auth0Mgmt } = require('@fpm/auth0');
const { CacheRedis } = require('@fpm/cache-redis');
const { OAuthTokenCryptor } = require('@fpm/token');
const rp = require('request-promise');

const cryptor = new OAuthTokenCryptor();
const cache = new CacheRedis({ cryptor, config });
const manager = new Auth0Mgmt({ cache });

function createAccessToken(form) {
  return rp({
    method: 'POST',
    url: `https://${config.get('auth0:domain')}/oauth/token`,
    form,
    json: true
  });
}

function createAccessTokenMgmt() {
  return createAccessToken({
    grant_type: 'client_credentials',
    audience: `https://${config.get('auth0:domain')}/api/v2/`,
    client_id: config.get('auth0:clientId'),
    client_secret: config.get('auth0:clientSecret')
  });
}

function blockUser(auth0user) {
  return createAccessTokenMgmt().then(function(accessToken) {
    return rp({
      method: 'PATCH',
      url: `https://${config.get('auth0:domain')}/api/v2/users/${auth0user}`,
      body: {
        blocked: true
      },
      headers: {
        Authorization: `Bearer ${accessToken.access_token}`
      },
      json: true
    });
  });
}

function userInfoByAccessToken(accessToken, fields) {
  const qs = fields && { fields: fields.join(',') };
  return rp({
    url: `https://${config.get('auth0:domain')}/userinfo`,
    qs: Object.assign(
      {
        access_token: accessToken
      },
      qs
    ),
    json: true
  });
}

function createAccessTokenUser(code) {
  return rp({
    method: 'POST',
    url: `https://${config.get('auth0:domain')}/oauth/token`,
    form: {
      code,
      grant_type: 'authorization_code',
      client_id: config.get('auth0:clientId'),
      client_secret: config.get('auth0:clientSecret'),
      redirect_uri: config.get('http:landingpage:signin')
    },
    json: true
  });
}

module.exports = {
  manager,
  blockUser,
  userInfoByAccessToken,
  createAccessTokenUser,
};
