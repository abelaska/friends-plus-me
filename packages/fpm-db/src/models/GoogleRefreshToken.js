import { registerModel, Schema } from '../db';
import { OAuthTokenCryptor } from '@fpm/token';

const oAuthTokenCryptor = new OAuthTokenCryptor();

var GoogleRefreshToken = new Schema(
  {
    uid: String, // identifikator google vlastnika tokenu
    val: String, // encrypted token value
    updatedAt: { type: Date, default: Date.now } // cas posledni aktualizace zaznamu s vlivem na fetch interval
  },
  {
    versionKey: false
  }
);

GoogleRefreshToken.index({ uid: 1 }, { unique: true });
GoogleRefreshToken.index({ updatedAt: -1 }, { unique: false });

GoogleRefreshToken.virtual('encrypted').get(function() {
  return this.val;
});

GoogleRefreshToken.virtual('plain').get(function() {
  return oAuthTokenCryptor.decrypt(this.val);
});

GoogleRefreshToken.static('store', function(uid, plain, callback) {
  const val = oAuthTokenCryptor.encrypt(plain);
  this.update({ uid }, { $set: { val, updatedAt: new Date() } }, { upsert: true }).exec(callback);
});

export default registerModel('GoogleRefreshToken', GoogleRefreshToken);
