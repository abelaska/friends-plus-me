const getHost = require('../utils/host');
const log = require('@fpm/logging').default;

const auth0CodeToIdToken = () => async (req, res, next) => {
  const { deps: { auth0 }, query: { code } = {} } = req;

  if (!code) {
    return next();
  }

  try {
    const redirectUrl = `${getHost(req)}${req.path}`;
    const { id_token: idToken } = await auth0.createAccessTokenUser(code, redirectUrl);
    req.idToken = idToken;
    req.challenge = req.cookieAuth.challenge;
    req.cookieAuth.challenge = null;
  } catch (e) {
    log.error('Failed to convert auth0 code to id token', { message: e.message, stack: e.stack });
  }

  return next();
};
module.exports.auth0CodeToIdToken = auth0CodeToIdToken;
