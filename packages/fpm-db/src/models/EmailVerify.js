import crypto from 'crypto';
import { registerModel, Schema, SchemaObjectId } from '../db';

const VERIFICATION_TTL_SECONDS = 15 * 60;

const EmailVerify = new Schema({
  uid: SchemaObjectId, // user._id
  id: {
    // unique verification identificator
    type: String,
    default: () => crypto.randomBytes(48).toString('hex')
  },
  redirectUrl: String, // where to redirect user after successfull verification
  createdAt: {
    // last time post was fetched from this queue for publishing
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => {
      const t = new Date();
      t.setSeconds(t.getSeconds() + VERIFICATION_TTL_SECONDS);
      return t;
    }
  },
  verifiedAt: Date // date at which the email was verified
});

EmailVerify.index({ uid: 1, createdAt: 1 }, { unique: false });
EmailVerify.index({ id: 1 }, { unique: true });

export default registerModel('EmailVerify', EmailVerify);
