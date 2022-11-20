// @flow
import Promise from 'bluebird';
import rp from 'request-promise';
import config from '@fpm/config';
import log from '@fpm/logging';

class Auth0Mgmt {
  cache: ?Object;
  domain: string;
  cacheKeyAccessTokenMgmt: string;

  constructor({ cache }: Object = {}) {
    this.cache = cache;
    this.domain = config.get('auth0:domain');
    this.cacheKeyAccessTokenMgmt = 'auth0:mgmt:at';
  }

  extractError(e: ?Object) {
    const response = e && e.response && e.response.toJSON && e.response.toJSON();
    const body = response && response.body;
    const { error, error_description } = body || {};
    return { response, body, error, error_description };
  }

  async getAccessTokenMgmt() {
    let accessToken;
    if (this.cache) {
      accessToken = await this.cache.get(this.cacheKeyAccessTokenMgmt);
    }
    if (!accessToken) {
      const token = await this.createAccessTokenMgmt();
      accessToken = token && token.access_token;
      if (token && this.cache) {
        await this.cache.set(this.cacheKeyAccessTokenMgmt, accessToken, token.expires_in || 1 * 60 * 60);
      }
    }
    return accessToken;
  }

  async listGrants(userId: string, fields: ?Array<string>) {
    let tm = new Date();
    const accessToken = await this.getAccessTokenMgmt();
    const qs = Object.assign({}, (fields && { fields: fields.join(',') }) || {}, { user_id: userId });
    const grants = await rp({
      url: `https://${this.domain}/api/v2/grants`,
      qs,
      headers: {
        authorization: `Bearer ${accessToken}`
      },
      json: true
    });
    tm = new Date() - tm;
    log.debug(`Auth0Management:listGrants ${tm}ms`);
    return grants;
  }

  async deleteGrant(grantId: string, fields: ?Array<string>) {
    let tm = new Date();
    const accessToken = await this.getAccessTokenMgmt();
    const qs = (fields && { fields: fields.join(',') }) || {};
    const reply = await rp({
      method: 'DELETE',
      url: `https://${this.domain}/api/v2/grants/${grantId}`,
      qs,
      headers: {
        authorization: `Bearer ${accessToken}`
      },
      json: true
    });
    tm = new Date() - tm;
    log.debug(`Auth0Management:deleteGrant ${tm}ms`);
    return reply;
  }

  async findUsers(query: string, fields: ?Array<string>) {
    let tm = new Date();
    const accessToken = await this.getAccessTokenMgmt();
    const qs = {};
    if (query) {
      qs.q = query;
    }
    if (fields) {
      qs.fields = fields.join(',');
    }
    const users = await rp({
      url: `https://${this.domain}/api/v2/users`,
      qs,
      headers: {
        authorization: `Bearer ${accessToken}`
      },
      json: true
    });
    tm = new Date() - tm;
    log.debug(`Auth0Management:findUser ${tm}ms`);
    return users;
  }

  async blockUser(userId: string) {
    let tm = new Date();
    const accessToken = await this.getAccessTokenMgmt();
    const result = await rp({
      method: 'PATCH',
      url: `https://${this.domain}/api/v2/users/${userId}`,
      body: {
        blocked: true
      },
      headers: {
        authorization: `Bearer ${accessToken}`
      },
      json: true
    });
    tm = new Date() - tm;
    log.debug(`Auth0Management:blockUser ${tm}ms`);
    return result;
  }

  async updateUser(userId: string, body: Object) {
    let tm = new Date();
    const accessToken = await this.getAccessTokenMgmt();
    const result = await rp({
      method: 'PATCH',
      url: `https://${this.domain}/api/v2/users/${userId}`,
      body,
      headers: {
        authorization: `Bearer ${accessToken}`
      },
      json: true
    });
    tm = new Date() - tm;
    log.debug(`Auth0Management:updateUser ${tm}ms`);
    return result;
  }

  async blockUserByEmail(email: string) {
    const list = (await this.findUsers(`email:"${email}"`, ['user_id'])) || [];
    return Promise.map(list, async user => this.blockUser(user.user_id));
  }

  async userInfoByUserId(userId: string, fields: ?Array<string>) {
    let tm = new Date();
    const accessToken = await this.getAccessTokenMgmt();
    const qs = fields && { fields: fields.join(',') };
    const userinfo = await rp({
      url: `https://${this.domain}/api/v2/users/${userId}`,
      qs,
      headers: {
        authorization: `Bearer ${accessToken}`
      },
      json: true
    });
    tm = new Date() - tm;
    log.debug(`Auth0Management:userInfoByUserId ${tm}ms`);
    return userinfo;
  }

