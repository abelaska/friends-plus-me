const urlParser = require('url');
const LRU = require('lru-cache');
const crypto = require('crypto');
const { ObjectId } = require('@fpm/db');
const { prepareConsent } = require('./consent');
const log = require('@fpm/logging').default;

const validChallenges = LRU({
  max: 10000,
  maxAge: 1 * 60 * 60 * 1000
});

const invalidChallenges = LRU({
  max: 10000,
  maxAge: 24 * 60 * 60 * 1000
});

setInterval(() => {
  validChallenges.prune();
  invalidChallenges.prune();
}, 5 * 60 * 1000);

const md5sum = buffer =>
  crypto
    .createHash('md5')
    .update(buffer)
    .digest('base64');

module.exports = () => async (req, res, next) => {
  const { hydra } = req.deps;
  const { challenge } = req.query;
  if (!challenge) {
    return next();
  }

  const challengeHash = md5sum(challenge);
  if (invalidChallenges.get(challengeHash)) {
    log.warn(`Challenge ${challengeHash} rejected as invalid based on cached last result`, challenge);
    return res.status(400).send('Invalid challenge');
  }

  let decodedChallenge;
  try {
    decodedChallenge = validChallenges.get(challengeHash);
    if (decodedChallenge) {
      log.warn(`Challenge ${challengeHash} accepted based on cached last result`, challenge);
    } else {
      decodedChallenge = await hydra.verifyConsentChallenge(challenge, false);
      if (decodedChallenge) {
        validChallenges.set(challengeHash, decodedChallenge);
      }
    }
  } catch (e) {
    invalidChallenges.set(challengeHash, true);
    log.error('Failed to verify challenge', e);
    return res.status(400).send('Invalid challenge');
  }

  // https://ory.gitbooks.io/hydra/content/oauth2.html#consent-app-flow
  // decoded: {
  //   // The client id that initiated the request. You can fetch client data using the OAuth2 Client API.
  //   aud: '737282ed-e04d-491f-9c32-851ec58153f0',
  //   // The challenge's expiry date. Consent endpoints must not accept challenges that have expired.
  //   exp: 1504197381,
  //   // A unique id.
  //   jti: '5a2a0125-e80a-4288-b3fe-87b50e18eeb9',
  //   // Where the consent endpoint should redirect the user agent to, once consent is given.
  //   redir: 'https://hydra.friendsplus.me/oauth2/auth?client_id=737282ed-e04d-491f-9c32-851ec58153f0&response_type=token&scope=admin&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Foauth.callback&prompt=consent&state=1234567890',
  //   // The requested scopes, e.g. ["blog.readall", "blog.writeall"]
  //   scp: [ 'admin' ]
  // }

  const { redir, aud, scp } = decodedChallenge || {};
  const redirParsed = (redir && urlParser.parse(redir, true)) || {};
  const clientId = aud;

  req.cookieAuth.challenge = {
    clientId,
    prompt: redirParsed.query.prompt,
    scope: scp,
    redir,
    decoded: decodedChallenge,
    original: challenge
  };

  const uid = req.cookieAuth && req.cookieAuth.sub && ObjectId.isValid(req.cookieAuth.sub) && req.cookieAuth.sub;

  if (uid && req.cookieAuth.challenge.prompt === 'none') {
    let stateJson;
    try {
      const { state } = (redirParsed && redirParsed.query) || {};
      stateJson = state && state[0] === '{' && JSON.parse(state);
    } catch (ignore) {
      /* */
    }
    const { impersonate } = stateJson || {};

    const { consent, end } = await prepareConsent(req, res, {
      decodedChallenge,
      clientId,
      userQuery: { _id: uid },
      impersonate
    });
    if (consent) {
      return res.redirect(302, `${req.cookieAuth.challenge.redir}&consent=${consent}`);
    } else if (end) {
      return undefined;
    }
  }

  return next();
};
