/* eslint no-case-declarations: "off" */
const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { OAuthApp, OAuthAppUser, User } = require('@fpm/db');
const { Scopes } = require('@fpm/constants');
const { sendError, args } = require('../http');
const { jwkSecret, jwkDecode, jwtVerify } = require('../jwk');

module.exports = [
  args('client_id', 'auth0_id_token', 'challenge'),
  async (req, res, next) => {
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

    const dbUser = await User.findOne({ auth0Id: dtoken.payload.sub }, '_id state').exec();
    if (!dbUser) {
      return sendError(res, 401, 'user_not_found');
    }
    if (!dbUser.isEnabled) {
      return sendError(res, 401, 'user_inactive');
    }

    const dbOAuthApp = await OAuthApp.findOne({ clientId: client_id }, '_id').exec();
    if (!dbOAuthApp) {
      return sendError(res, 401, 'app_not_found');
    }

    const scope = Scopes.validScope(decodedChallenge.scp, client_id);
    const scopes = Scopes.scopeToArray(scope);

    await OAuthAppUser.update({ clientId: client_id, uid: dbUser._id }, { $set: { scope } }, { upsert: true });

    const consent = await hydra.generateConsentResponse(decodedChallenge, dbUser._id.toString(), scopes, {}, {}, false);

    res.json({
      ok: true,
      consent
    });
  }
];
