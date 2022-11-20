import { createHash } from 'crypto';
import { registerModel, Schema } from '../db';

const DeviceAssigned = new Schema({
  // sevice serial number
  serial: String,
  // base64(sha1(instagram_username))
  login: String,
  // list of associated profile.account.token
  tokens: [String],
  // date and time of creation of the app
  createdAt: {
    type: Date,
    default: Date.now
  },
  // date and time of last update of the app
  updatedAt: Date
});

DeviceAssigned.index({ serial: 1 }, { unique: false });
DeviceAssigned.index({ login: 1 }, { unique: false });
DeviceAssigned.index({ tokens: 1 }, { unique: false });

const hash = plain =>
  createHash('sha1')
    .update(plain)
    .digest('base64');

const hashSmart = (hashed, plain) => hashed || (plain && hash(plain));

DeviceAssigned.statics.hash = function staticHash(hashed, plain) {
  return hashSmart(hashed, plain);
};

DeviceAssigned.statics.register = async function register({ serial, token, tokenPlain, login, loginPlain }) {
  const set = { $set: { updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } };
  token = hashSmart(token, tokenPlain);
  if (token) {
    set.$addToSet = { tokens: token };
  }
  return this.update({ serial, login: hashSmart(login, loginPlain) }, set, { upsert: true });
};

export default registerModel('DeviceAssigned', DeviceAssigned);
