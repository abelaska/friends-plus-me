/* jshint node: true */

const request = require('request');
const _ = require('lodash');
const async = require('async');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const charsetParser = require('charset-parser');
const { URL } = require('url');
const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { extractYoutubeVideoId } = require('./youtube');
const Extractor = require('./Extractor');
const image = require('./image');
const cache = require('./cache');

const minImg = config.get('image:fetch:min');
const maxImages = config.get('image:fetch:max');
const cacheTTL = config.get('crawler:cache:ttl');
const fetchImagesInParallel = config.get('image:fetch:parallel');
const isProd = config.get('isProd');
const isDev = !isProd;

function _fetch(url, callback) {
  let tm = new Date();
  const jar = request.jar();
  if (config.get('crawler:incapsula:cookie')) {
    jar.setCookie(request.cookie(config.get('crawler:incapsula:cookie')), url);
  }
  if (config.get('crawler:akamaighost:cookie')) {
    jar.setCookie(request.cookie(config.get('crawler:akamaighost:cookie')), url);
  }
  request(
    {
      method: 'GET',
      url,
      gzip: true,
      jar, // for every request use new cookie jar
      encoding: null,
      followRedirect: true,
      followAllRedirects: true,
      maxRedirects: config.get('crawler:maxRedirects'),
      strictSSL: false,
      timeout: config.get('crawler:timeout') || config.get('default:timeout'),
      headers: {
        'User-Agent': config.get('crawler:userAgent'),
        'Accept-Encoding': 'gzip'
      }
    },
    (error, response, body) => {
      tm = new Date() - tm;
      if (error || !response) {
        return callback(error || { error: { code: 'ETIMEOUT', message: 'Timeout' } });
      }

      const charset = charsetParser(
        response.headers['content-type'] || '',
        (body && body.toString('ascii')) || '',
        'utf-8'
      );
      if (charset !== 'utf-8') {
        body = iconv.decode(new Buffer(body), charset);
      }
      let tm2 = new Date();
      const $ = cheerio.load(body);
      tm2 = new Date() - tm2;

      callback(null, response.request.uri, $, body, response.statusCode, {
        fetch: tm,
        parse: tm2
      });
    }
  );
}

// callback(err, buffer, contentType, tm, fileExt, isAniGif)
function fetch(url, callback) {
  let lastErr,
    ret = {},
    tm = new Date(),
    tries = config.get('crawl:tries') || 3;

  async.whilst(
    () => {
      return tries-- > 0;
    },
    cb => {
      _fetch(url, (err, uri, $, buffer, statusCode) => {
        if (
          (err &&
            _.includes(
              [1, 'ETIMEOUT', 'ECONNREFUSED', 'ESOCKETTIMEDOUT', 'EAI_AGAIN', 'HPE_INVALID_CONSTANT'],
              err.code
            )) ||
          (statusCode && _.includes([403, 404, 500, 502, 522], statusCode))
        ) {
          lastErr = err || { error: { message: 'Web page fetch failed', statusCode } };
          return cb();
        }
        if (!buffer || !buffer.length) {
          lastErr = { error: { message: 'Web page fetch response is empty', code: 'EMPTY_RESPONSE' } };
          return cb();
        }
        tries = 0;
        lastErr = err;
        ret.body = buffer;
        ret.uri = uri;
        ret.$ = $;
        ret.statusCode = statusCode;
        cb();
      });
    },
    () => {
      tm = new Date() - tm;

      let $,
        tm2 = new Date();

      try {
        $ = ret.body && cheerio.load(ret.body);
      } catch (e) {
        return callback(e, ret.uri, null, ret.body, ret.statusCode, {
          fetch: tm
        });
      }

      tm2 = new Date() - tm2;

      callback(lastErr, ret.uri, ret.$, ret.body, ret.statusCode, {
        fetch: tm,
        parse: tm2
      });
    }
  );
}

