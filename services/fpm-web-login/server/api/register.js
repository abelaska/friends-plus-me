/* eslint no-case-declarations: "off" */
const qs = require('querystring');
const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { States } = require('@fpm/constants');
const { ObjectId, OAuthAppUser, User } = require('@fpm/db');
const { sendError, args } = require('../http');
const { jwkSecret, jwkDecode, jwtVerify } = require('../jwk');
const { sendySubscribeNewUser } = require('../sendy');

const scope = config.get('fpm:app:scopes').join(' ');
const clientId = config.get('fpm:app:clientId');

const updateOAuthAppUser = async dbUser =>
  OAuthAppUser.update({ clientId, uid: dbUser._id }, { $set: { scope } }, { upsert: true });

const sendReply = (req, res, dbUser) => {
  if (dbUser) {
    req.cookieAuth.sub = dbUser._id.toString();
    req.cookieAuth.challenge = null;
  }

  const query = qs.stringify({
    scope,
    prompt: 'none',
    response_type: 'code',
    client_id: clientId,
    state: new Date().valueOf(),
    redirect_uri: config.get('fpm:app:redirectUrl')
  });
  const redirectUrl = `https://api.friendsplus.me/oauth.authorize?${query}`;

  return res.json({
    ok: true,
    redirect_url: redirectUrl
  });
};

module.exports = [
  args('auth0_id_token'),
  async (req, res) => {
    const { deps: { assetsManager, auth0 }, query: { auth0_id_token } } = req;

    const dtoken = jwkDecode(auth0_id_token);
    if (!dtoken) {
      return sendError(res, 401, 'invalid_auth');
    }

    let auth0Secret;
    try {
      auth0Secret = await jwkSecret(dtoken);
    } catch (e) {
      log.error('jwkSecret failure', { stack: e.stack, error: e });
      return sendError(res, 401, 'invalid_auth');
    }

    try {
      await jwtVerify(auth0_id_token, auth0Secret, {
        issuer: `https://${config.get('auth0:domain')}/`,
        algorithms: ['RS256']
      });
    } catch (e) {
      log.error('jwtVerify failure', { stack: e.stack, error: e });
      return sendError(res, 401, 'invalid_auth');
    }

    // register user
    const auth0Id = dtoken.payload.sub;
    const actorId = auth0Id.indexOf('google-oauth2') === 0 ? auth0Id.split('|')[1] : null;

    let dbUserExists = await User.findOne({ auth0Id }).exec();
    if (dbUserExists && !dbUserExists.isDeleted) {
      log.warn('Registering user already exists', { auth0Id, userId: dbUserExists._id.toString() });
      await updateOAuthAppUser(dbUserExists);
      return sendReply(req, res, dbUserExists);
    }

    let auth0User;
    try {
      auth0User = await auth0.userInfoByUserId(auth0Id);
    } catch (e) {
      log.error('Failed to fetch auth0 user info', { auth0Id, message: e.message(), stack: e.stack });
      return sendError(res, 500, 'internal_error');
    }

    // try to restore old accounts wigned up with Google
    if (!dbUserExists && actorId) {
      dbUserExists = await User.findOne({ actorId }).exec();
      if (dbUserExists) {
        log.warn('Restoring old Google signed-up user account', {
          actorId,
          userId: dbUserExists._id.toString(),
          email: dbUserExists.email
        });
      }
    }

    const meta = auth0User.user_metadata || {};

    const $set = {
      _id: dbUserExists ? dbUserExists._id : new ObjectId(),
      auth0Id,
      actorId,
      name: auth0User.name,
      fname: auth0User.given_name,
      lname: auth0User.family_name,
      email: auth0User.email,
      emailVerified: !!auth0User.email_verified,
      tz: meta.tz,
      country: meta.country && meta.country.toUpperCase(),
      locale: meta.locale || (auth0User.locale && auth0User.locale.split('-')[0]),
      state: States.user.enabled.code,
      deleted: null,
      deleteReason1: null,
      deleteReason2: null,
      deleteReason3: null,
      blocked: null,
      blockReason: null
    };

    if (!dbUserExists) {
      $set.profiles = {};
    }

    if (auth0User.picture) {
      const asset = await assetsManager.fetchAndStoreAvatar({ url: auth0User.picture, user: $set });
      if (asset) {
        $set.image = `${asset.picture.proxy}=s50`;
      }
    }

    const dbUser = await User.findOneAndUpdate({ _id: $set._id }, { $set }, { new: true, upsert: true });

    await updateOAuthAppUser(dbUser);
    await sendySubscribeNewUser(dbUser);

    return sendReply(req, res, dbUser);
  }
];
