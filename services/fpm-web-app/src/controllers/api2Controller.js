/* jshint node: true */
/* jshint -W064, -W106 */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { States } = require('@fpm/constants');
const { ObjectId, User } = require('@fpm/db');
const async = require('async');
const express = require('express');
// const { createRedisClient } = require('@fpm/redis');
const image = require('../lib/image');
const auth0 = require('../lib/auth0');
const google = require('../lib/google');
const tools = require('../lib/tools');
const { graphqlExpress, graphiqlExpress } = require('graphql-server-express');
const schema = require('../lib/graphql/schema');

// const host = config.get('instance-id');
// const redis = createRedisClient(config, { detect_buffers: true });

const api2 = (app, postManager) => {
  const router = express.Router();
  app.use('/2', router);

  //////////////////////////////////////////////////////////////////////////////////////////////////
  router.get('/photo/sign', tools.tokenOptional, (req, res) => {
    const contentType = req.query.contentType || '';
    image.signedUploadUrl({ contentType, user: req.user }, (error, data) => {
      if (error) {
        log.error('Failed to prepare signed url for photo upload', { error });
        return res.status(500).json({ error: { message: 'Failed to prepare signed url for photo upload' } });
      }
      // quick fix
      data.url = decodeURIComponent(data.uploadUrl.split('?')[0]);
      res.json(data);
    });
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  function getGoogleIdentityId(body) {
    var googleIdentities = body &&
      body.identities &&
      body.identities.length &&
      body.identities.filter(function(i) {
        return i.provider === 'google-oauth2';
      });
    var googleIdentity = googleIdentities && googleIdentities.length && googleIdentities[0];
    var actorId = googleIdentity && googleIdentity.user_id;
    return actorId;
  }

  router.post('/auth/xchg/auth0', (req, res) => {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: { message: 'Token is missing' } });
    }
    // log.debug('/auth/xchg/auth0 0', { token });

    auth0
      .userInfoByAccessToken(token)
      .then(function(body) {
        // log.debug('/auth/xchg/auth0 1', { body });
        var actorId = getGoogleIdentityId(body);
        var auth0Id = body.user_id;
        async.parallel(
          [
            function(cb) {
              if (actorId) {
                User.findOne({ actorId: actorId }, cb);
              } else {
                cb();
              }
            },
            function(cb) {
              if (auth0Id) {
                User.findOne({ auth0Id: auth0Id }, cb);
              } else {
                cb();
              }
            }
          ],
          function(error, results) {
            if (error) {
              log.error('Failed to load user profile from database', { error });
            }

            const user = results && results.length && (results[0] || results[1]);

            // log.debug('/auth/xchg/auth0 2', { user: user ? 'found' : 'not found' });

            if (!user || user.state !== States.user.enabled.code) {
              return res.status(error ? 500 : 400).json({ error: { message: 'User not found' } });
            }

            const uid = user._id.toString();
            const token = req.encryptToken({ uid }, config.get('api:token:expiresInSeconds') * 1000);
            const pid = (user.profiles &&
              user.profiles.owner &&
              user.profiles.owner.length &&
              user.profiles.owner[0].toString()) ||
              null;
            const reply = {
              token,
              user: {
                uid,
                id: uid,
                profile: pid,
                familyName: user.lname,
                givenName: user.fname,
                name: user.name,
                displayName: user.fname || user.name,
                image: user.image
              }
            };

            // log.debug('/auth/xchg/auth0 3', reply);

            res.json(reply);
          }
        );
      })
      .catch(function(err) {
        log.error('Failed to get auth0 user info', { error: err, message: err.toString() });
        res.status(500).json({ error: { message: 'Failed to fetch user detail' } });
      });
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////
  router.post('/auth/xchg/google', (req, res) => {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: { message: 'Token is missing' } });
    }

    google.getGoogleUserInfo(token, (error, guser) => {
      if (error || !guser) {
        log.error('Failed to fetch info about authorized Google user', { error });
        return res.status(500).json({ error: { message: 'Failed to fetch info about authorized Google user' } });
      }
      const actorId = guser.id;

      User.findOne({ actorId }, '_id profiles', (error, user) => {
        if (error || !user) {
          log.error('Failed to fetch authorized Google user from database', { actorId, error });
          return res.status(error ? 500 : 400).json({ error: { message: 'User not found' } });
        }

        const uid = user._id.toString();
        const token = req.encryptToken({ uid }, config.get('api:token:expiresInSeconds') * 1000);
        const pid = (user.profiles &&
          user.profiles.owner &&
          user.profiles.owner.length &&
          user.profiles.owner[0].toString()) ||
          null;

        res.json({ uid, token, pid });
      });
    });
  });

  // router.get('/check', (req, res) => res.json({ host }));
  // router.get('/ping', (req, res) => {
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

  //////////////////////////////////////////////////////////////////////////////////////////////////
  router.use(
    '/graphql',
    tools.tokenOptional,
    graphqlExpress(req => {
      const query = req.query.query || req.body.query;
      if (query && query.length > 2 * 1024) {
        // None of our app's queries are this long
        // Probably indicates someone trying to send an overly expensive query
        throw new Error('Query too large.');
      }

      const user = req.user;

      return {
        schema,
        context: {
          user,
          postManager
        }
      };
    })
  );

  router.use(
    '/graphiql',
    graphiqlExpress({
      endpointURL: '/2/graphql',
      query: `
{
  teams {
    id
    name
    accounts {
      id
      name
      image
      state
      type
      subtype
      profile { id }
    }
  }
}
  `
    })
  );

  // request: {
  //   url: string             // url obrazku k uploadu
  //   temporary: bool,        // true = no thumbnail, false = with thumbnail
  // }
  // response: {
  //   url:           String,  // url obrazku
  //   gcs:           String,  // url full-sized obrazku ulozeneho v Google Cloud Storage
  //   original:      String,  // url zdrojoveho obrazku
  //   width:         Number,  // sirka originalniho obrazku
  //   height:        Number,  // vyska originalniho obrazku
  //   contentType:   String,  // contentType: image/gif, image/jpeg, image/png
  //   aniGif:        Boolean  // true: animated gif, false: is not animated gif
  //   thumbnail: {
  //     url:         String,  // url zmenseneho obrazku
  //     gcs:         String,  // url full-sized obrazku ulozeneho v Google Cloud Storage
  //     width:       Number,  // sirka zmenseneho obrazku
  //     height:      Number,  // vyska zmenseneho obrazku
  //     isFullBleed: Boolean  // true pokud ma obrazek dostatecne rozmery a bude v postu zobrazen veliky, false pokud bude zobrazen jako maly
  //   }
  // }
  // router.post('/photo/uploadphoto/upload', tools.tokenRequired, function(req, res) {
  //   var user = req.user,
  //       profileId = user.profiles && user.profiles.owner && user.profiles.owner.length && user.profiles.owner[0] || null,
  //       userId = user._id.toString(),
  //       data = req.body,
  //       imageUrl = data && data.url;
  //
  //   if (!imageUrl) {
  //     log.warn('Unknown image source for upload', { userId, data });
  //     return res.status(400).json({ error: { message: 'Nothing to upload' } });
  //   }
  //
  //   var temporary = data && data.temporary || false;
  //   var fetchAndStore = temporary ?
  //     image.fetchAndStoreImageTempWithoutThumbnail.bind(image) :
  //     image.fetchAndStoreImage.bind(image);
  //
  //   return fetchAndStore('post', imageUrl, (err, result) => {
  //     if (err) {
  //       var ignoreError = err.statusCode === 404;
  //       (ignoreError ? log.warn : log.error)('Failed to store image from url', {
  //         userId,
  //         temporary,
  //         imageUrl,
  //         error: image.fixError(err)
  //       });
  //       return res.status(500).json({ error: { message: 'Failed to store image from url' } });
  //     }
  //
  //     if (!temporary) {
  //       image.register(result, {
  //         source: 'url',
  //         pid: profileId,
  //         uid: user._id,
  //         original: imageUrl
  //       });
  //     }
  //
  //     res.json(result);
  //   });
  // });
};

module.exports = api2;
