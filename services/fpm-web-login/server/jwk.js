const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const config = require('@fpm/config');

const jwks = jwksClient.expressJwtSecret({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  jwksUri: `https://${config.get('auth0:domain')}/.well-known/jwks.json`
});

const jwkSecret = dtoken =>
  new Promise((resolve, reject) =>
    jwks(null /* req */, dtoken.header, dtoken.payload, (error, secret) => (error && reject(error)) || resolve(secret))
  );
module.exports.jwkSecret = jwkSecret;

const jwtVerify = (token, secret, options) =>
  new Promise((resolve, reject) =>
    jwt.verify(token, secret, options, (error, decoded) => (error && reject(error)) || resolve(decoded))
  );
module.exports.jwtVerify = jwtVerify;

const jwkDecode = token => {
  try {
    return jwt.decode(token, { complete: true });
  } catch (e) {
    return null;
  }
};
module.exports.jwkDecode = jwkDecode;
