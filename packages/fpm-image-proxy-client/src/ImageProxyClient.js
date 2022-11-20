import rp from 'request-promise';

export default class ImageProxyClient {
  constructor(options) {
    const { url, timeout, token } = options || {};
    this.url = url;
    this.timeout = timeout;
    this.token = token;
  }

  isRetryError(reply) {
    const errMsg = reply && reply.error && reply.error.message;
    if (!errMsg) {
      return false;
    }
    const retryErrors = [
      'EOF',
      'Deadline exceeded',
      'timeout',
      'urlfetch: CLOSED',
      'urlfetch: DEADLINE_EXCEEDED',
      'urlfetch: FETCH_ERROR',
      'images: UNSPECIFIED_ERROR',
      'image: unknown format'
    ];
    return (errMsg && retryErrors.filter(e => errMsg.indexOf(e) > -1).length > 0) || false;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async failover(fce, maxTries = 3, tryDelay = 150) {
    let reply;
    let error;
    let remainingTries = maxTries;
    do {
      try {
        // eslint-disable-next-line no-await-in-loop
        reply = await fce();
        error = null;
      } catch (e) {
        error = e;
        reply = e.error;
      }
      if (!reply) {
        throw error || new Error('ImageProxyClient empty reply');
      }
      if (reply.success) {
        return reply;
      }
      if (!this.isRetryError(reply)) {
        if (error) {
          throw error;
        }
        return reply;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.sleep(tryDelay);
    } while (--remainingTries > 0);
    if (error) {
      throw error;
    }
    return reply;
  }

  // url: publicly accessible url of image to fetch
  // returns:
  // success: bool
  // url: string
  // contentType: string
  // width: int
  // height: int
  // size: int
  // error: { message: string }
  async identify(url) {
    return this.failover(() =>
      this._call({
        path: '/fetch',
        body: { url }
      })
    );
  }

  // url: publicly accessible url of image to fetch
  // filename: destination for file: /gs/bucket_name/object_name
  // returns:
  // success: bool
  // id: string
  // bucket: string
  // filename: string
  // url: string
  // proxy: string
  // contentType: string
  // width: int
  // height: int
  // size: int
  // error: { message: string }
  async fetchAndStore(url, filename) {
    return this.failover(() =>
      this._call({
        path: '/fetch',
        body: { url, filename }
      })
    );
  }

  // filename: /gs/bucket_name/object_name
  // returns:
  // success: bool
  // filename: string
  // url: string
  // error: { message: string }
  async register(filename) {
    return this._call({
      path: '/register',
      body: { filename }
    });
  }

  // filename: /gs/bucket_name/object_name
  // returns:
  // success: bool
  // filename: string
  // error: { message: string }
  async unregister(filename) {
    return this._call({
      path: '/unregister',
      body: { filename }
    });
  }

  async _call({ path, body }) {
    return rp({
      method: 'POST',
      url: `${this.url}${path}`,
      json: true,
      timeout: this.timeout,
      headers: { 'X-Client-Token': this.token, 'user-agent': 'FPMImageProxyClient' },
      body
    });
  }
}
