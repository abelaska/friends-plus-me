/* jshint node: true */

const _ = require('lodash');
const log = require('@fpm/logging').default;
const imageTool = require('./image');

const Extractor = (module.exports = function Extractor(uri, $) {
  this.$ = $;
  this.uri = uri;
  return this;
});

Extractor.prototype._fixImageUrl = function (image) {
  if (image && image[0] === '/') {
    image = `${this.uri.protocol}//${this.uri.host}${image}`;
  } else if (image && !image.match(/^https?:\/\//)) {
    image = `${this.uri.protocol}//${this.uri.host}${this.uri.pathname}${this.uri.pathname &&
    this.uri.pathname[this.uri.pathname.length - 1] === '/'
      ? ''
      : '/'}${image}`;
  }
  return image;
};

Extractor.prototype.__images = function ($els, attrName, meta) {
  const self = this;
  return $els
    .map(function () {
      let _src = self.$(this).attr(attrName),
        src = _src && self._fixImageUrl(_src),
        result = src && {
          url: src,
          meta: meta && _.cloneDeep(meta)
        };
      return result;
    })
    .get();
};

Extractor.prototype._images = function (rootElementName, selector, attrName, meta) {
  return this.__images(this.$(rootElementName).find(selector), attrName, meta);
};

Extractor.prototype._val = function ($el) {
  return $el && ($el.attr('content') || $el.text());
};

Extractor.prototype._fixString = function (value) {
  return (value && value.trim().replace(/\n/g, ' ')) || value;
};

Extractor.prototype.meta = function (selector) {
  let value = '';
  try {
    value = this._val(this.$(`head [${selector}]`));
  } catch (e) {
    log.error(`Failed to extract meta ${selector}`, {
      url: this.uri.href,
      error: e.toString()
    });
  }
  return this._fixString(value);
};

Extractor.prototype.title = function () {
  let value = '';
  try {
    value =
      this.$('html meta[property="og:title"]').attr('content') ||
      this.$('html meta[property="twitter:title"]').attr('content') ||
      this.$('head title').text() ||
      this._val(
        this.$('body [itemscope]')
          .find('[itemprop="name"]')
          .first()
      ) ||
      this._val(
        this.$('body [itemscope]')
          .find('[itemprop="headline"]')
          .first()
      );
  } catch (e) {
    log.error('Failed to extract web page title', {
      url: this.uri.href,
      error: e.toString()
    });
  }
  return this._fixString(value);
};

Extractor.prototype.description = function () {
  let value = '';
  try {
    value =
      this.$('html meta[property="og:description"]').attr('content') ||
      this.$('html meta[property="twitter:description"]').attr('content') ||
      this.$('html meta[name="description"]').attr('content') ||
      this._val(
        this.$('body [itemscope]')
          .find('[itemprop="description"]')
          .first()
      );
  } catch (e) {
    log.error('Failed to extract web page description', {
      url: this.uri.href,
      error: e.toString()
    });
  }
  return this._fixString(value);
};

Extractor.prototype.images = function () {
  try {
    let images = _.chain([
      this._images('html', 'meta[property="twitter:image"]', 'content', { type: 'twitter', use: 'twitter', prio: 50 }),
      this._images('html', 'meta[name="twitter:image"]', 'content', { type: 'twitter', use: 'twitter', prio: 50 }),
      this._images('html', 'meta[property="og:image"]', 'content', { type: 'og', use: 'general', prio: 100 }),
      this._images('html', 'meta[name="og:image"]', 'content', { type: 'og', use: 'general', prio: 100 }),
      this._images('html', 'meta[itemprop="image"]', 'content', { type: 'itemprop', use: 'general' }),
      this._images('html', 'meta[itemprop="imageUrl"]', 'content', { type: 'itemprop', use: 'general' }),
      this._images('html', 'meta[itemprop="thumbnailUrl"]', 'content', { type: 'itemprop', use: 'general' }),
      this._images('body', 'img[data-pin-url][data-pin-description][data-pin-media][data-pin-id][data-pin-tag]', {
        type: 'bodyimg',
        use: 'pinterest',
        prio: 50
      }),
      this.__images(this.$('body [itemscope]').find('meta[itemprop="image"]'), 'content', {
        type: 'itemprop',
        use: 'general'
      }),
      this._images('body', 'img', 'src', { type: 'bodyimg', use: 'general' })
    ])
      .flatten()
      .filter(img => {
        return !!img;
      })
      .uniqBy('url')
      .value();

    images = images.map(i => {
      if (i.url && i.url.indexOf('https://plus.google.com//') === 0) {
        i.url = i.url.replace('https://plus.google.com//', 'https://');
      }
      i.url = imageTool.fixImageUrl(i.url);
      return i;
    });

    let prio = images.length;
    images.forEach(i => {
      i.meta.prio = (i.meta.prio || 0) + --prio;
    });

    return images;
  } catch (e) {
    log.error('Failed to extract web page images', {
      url: this.uri.href,
      error: e.toString()
    });
    return [];
  }
};

Extractor.prototype.video = function () {
  try {
    const embed = this.meta('property="og:video:url"') || this.meta('name="twitter:player"');
    // const type = this.meta('property="og:video:type"') || 'text/html';
    const type = 'application/x-shockwave-flash';
    const width = this.meta('property="og:video:width"') || this.meta('name="twitter:player:width"') || 640;
    const height = this.meta('property="og:video:height"') || this.meta('name="twitter:player:height"') || 320;
    return { embed, type, width, height };
  } catch (e) {
    log.error('Failed to extract web page videos', {
      url: this.uri.href,
      error: e.toString()
    });
    return null;
  }
};

Extractor.prototype.videos = function () {
  try {
    const videos = _.chain([
      this._images('html', 'meta[property="og:video:url"]', 'content'),
      this._images('html', 'meta[property="og:video"]', 'content')
    ])
      .flatten()
      .map('url')
      .filter(url => {
        return !!url;
      })
      .uniq()
      .value();
    return videos;
  } catch (e) {
    log.error('Failed to extract web page videos', {
      url: this.uri.href,
      error: e.toString()
    });
    return [];
  }
};
