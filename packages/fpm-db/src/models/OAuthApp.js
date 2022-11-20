import { registerModel, Schema, SchemaObjectId } from '../db';

const OAuthApp = new Schema({
  // app name to display
  name: String,
  // a short text description
  description: String,
  // application homepage
  url: String,
  // application avatar picture (google image proxy url)
  picture: String,

  // oauth client id
  clientId: String,
  // oauth client secret
  clientSecret: String,

  // date and time of creation of the app
  createdAt: {
    type: Date,
    default: Date.now
  },
  // user._id
  createdBy: SchemaObjectId,

  // date and time of last update of the app
  updatedAt: Date,

  // company behind the app (if any)
  company: {
    // company name
    name: String,
    // company homepage
    url: String
  },

  // registered callback urls
  callbacks: [String]
});

OAuthApp.index({ name: 1 }, { unique: true });

OAuthApp.index({ clientId: 1 }, { unique: true });

OAuthApp.index({ createdBy: 1 }, { unique: false });

OAuthApp.index({ _id: 1, createdBy: 1 }, { unique: true });

export default registerModel('OAuthApp', OAuthApp);
