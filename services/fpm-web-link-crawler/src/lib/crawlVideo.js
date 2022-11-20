/* jshint node: true */

const request = require('request');
const _ = require('lodash');
const fs = require('fs');
const async = require('async');
const cheerio = require('cheerio');
const htmlencode = require('htmlencode');
const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const Extractor = require('./Extractor');
const cache = require('./cache');

const { URL } = require('url');
const { extractYoutubeVideoId } = require('./youtube');

const cacheTTL = config.get('crawler:cache:ttl');
const isProd = config.get('isProd');
const isDev = !isProd;
const template = _.template(fs.readFileSync(`${__dirname}/../../templates/fb-video-proxy.html`));

const ignoreCache = !!process.env.NO_CACHE;

htmlencode.EncodeType = 'numerical';

function _fetch(url, callback) {
  let tm = new Date();
  request(
    {
      method: 'GET',
      url,
      fullUrl: url,
      followRedirect: true,
      followAllRedirects: true,
      maxRedirects: config.get('crawler:maxRedirects'),
      strictSSL: false,
      timeout: config.get('crawler:timeout') || config.get('default:timeout'),
      headers: {
        'User-Agent': config.get('crawler:userAgent')
      }
    },
    (error, response, body) => {
      tm = new Date() - tm;
      if (error || !response) {
        return callback(error || { error: { code: 'ETIMEOUT', message: 'Timeout' } });
      }
      let tm2 = new Date(),
        $ = cheerio.load(body);
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

function crawl(options, callback) {
  const crawlUrl = options.url;
  const tm = new Date();

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

    let video,
      embed,
      extractor = new Extractor(uri, $),
      images = extractor.images(),
      image = images && images.length && images[0].url,
      videos = extractor.videos();

    const videoDetail = extractor.video();

    if (videos && videos.length > 1) {
      for (let i = 0; i < videos.length; i++) {
        if (videos[i].indexOf('www.youtube.com/v/') > 0) {
          video = videos[i];
        }
        if (videos[i].indexOf('www.youtube.com/embed/') > 0 && !videoDetail.embed) {
          videoDetail.embed = videos[i];
        }
      }
    }

    const videoUrl = video || (videos && videos[0]);
    let secureVideoUrl = videoUrl;
    if (videoUrl && videoUrl.indexOf('http://') === 0) {
      secureVideoUrl = videoUrl.replace('http://', 'https://');
    }

    const reply = {
      embed: videoDetail.embed,
      url: crawlUrl,
      fullUrl: `https://crawler.friendsplus.me/video/proxy?url=${encodeURIComponent(crawlUrl)}`,
      image,
      title: htmlencode.htmlEncode(extractor.title()),
      description: htmlencode.htmlEncode(extractor.description()),
      videos: [
        {
          url: videoUrl,
          secure_url: secureVideoUrl,
          type: videoDetail.type,
          width: videoDetail.width,
          height: videoDetail.height
        }
      ]
    };

    reply.html = template(reply);

    if (isDev) {
      times.total = new Date() - tm;
      reply.dev = {
        times
      };
    }

    callback(null, reply);
  });
}

function crawlYt(ytVideoId, options, callback) {
  const { url } = options;
  let tm = new Date();

  const apiKey = config.get('youtube:apiKey');
  const fetchUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet%2Cplayer&id=${ytVideoId}&key=${apiKey}&fields=items(player%2Csnippet(description%2Cthumbnails%2Ctitle))`;

  request({ method: 'GET', url: fetchUrl, json: true }, (error, response, body) => {
    tm = new Date() - tm;
    if (error || !response) {
      return callback(error || { error: { code: 'ETIMEOUT', message: 'Timeout' } });
    }
    const detail = body && body.items && body.items.length && body.items[0];
    const snippet = detail && detail.snippet;
    const player = detail && detail.player;
    const thumbnail = snippet && snippet.thumbnails && snippet.thumbnails.standard;
    const image = thumbnail && thumbnail.url;
    const embedHtml = player && player.embedHtml;

    let width = (thumbnail && thumbnail.width) || (player && player.embedWidth);
    let height = (thumbnail && thumbnail.height) || (player && player.embedHeight);
    if ((!width || !height) && embedHtml) {
      try {
        const $iframe = embedHtml && cheerio.load(embedHtml);
        if ($iframe) {
          width = $iframe && $iframe.attr('width');
          height = $iframe && $iframe.attr('height');
        }
      } catch (e) {}
    }

    const reply = {
      url: `https://www.youtube.com/watch?v=${ytVideoId}`,
      fullUrl: `https://crawler.friendsplus.me/video/proxy?url=${encodeURIComponent(url)}`,
      image,
      embed: `https://www.youtube.com/embed/${ytVideoId}`,
      title: snippet && htmlencode.htmlEncode(snippet.title),
      description: snippet && htmlencode.htmlEncode(snippet.description),
      videos: [
        {
          url: `https://www.youtube.com/v/${ytVideoId}?version=3`,
          secure_url: `https://www.youtube.com/v/${ytVideoId}?version=3`,
          type: 'application/x-shockwave-flash',
          width,
          height
        },
        {
          url: `https://www.youtube.com/embed/${ytVideoId}`,
          secure_url: `https://www.youtube.com/embed/${ytVideoId}`,
          type: 'text/html',
          width,
          height
        }
      ]
    };

    reply.html = template(reply);

    if (isDev) {
      reply.dev = { times: { total: new Date() - tm } };
    }

    callback(null, reply);
  });
}

module.exports = (options, callback) => {
  const { url } = options;
  try {
    new URL(url);
  } catch (e) {
    return callback(e);
  }

  const tm = new Date();
  const cacheKey = `crawl:video:${cache.hash(url)}`;

  const processReply = (err, reply) => {
    if (err) {
      return callback(err);
    }
    if (reply && reply.html) {
      cache.set(cacheKey, JSON.stringify(reply), cacheTTL, error => {
        if (error) {
          log.error('Failed to store crawled video to cache', { url, error });
        }
        callback(null, reply);
      });
    } else {
      log.error('Empty video proxy reply', url);
      callback(null, reply);
    }
  };

  cache.get(cacheKey, (err, data) => {
    data = data && JSON.parse(data);
    if (data && !ignoreCache) {
      if (isDev) {
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
