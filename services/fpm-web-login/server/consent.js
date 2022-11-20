const { OAuthApp, OAuthAppUser, User } = require('@fpm/db');
const { Scopes } = require('@fpm/constants');
const { sendError, signOut } = require('./http');

const prepareConsent = async (req, res, { decodedChallenge, clientId, userQuery, impersonate }) => {
  const { hydra } = req.deps;

  const dbUser = await User.findOne(userQuery, '_id state name image locale role').exec();
  if (!dbUser) {
    signOut(req);
    sendError(res, 401, 'user_not_found');
    return { end: true };
  }
  if (!dbUser.isEnabled) {
    signOut(req);
    sendError(res, 401, 'user_inactive');
    return { end: true };
  }

  req.cookieAuth.sub = dbUser._id.toString();

  const dbOAuthApp = await OAuthApp.findOne({ clientId }, '_id name description url picture company').exec();
  if (!dbOAuthApp) {
    sendError(res, 401, 'app_not_found');
    return { end: true };
  }

  const dbOAuthAppUser = await OAuthAppUser.findOne({ clientId, uid: dbUser._id }, 'scope').exec();

  const requestedScopes = Scopes.validScopeArray(decodedChallenge.scp, clientId);
  const grantedScopes = Scopes.scopeToArray(dbOAuthAppUser && dbOAuthAppUser.scope);
  const additionalScopes = requestedScopes.filter(s => grantedScopes.indexOf(s) === -1);

  const consentUserId = (dbUser.role === 'admin' && impersonate) || dbUser._id.toString();

  const consent =
    !additionalScopes.length &&
    (await hydra.generateConsentResponse(decodedChallenge, consentUserId, requestedScopes, {}, {}, false));

  return {
    consent,
    decodedChallenge,
    requestedScopes,
    additionalScopes,
    grantedScopes,
    dbUser,
    dbOAuthApp,
    dbOAuthAppUser
  };
};
module.exports.prepareConsent = prepareConsent;
