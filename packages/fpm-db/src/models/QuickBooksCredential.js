import { registerModel, Schema } from '../db';

const QuickBooksCredential = new Schema({
  companyId: String, // QuickBooks company id
  accessToken: String, // encrypted access token
  accessTokenExpiresAt: Date, // date and time of access token expiration
  refreshToken: String, // encrypted refresh token
  refreshTokenExpiresAt: Date, // date and time of refresh token expiration
  createdAt: { type: Date, default: Date.now }, // datum a cas vzniku zaznamu
  updatedAt: { type: Date, default: Date.now } // datum a cas posledniho update zaznamu
});

QuickBooksCredential.index({ companyId: 1 }, { unique: true });

export default registerModel('QuickBooksCredential', QuickBooksCredential);