function identifyImages(images, callback) {
  if (!images || !images.length) {
    return callback(null, []);
  }

  if (images.length > maxImages) {
    images = _.dropRight(images, images.length - maxImages);
  }

  for (let i = 0; i < images.length; i++) {
    images[i]._idx = i;
  }

  async.eachLimit(
    images,
    fetchImagesInParallel,
    (foundImage, cb) => {
      let url = foundImage.url,
        meta = foundImage.meta || {};

      image.fetchImageForDimensions(url, (err, width, height, contentType, contentLength, isAniGif, buffer, times) => {
        let img,
          fetched = buffer && buffer.length;
        if (width >= minImg.width && height >= minImg.height && contentType && fetched) {
          meta.prio = meta.prio * 1024 + width * 3 + height;
          img = {
            url,
            size: contentLength,
            width,
            height,
            contentType,
            meta
          };
          if (contentType === 'image/gif') {
            img.animated = isAniGif;
          }
          if (isDev) {
            img.dev = {
              times,
              fetched
            };
          }
        }
        images[foundImage._idx] = img;
        cb();
      });
    },
    err => {
      if (err) {
        return callback(err);
      }
      images = _.filter(images, img => {
        return img;
      });

      // sort images by dimensions+prio desc
      if (images && images.length) {
        images.sort((a, b) => {
          return b.meta.prio - a.meta.prio;
        });
      }

      callback(null, images);
    }
  );
}

function crawl(options, callback) {
  let crawlUrl = options.url,
    skipImages = options.skipImages,
    tm = new Date();

  fetch(crawlUrl, (err, uri, $, body, statusCode, times) => {
    const isNotOkStatus = !statusCode || statusCode !== 200;

    if (err || isNotOkStatus || !$ || !body) {
      log.error('Failed to fetch web page', {
        url: crawlUrl,
        statusCode,
        times,
        uri,
        error: err
      });
      return callback(err || { error: { message: `Failed to fetch ${crawlUrl}`, statusCode } });
    }

    let extractor = new Extractor(uri, $),
      images = skipImages ? null : extractor.images(),
      reply = {
        url: crawlUrl,
        title: extractor.title(),
        description: extractor.description(),
        images: []
      };

    identifyImages(images, (err, images) => {
      if (err) {
        log.error('Failed to identify web page images', {
          url: crawlUrl,
          images,
          error: err
        });
        return callback(err);
      }

      tm = new Date() - tm;

      if (isDev) {
        times.total = tm;
        reply.dev = {
          times
        };
      }

      reply.images = images;

      callback(null, reply);
    });
  });
}

function crawlYt(ytVideoId, options, callback) {
  const { url, skipImages } = options;
  const tm = new Date();

  const apiKey = config.get('youtube:apiKey');
  const fetchUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet%2Cplayer&id=${ytVideoId}&key=${apiKey}&fields=items(player%2Csnippet(description%2Cthumbnails%2Ctitle))`;

  request({ method: 'GET', url: fetchUrl, json: true }, (error, response, body) => {
    if (error || !response) {
      return callback(error || { error: { code: 'ETIMEOUT', message: 'Timeout' } });
    }
    const detail = body && body.items && body.items.length && body.items[0];
    const snippet = detail && detail.snippet;
    const player = detail && detail.player;
    const images = skipImages
      ? null
      : snippet &&
        snippet.thumbnails &&
        Object.values(snippet.thumbnails).map(t => ({ url: t.url, meta: { prio: 0, use: 'thumbnail' } }));

    const reply = {
      url,
      title: snippet && snippet.title,
      description: snippet && snippet.description,
      images: []
    };

    identifyImages(images, (error, images) => {
      if (error) {
        log.error('Failed to identify web page images', { url, images, stack: error.stack });
        return callback(err);
      }

      if (isDev) {
        reply.dev = { times: { total: new Date() - tm } };
      }

      reply.images = images;

      callback(null, reply);
    });
  });
}

module.exports = function (options, callback) {
  const { url } = options;
  try {
    new URL(url);
  } catch (e) {
    return callback(e);
  }

  const tm = new Date();
  const cacheKey = `crawl:link:${cache.hash(url)}`;

  const processReply = (err, reply) => {
    if (err) {
      return callback(err);
    }
    cache.set(cacheKey, JSON.stringify(reply), cacheTTL, error => {
      if (error) {
        log.error('Failed to store crawled web page to cache', { url, error });
      }
      callback(null, reply);
    });
  };

  cache.get(cacheKey, (err, data) => {
    data = data && JSON.parse(data);
    if (data) {
      if (isDev) {
        data.images.map(i => {
          delete i.dev;
        });
        data.dev = { times: { total: new Date() - tm } };
      }
      return callback(null, data, true);
    }

    const ytVideoId = extractYoutubeVideoId(url);
    if (ytVideoId) {
      crawlYt(ytVideoId, options, processReply);
    } else {
      crawl(options, processReply);
    }
  });
};
