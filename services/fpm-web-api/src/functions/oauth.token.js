const log = require('@fpm/logging').default;
const { createError } = require('../utils/error');
const { args, method, rateLimit } = require('../utils/http');

module.exports = [
  method('GET'),
  args('client_id', 'client_secret', 'refresh_token'),
  rateLimit(),
  async req => {
    const { query: { client_id, client_secret, refresh_token }, deps: { hydra } } = req;

    let token;
    try {
      token = await hydra.createAccessToken({ refresh_token, client_id, client_secret });
    } catch (e) {
      const { error, error_description, response } = e;
      log.error('Failed to use refresh token to generate new access token', {
        client_id,
        response,
        stack: !error && e.stack,
        error: !error && e
      });
      if (error === 'invalid_client' || error === 'invalid_request') {
        return createError(error, error_description);
      }
      return createError('internal_error', 'Refresh token grant failure');
    }

    token.ok = true;

    return token;
  }
];
