const qs = require('querystring');
const config = require('@fpm/config');
const { Scopes } = require('@fpm/constants');
const { args, method, redirect, rateLimit } = require('../utils/http');

module.exports = [
  method('GET'),
  args('client_id', 'response_type', 'redirect_uri'),
  rateLimit(),
  async (req, res) => {
    const { query } = req;

    const q = {
      client_id: query.client_id,
      response_type: query.response_type,
      scope: Scopes.validScope(query.scope, query.client_id) || 'admin offline',
      redirect_uri: query.redirect_uri
    };

    if (query.prompt) {
      q.prompt = query.prompt;
    }

    if (query.nonce) {
      q.nonce = query.nonce;
    }

    if (query.state) {
      q.state = query.state;
    }

    const url = `${config.get('hydra:url')}/oauth2/auth?${qs.stringify(q)}`;

    redirect(res, 302, url);
  }
];
