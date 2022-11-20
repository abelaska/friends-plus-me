/* eslint no-unused-vars: "off", no-multi-assign: "off" */
const Promise = require('bluebird');
const rp = require('request-promise');
const config = require('@fpm/config');
const { ImageProxyClient } = require('@fpm/image-proxy-client');

const imageProxy = new ImageProxyClient(config.get('image:proxy'));

const crawlPicture = (module.exports.crawlPicture = async url => {
  try {
    const { width, height, contentType } = await imageProxy.identify(url);
    return { url, width, height, content_type: contentType };
  } catch (e) {
    e.url = url;
    throw e;
  }
});

const crawlLink = (module.exports.crawlLink = async url =>
  rp({
    url: 'https://crawler.friendsplus.me',
    qs: { url },
    json: true,
    timeout: 60 * 1000
  }));

const crawlLinkToAttachments = (module.exports.crawlLinkToAttachments = async (link, prefferedPicture) => {
  try {
    const { description, title, url, images } = await crawlLink(link);
    const pictures =
      (images &&
        images.map(({ width, height, contentType, ...image }) => ({
          url: image.url,
          width,
          height,
          content_type: contentType
        }))) ||
      undefined;
    const picture =
      (pictures.length && ((prefferedPicture && pictures.find(p => p.url === prefferedPicture)) || pictures[0])) ||
      undefined;
    return [
      {
        type: 'link',
        description,
        title,
        url,
        picture,
        pictures
      }
    ];
  } catch (e) {
    const error = new Error(`Link '${link}' is not crawlable${e.statusCode ? `, status:${e.statusCode}` : ''}`);
    error.error_code = 'invalid_request';
    throw error;
  }
});

const crawlPicturesToAttachments = (module.exports.crawlPicturesToAttachments = async pictures => {
  try {
    pictures = await Promise.map(pictures, crawlPicture, { concurrency: 8 });
  } catch (e) {
    const url = e.url;
    const response = e && e.response && e.response.toJSON && e.response.toJSON();
    const body = response && response.body;
    if (body && !body.success) {
      const error = new Error(`Crawl of picture '${url}' failed: ${body.error && body.error.message}`);
      error.error_code = 'invalid_request';
      throw error;
    }
    throw e;
  }
  return pictures.map(p => ({ type: 'picture', ...p }));
});
