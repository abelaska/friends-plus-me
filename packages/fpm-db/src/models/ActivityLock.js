import { registerModel, Schema, SchemaObjectId } from '../db';

var ActivityLock = new Schema(
  {
    id: String, // identifikator aktivity

    pid: SchemaObjectId, // identifikator profilu vlastniciho repost aktivity

    created: {
      // cas zaevidovani aktivity s expiraci zaznamu po 3 mesicich
      type: Date,
      default: Date.now,
      expires: '180d'
    }
  },
  {
    versionKey: false
  }
);

ActivityLock.index({ pid: 1, id: 1 }, { unique: true });

export default registerModel('ActivityLock', ActivityLock);
