/* jshint node: true */
/* jshint -W064, -W106 */

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const qs = require('querystring');
const { ObjectId, User, Profile } = require('@fpm/db');
// const async = require('async');
// const { createRedisClient } = require('@fpm/redis');
const tools = require('../lib/tools');
const SaaS = require('../lib/SaaS');

const saas = new SaaS();

// const host = config.get('instance-id');
// const redis = createRedisClient(config, { detect_buffers: true });

module.exports = ({ router, ssoSessionManager }) => {
  router.get('/1/sso/token', tools.tokenRequired, (req, res) => {
    const { user, session: { ssoSessionId } = {} } = req;
    if (!ssoSessionId) {
      return res.status(401).json({ access_token: null, expires_in: null });
    }
    return ssoSessionManager
      .accessToken(ssoSessionId)
      .then(() =>
        ssoSessionManager.get(ssoSessionId).then(ssoSession => {
          return res.json({
            access_token: ssoSession.accessToken,
            expires_in:
              (ssoSession.atExpiresAt &&
                Math.floor((ssoSession.atExpiresAt.valueOf() - new Date().valueOf()) / 1000)) ||
              0
          });
        })
      )
      .catch(err => {
        log.error('Failed to get sso session access token', {
          userId: user._id.toString(),
          message: err.toString(),
          stack: err.stack
        });
        return res.status(401).json({ access_token: null, expires_in: null });
      });
  });

  router.get('/1/auth/verify', tools.tokenRequired, (req, res) => {
    const user = req.user;
    const token = req.encryptToken(
      {
        uid: user._id.toString()
      },
      config.get('token:expiresInSeconds') * 1000
    );
    const plainToken = req.decryptToken(token);
    req.session.fpmetoken = token;
    res.json({
      token,
      expiresAt: plainToken.expires
    });
  });

  router.post('/1/auth/switch', tools.adminRequired, (req, res) => {
    const authUrl = impersonate =>
      `https://api.friendsplus.me/oauth.authorize?${qs.stringify({
        prompt: 'none',
        response_type: 'code',
        state: JSON.stringify({ impersonate, nonce: new Date().valueOf() }),
        client_id: config.get('fpm:app:clientId'),
        redirect_uri: `${config.get('http:ui:url')}/signin`,
        scope: (config.get('fpm:app:scopes') || []).join(' ')
      })}`;

    const filter = req.body;
    if (filter.pid) {
      return Profile.findOne({ _id: new ObjectId(filter.pid) }, (error, profile) => {
        if (error) {
          log.error('Failed to load user profile from database', { message: error.toString(), error });
          return res.status(500).json({ error: { message: 'Failed to find profile' } });
        }
        if (!profile) {
          return res.status(404).json({ error: { message: 'Profile not found' } });
        }
        const uid = profile.members.owner[0].toString();
        // req.session.isAuthSwitch = true;
        // req.session.fpmetoken = req.encryptToken({ uid }, config.get('token:expiresInSeconds') * 1000);
        return res.json({ success: true, url: authUrl(uid) });
      });
    }

    return User.findOne(filter, (err, user) => {
      if (err) {
        log.error('Failed to load user profile from database', { error: err });
        return res.status(500).end();
      }
      if (user) {
        const uid = user._id.toString();
        // req.session.isAuthSwitch = true;
        // req.session.fpmetoken = req.encryptToken(
        //   {
        //     uid: user._id.toString()
        //   },
        //   config.get('token:expiresInSeconds') * 1000
        // );
        return res.json({ success: true, url: authUrl(uid) });
      }
      return res.status(404).json({ error: { message: 'User not found' } });
    });
  });

  router.get('/1/saas', tools.adminRequired, (req, res) => {
    saas.calculate((err, data, tm, times) => {
      if (err) {
        log.error('Failed to calculate SaaS metrics', { error: err });
        res.status(500).end();
      } else {
        log.debug(`Calculates SaaS metrics in ${tm}ms`, { times });
        res.json(data);
      }
    });
  });

  // router.get('/1/check', (req, res) => res.json({ host }));
  // router.get('/1/ping', (req, res) => {
  //   async.parallel(
  //     {
  //       mongodb: cb => User.findById(ObjectId(), '_id', err => cb(null, err || false)),
  //       redis: cb => redis.set('ping', 'pong', err => cb(null, err || false))
  //     },
  //     (err, results) => {
  //       const ok = !results.mongodb && !results.redis;
  //       if (!ok) {
  //         log.warn('PING not ok', results);
  //       }
  //       res.status(ok ? 200 : 500).json({
  //         ok,
  //         host,
  //         message: 'pong',
  //         ready: {
  //           mongodb: !results.mongodb,
  //           redis: !results.redis
  //         }
  //       });
  //     }
  //   );
  // });
};
