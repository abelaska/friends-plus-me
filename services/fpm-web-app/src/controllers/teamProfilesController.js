const { createRedisClient } = require('@fpm/redis');
const log = require('@fpm/logging').default;
const config = require('@fpm/config');
const { Types } = require('@fpm/constants');
const { providers } = require('@fpm/grant');
const tools = require('../lib/tools');
const auth = require('../lib/auth');

module.exports = ({ router, googleTokens }) => {

  const redis = createRedisClient(config, { detect_buffers: true });

  const decryptToken = token => {
    try {
      return token && googleTokens.oAuthTokenCryptor.decrypt(token);
    } catch (e) {
      return token;
    }
  };

  const decryptProfileOAuth = profile => {
    if (profile.network === Types.network.google.code) {
      return googleTokens.getPlainAccessTokenForAccount(profile).then(token => ({ token }));
    }
    const token = profile.oauth && decryptToken(profile.oauth.token);
    const secret = profile.oauth && decryptToken(profile.oauth.secret);
    return Promise.resolve({ token, secret });
  };

  const keyCached = profile => `socialprofile:${profile.network}:${profile.uid}:accounts`;

  const setCachedReply = ({ profile, reply }) => {
    return new Promise((resolve, reject) => {
      redis.setex(keyCached(profile), 1 * 60 * 60, JSON.stringify(reply), error => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  };

  const getCachedReply = profile => {
    return new Promise((resolve, reject) => {
      redis.get(keyCached(profile), (error, json) => {
        if (error) {
          return reject(error);
        }
        let data;
        try {
          data = json && JSON.parse(json);
        } catch (e) {
          //
        }
        return resolve(data);
      });
    });
  };

  const catchError = (type, res) => error => {
    log.error(`Social account ${type} list failure`, { message: error.toString(), url: error.url, statusCode: error.statusCode });
    res.json({ });
  };

  const cacheAndSendReply = (res, profile) => reply => {
    return setCachedReply({ profile, reply }).then(() => res.json(reply));
  };

  const list = ({ provider, res, token, secret, profile, refresh }) => {
    const query = { token, secret, uid: profile.uid, parentUid: profile.parentUid };
    if (refresh) {
      return providers[provider].normalizedList(query)
        .then(cacheAndSendReply(res, profile))
        .catch(catchError(provider, res));
    }
    return getCachedReply(profile).then(reply => {
      if (reply) {
        return res.json(reply);
      }
      return providers[provider].normalizedList(query)
        .then(cacheAndSendReply(res, profile))
        .catch(catchError(provider, res));
    })
    .catch(error => log.error(`Failed to fetch cached social account ${provider} list reply`, {
      message: error.toString(),
      error
    }));
  };

  // { boards: [{ id, name, image, url }, ...],
  //   blogs: [{ id, name, image, url, meta: { isPrivate } }, ...] }
  router.get('/1/team/:teamId/profiles/:profileId/accounts', tools.tokenRequired, (req, res) => {
    const { teamId, profileId } = req.params || {};
    const refresh = req.query.refresh === '1';
    auth.rest.onlyProfileManager(res, req.user, teamId, (user, team) => {
      // fixed reduce
      const profile = team.profiles.filter(p => p._id.toString() === profileId).reduce((r, v) => !r && v, null);
      if (!profile) {
        return res.status(400).json({ error: { message: 'Queue not found!' } });
      }
      decryptProfileOAuth(profile).then(({ token, secret }) => {
        const provider = Types.networkTypeName(profile.network);
        return list({ provider, res, token, secret, profile, refresh });
      }).catch(error => {
        log.error('Failed to decrypto profile oauth', {
          teamId,
          profileId,
          message: error.toString(),
          error
        });
        res.status(500).json({ error: { message: 'OAuth decryption failure!' } });
      });
    }, '_id use members profiles');
  });
};