  async resendVerificationEmail(userId: string) {
    let tm = new Date();
    const accessToken = await this.getAccessTokenMgmt();
    const reply = await rp({
      method: 'POST',
      json: true,
      url: `https://${this.domain}/api/v2/jobs/verification-email`,
      headers: {
        authorization: `Bearer ${accessToken}`
      },
      body: {
        user_id: userId
      }
    });
    tm = new Date() - tm;
    log.debug(`Auth0Management:resendVerificationEmail ${tm}ms`);
    return reply;
  }

  async listApplications() {
    let tm = new Date();
    const accessToken = await this.getAccessTokenMgmt();
    const reply = await rp({
      json: true,
      url: `https://${this.domain}/api/v2/clients`,
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });
    tm = new Date() - tm;
    log.debug(`Auth0Management:listApplications ${tm}ms`);
    return reply;
  }

  async registerApplication(body: Object) {
    let tm = new Date();
    const accessToken = await this.getAccessTokenMgmt();
    const reply = await rp({
      method: 'POST',
      json: true,
      url: `https://${this.domain}/api/v2/clients`,
      headers: {
        authorization: `Bearer ${accessToken}`
      },
      body
    });
    tm = new Date() - tm;
    log.debug(`Auth0Management:registerApplication ${tm}ms`);
    return reply;
  }

  async updateApplication(clientId: string, body: Object) {
    let tm = new Date();
    const accessToken = await this.getAccessTokenMgmt();
    const reply = await rp({
      method: 'PATCH',
      json: true,
      url: `https://${this.domain}/api/v2/clients/${clientId}`,
      headers: {
        authorization: `Bearer ${accessToken}`
      },
      body
    });
    tm = new Date() - tm;
    log.debug(`Auth0Management:updateApplication ${tm}ms`);
    return reply;
  }

  async removeApplication(clientId: string) {
    let tm = new Date();
    const accessToken = await this.getAccessTokenMgmt();
    const reply = await rp({
      method: 'DELETE',
      json: true,
      url: `https://${this.domain}/api/v2/clients/${clientId}`,
      headers: {
        authorization: `Bearer ${accessToken}`
      },
      body: {}
    });
    tm = new Date() - tm;
    log.debug(`Auth0Management:removeApplication ${tm}ms`);
    return reply;
  }

  async rotateApplicationSecret(clientId: string) {
    let tm = new Date();
    const accessToken = await this.getAccessTokenMgmt();
    const reply = await rp({
      method: 'POST',
      json: true,
      url: `https://${this.domain}/api/v2/clients/${clientId}/rotate-secret`,
      headers: {
        authorization: `Bearer ${accessToken}`
      },
      body: {}
    });
    tm = new Date() - tm;
    log.debug(`Auth0Management:rotateApplicationSecret ${tm}ms`);
    return reply;
  }

  async userInfoByAccessToken(accessToken: string, fields: ?Array<string>) {
    let tm = new Date();
    const qs: ?Object = fields && { fields: fields.join(',') };
    const userinfo: Object = await rp({
      url: `https://${this.domain}/userinfo`,
      qs: Object.assign(
        {
          access_token: accessToken
        },
        qs
      ),
      json: true
    });
    tm = new Date() - tm;
    log.debug(`Auth0Management:userInfoByAccesstoken ${tm}ms`);
    return userinfo;
  }

  async revokeRefreshToken(refreshToken: string, clientId: ?string, clientSecret: ?string) {
    let tm = new Date();
    const reply: Object = await rp({
      method: 'POST',
      url: `https://${this.domain}/oauth/revoke`,
      form: {
        token: refreshToken,
        client_id: clientId || config.get('auth0:clientId'),
        client_secret: clientSecret || config.get('auth0:clientSecret')
      },
      json: true
    });
    tm = new Date() - tm;
    log.debug(`Auth0Management:revokeRefreshToken ${tm}ms`);
    return reply;
  }

  async createAccessTokenUser(code: string, redirectUri?: ?string) {
    return this.createAccessToken({
      code,
      grant_type: 'authorization_code',
      client_id: config.get('auth0:clientId'),
      client_secret: config.get('auth0:clientSecret'),
      redirect_uri: redirectUri || config.get('http:landingpage:signin')
    });
  }

  async refreshAccessTokenUser(refreshToken: string, scope: ?string = 'openid') {
    return this.createAccessToken({
      scope,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      client_id: config.get('auth0:clientId'),
      client_secret: config.get('auth0:clientSecret')
    });
  }

  async createAccessTokenMgmt() {
    return this.createAccessToken({
      grant_type: 'client_credentials',
      audience: `https://${this.domain}/api/v2/`,
      client_id: config.get('auth0:clientId'),
      client_secret: config.get('auth0:clientSecret')
    });
  }

  async createAccessToken(form: Object = {}) {
    let tm = new Date();
    const token = await rp({
      method: 'POST',
      url: `https://${this.domain}/oauth/token`,
      form,
      json: true
    });
    tm = new Date() - tm;
    log.debug(`Auth0Management:createAccessToken ${tm}ms`);
    return token;
  }
}

export default Auth0Mgmt;
