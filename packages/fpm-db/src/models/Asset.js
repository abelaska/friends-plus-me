import { registerModel, Schema, SchemaObjectId } from '../db';

const Asset = new Schema({
  // asset name to display
  name: String,
  // date and time of creation of the asset
  createdAt: {
    type: Date,
    default: Date.now
  },
  // user._id
  createdBy: SchemaObjectId,
  // date and time of last update of the asset
  updatedAt: Date,
  // user._id
  updatedBy: SchemaObjectId,
  // profile._id
  pid: SchemaObjectId,
  // asset state
  state: {
    type: String,
    default: 'ready',
    enum: ['uploading', 'ready', 'delete']
  },
  // asset type
  type: {
    type: String,
    enum: ['picture', 'video']
  },
  // text description
  description: String,
  // asset size in Bytes
  size: {
    type: Number,
    default: 0
  },
  // if the asset can be deleted by user via gallery
  deletable: {
    type: Boolean,
    default: true
  },
  // if the asset is visible to users in gallery
  visible: {
    type: Boolean,
    default: true
  },
  // picture asset
  picture: {
    // picture file full path /${storage}/${bucket}/${filename}
    id: String,
    // picture type
    type: {
      type: String,
      enum: ['picture', 'avatar']
    },
    // original url, ex. "https://storage.googleapis.com/spot-user-assets/accountId/Transparent.gif"
    url: String,
    // proxyied url, ex. "https://lh3.googleusercontent.com/jqpF8h1RmWjLZd9Hhc4FoIhxvGmjSzbWbQFGLjkXxUmZXNlK18_-ZAQ-oSwpu3FNbu-efiW7qyAxcInWCmX4Tah34J3Fbse34w"
    proxy: String,
    // storage type: "gs" (Google Storage)
    storage: {
      type: String,
      enum: ['gs']
    },
    // bucket where the image is stored, ex. "fpm-user-assets"
    bucket: String,
    // image path and filename relative to bucket without / prefix, ex. "{Asset.id}.jpg"
    filename: String,
    // picture width
    width: Number,
    // picture height
    height: Number,
    // http content type, ex. "image/jpeg"
    contentType: String,
    // is animated gif or not
    aniGif: Boolean
    // image file md5 hash base64 coded, ex. "vNT/YMOIgXErp+sDFByvTw=="
    // md5Hash: String,,,,,,,
  },
  // video asset
  video: {
    // video file full path /${storage}/${bucket}/${filename}
    id: String,
    // url, ex. "https://www.googleapis.com/storage/v1/b/social-team-videos/o/{Asset.id}.webm"
    url: String,
    // storage type: "gs" (Google Storage)
    storage: {
      type: String,
      enum: ['gs']
    },
    // bucket where the video is stored, ex. "fpm-user-assets"
    bucket: String,
    // video path and filename relative to bucket without / prefix, ex. "{Asset.id}.webm"
    filename: String,
    // http content type, ex. "video/webm"
    contentType: String
    // video file md5 hash base64 coded, ex. "vNT/YMOIgXErp+sDFByvTw=="
    // md5Hash: String,,,,,,,
  }
});

export default registerModel('Asset', Asset);
