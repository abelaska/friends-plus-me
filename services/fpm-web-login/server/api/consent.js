/* eslint no-case-declarations: "off" */
const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { sendError, args } = require('../http');
const { jwkSecret, jwkDecode, jwtVerify } = require('../jwk');
const { prepareConsent } = require('../consent');

const transformApp = dbOAuthApp => ({
  name: dbOAuthApp.name,
  description: dbOAuthApp.description,
  url: dbOAuthApp.url,
  picture: dbOAuthApp.picture,
  company:
    (dbOAuthApp.company &&
      dbOAuthApp.company.name && {
        name: dbOAuthApp.company.name,
        url: dbOAuthApp.company.url
      }) ||
    undefined
});

const transformUser = dbUser => ({
  name: dbUser.name,
  picture: dbUser.image,
  locale: dbUser.locale
});

module.exports = [
  args('client_id', 'challenge', 'auth0_id_token'),
  async (req, res) => {
    const { deps: { hydra }, query: { client_id, auth0_id_token, challenge } } = req;

    let decodedChallenge;
    try {
      decodedChallenge = await hydra.verifyConsentChallenge(challenge, false);
    } catch (e) {
      return sendError(res, 401, 'invalid_challenge');
    }

    const dtoken = jwkDecode(auth0_id_token);
    if (!dtoken) {
      return sendError(res, 401, 'invalid_auth');
    }

    let auth0Secret;
    try {
      auth0Secret = await jwkSecret(dtoken);
    } catch (e) {
      log.error('jwkSecret failure', { stack: e.stack, error: e });
      return sendError(res, 401, 'invalid_auth');
    }

    try {
      await jwtVerify(auth0_id_token, auth0Secret, {
        issuer: `https://${config.get('auth0:domain')}/`,
        algorithms: ['RS256']
      });
    } catch (e) {
      log.error('jwtVerify failure', { stack: e.stack, error: e });
      return sendError(res, 401, 'invalid_auth');
    }

    const { consent, end, additionalScopes, grantedScopes, dbOAuthApp, dbUser } = await prepareConsent(req, res, {
      decodedChallenge,
      clientId: client_id,
      userQuery: { auth0Id: dtoken.payload.sub }
    });
    if (end) {
      return undefined;
    }

    return res.json({
      ok: true,
      consent,
      consent_required: additionalScopes.length > 0,
      granted_scopes: grantedScopes,
      additional_scopes: additionalScopes,
      app: transformApp(dbOAuthApp),
      user: transformUser(dbUser)
    });
  }
];
