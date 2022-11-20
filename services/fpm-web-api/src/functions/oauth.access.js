const log = require('@fpm/logging').default;
const { User, OAuthAppUser } = require('@fpm/db');
const { createError } = require('../utils/error');
const { args, method, rateLimit } = require('../utils/http');
const { getTokenUserId } = require('../utils/oauth');

module.exports = [
  method('GET'),
  args('client_id', 'client_secret', 'code', 'redirect_uri'),
  rateLimit(),
  async req => {
    const { query: { client_id, client_secret, code, redirect_uri }, deps: { hydra } } = req;

    let token;
    try {
      token = await hydra.authorizationCodeToAccessToken({ code, redirect_uri, client_id, client_secret });
    } catch (e) {
      const { error, error_description, response } = e;
      log.error('Failed to convert authorization code to access token', {
        client_id,
        redirect_uri,
        response,
        stack: !error && e.stack,
        error: !error && e
      });
      if (error === 'invalid_client' || error === 'invalid_request') {
        return createError(error, error_description);
      }
      return createError('internal_error', 'Authorization code grant failure');
    }

    const accessToken = token && token.access_token;
    if (!accessToken) {
      return createError('invalid_grant', 'Unknown or invalid authorization code.');
    }

    const userId = await getTokenUserId({ hydra, token: accessToken });

    const user = userId && (await User.findById(userId, '_id state name').exec());
    if (!user) {
      return createError('user_not_found');
    }
    if (!user.isEnabled) {
      return createError('user_inactive');
    }

    await OAuthAppUser.update(
      { clientId: client_id, uid: user._id },
      { $set: { scope: token.scope || '' } },
      { upsert: true }
    );

    token.ok = true;

    return token;
  }
];
