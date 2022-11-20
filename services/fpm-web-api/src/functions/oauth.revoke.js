const log = require('@fpm/logging').default;
const { createError } = require('../utils/error');
const { args, method, rateLimit } = require('../utils/http');

module.exports = [
  method('GET'),
  args('client_id', 'client_secret', 'refresh_token'),
  rateLimit(),
  async req => {
    const { query: { client_id, client_secret, refresh_token }, deps: { hydra } } = req;

    try {
      await hydra.revokeRefreshToken({ client_id, client_secret, refresh_token });
    } catch (e) {
      const { error, response } = e;
      log.error('Failed to revoke refresh token', {
        client_id,
        response,
        stack: !error && e.stack,
        error: !error && e
      });
      return createError('internal_error', 'Refresh token revoke failure');
    }

    return { ok: true, revoked: true };
  }
];
