import { registerModel, Schema, SchemaObjectId } from '../db';

var ProfileName = new Schema(
  {
    uid: SchemaObjectId, // user._id
    pid: SchemaObjectId, // profile._id
    name: String // profile name defined by user
  },
  {
    versionKey: false
  }
);

ProfileName.index({ uid: 1, pid: 1 }, { unique: true });

export default registerModel('ProfileName', ProfileName);
