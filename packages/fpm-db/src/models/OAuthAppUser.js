import { registerModel, Schema, SchemaObjectId } from '../db';

const OAuthAppUser = new Schema({
  // oauthapp.clientId
  clientId: String,
  // user._id
  uid: SchemaObjectId,
  // scope
  scope: String
});

OAuthAppUser.index({ clientId: 1, uid: 1 }, { unique: true });

export default registerModel('OAuthAppUser', OAuthAppUser);
