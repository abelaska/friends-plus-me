const { OAuthTokenCryptor } = require('@fpm/token');

const cryptor = new OAuthTokenCryptor();

console.log(cryptor.decrypt(''));
