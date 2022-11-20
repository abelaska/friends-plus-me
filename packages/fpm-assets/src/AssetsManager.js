import { Asset, ObjectId } from '@fpm/db';
import { ImageProxyClient } from '@fpm/image-proxy-client';
import { fixImageUrl } from './tools';

export default class AssetsManager {
  constructor(options) {
    const { isDev, imageProxy, imageProxyConfig } = options || {};
    this.isDev = isDev === undefined ? process.env.NODE_ENV === 'development' : isDev;
    this.imageProxy = imageProxy || new ImageProxyClient(imageProxyConfig);
  }

  // fetchAndStoreMovie() {
  // }

  async fetchAndStoreAvatar({ url, user, pid }) {
    return this._fetchAndStorePicture({ url, user, pid, type: 'avatar', deletable: false, visible: false });
  }

  async fetchAndStorePicture({ url, user, pid }) {
    return this._fetchAndStorePicture({ url, user, pid, type: 'picture', deletable: true, visible: true });
  }

  async _fetchAndStorePicture({ url, type, pid, deletable, visible, user }) {
    url = fixImageUrl(url);

    const _id = new ObjectId();
    const id = _id.toString();
    const filenamePrefix = this.isDev ? 'dev-' : '';
    const asset = new Asset({
      _id,
      pid: pid && new ObjectId(pid.toString()),
      deletable,
      visible,
      name: id,
      type: 'picture',
      createdBy: user._id,
      picture: {
        type
      }
    });

    const path = `${filenamePrefix}${user._id}/${(pid && pid.toString()) || 'default'}/${type}/`;

    const detail = await this.imageProxy.fetchAndStore(url, path);

    asset.size = detail.size;
    asset.picture.id = detail.id;
    asset.picture.bucket = detail.bucket;
    asset.picture.filename = detail.filename;
    asset.picture.url = detail.url;
    asset.picture.proxy = detail.proxy;
    asset.picture.width = detail.width;
    asset.picture.height = detail.height;
    asset.picture.contentType = detail.contentType;
    asset.picture.aniGif = !!detail.aniGif;

    return asset.save();
  }

  async fetchPicture({ url, type = 'picture' }) {
    url = fixImageUrl(url);

    const asset = new Asset({
      type: 'picture',
      picture: { type }
    });

    const detail = await this.imageProxy.identify(url);

    asset.size = detail.size;
    asset.picture.id = detail.id;
    asset.picture.bucket = detail.bucket;
    asset.picture.filename = detail.filename;
    asset.picture.url = detail.url;
    asset.picture.proxy = detail.proxy;
    asset.picture.width = detail.width;
    asset.picture.height = detail.height;
    asset.picture.contentType = detail.contentType;
    asset.picture.aniGif = !!detail.aniGif;

    return asset;
  }
}
