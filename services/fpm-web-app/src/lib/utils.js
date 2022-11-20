/*jshint node: true */
'use strict';

const config = require('@fpm/config');
const S = require('string');
const cheerio = require('cheerio');
const urlParser = require('url');
const request = require('request').defaults({ pool: { maxSockets: Infinity } });

function is(o) {
  return o !== undefined && o !== null;
}
exports.is = is;

function isNot(o) {
  return !is(o);
}
exports.isNot = isNot;

function isNotEmptyString(s) {
  return s !== undefined && s !== null && s.length > 0;
}
exports.isNotEmptyString = isNotEmptyString;

function isEmptyString(s) {
  return !isNotEmptyString(s);
}
exports.isEmptyString = isEmptyString;

function arrayContains(a, obj) {
  if (a) {
    for (var i = 0; i < a.length; i++) {
      if (a[i] === obj) {
        return true;
      }
    }
  }
  return false;
}
exports.arrayContains = arrayContains;

function arrayFindAndRemoveItem(a, obj) {
  if (a) {
    for (var i = 0; i < a.length; i++) {
      if (a[i] === obj) {
        a.splice(i, 1);
        return true;
      }
    }
  }
  return false;
}
exports.arrayFindAndRemoveItem = arrayFindAndRemoveItem;

function textShortener(s, maxLength) {
  if (s && s.length > 0) {
    var c, cl, cn,
        a = [],
        rl = 0,
        l = s.length;
    for (var i = 0; i < l; i++) {
      c = s.charAt(i);
      cn = c.charCodeAt();
      cl = cn < 0x0100 ? 1 : (cn < 0x0800 ? 2 : (cn <= 0xffff ? 3 : 4));
      if (rl + cl > maxLength) {
        break;
      } else {
        a.push(c);
      }
      rl += cl;
    }
    return a.join('');
  } else {
    return '';
  }
}
exports.textShortener = textShortener;

function prepareText(text) {
  if (text === undefined) {
    return undefined;
  }
  if (text === null) {
    return null;
  }
  /*jshint -W044*/
  text = S(text).decodeHtmlEntities().replaceAll(/<\s*br[^>]*\/?\s*>/g, '\n').stripTags().s.replace(/[ \t]+/g, ' ').replace(/^[ \t]+|[ \t]+$/g, '')
  .replace(/&([#][x]*[0-9]+);/g, function(m, n) {
    var code;
    if (n.substr(0, 1) === '#') {
      if (n.substr(1, 1) === 'x') {
        code = parseInt(n.substr(2), 16);
      } else {
        code = parseInt(n.substr(1), 10);
      }
    }
    return (code === undefined || isNaN(code)) ?
      '&' + n + ';' : String.fromCharCode(code);
  });
  text = S(text).trim().s;
  return text;
}
exports.prepareText = prepareText;

function middleConcat(s1, s2, middleText, lineBreaker) {
  if (!lineBreaker) {
    lineBreaker = '\n';
  }
  /*jshint -W041*/
  s1 = s1 === undefined || s1 === null ? '' : s1;
  s2 = s2 === undefined || s2 === null ? '' : s2;
  return s1 === s2 ? s1 : s1+(s2.length > 0 ? (s1.length > 0 ? lineBreaker+((middleText ? lineBreaker+middleText+lineBreaker : '') || '---')+lineBreaker:'')+s2 : '');
}
exports.middleConcat = middleConcat;

function concatSentences(s1, s2) {
  /*jshint -W041*/
  s1 = s1 === undefined || s1 === null ? '' : prepareText(s1);
  s2 = s2 === undefined || s2 === null ? '' : prepareText(s2);
  if (s1 === s2) {
    return s1;
  } else {
    if (s2.length > 0 && s1.length > 0) {
      s2 = ' (' + s2 + ')';
    }
    return s1+s2;
  }
}
exports.concatSentences = concatSentences;

function concatShareSentences(s1, s2) {
  /*jshint -W041*/
  s1 = s1 === undefined || s1 === null ? '' : prepareText(s1);
  s2 = s2 === undefined || s2 === null ? '' : prepareText(s2);
  return s1 === s2 ? s1 : s1 + (s2.length > 0 ? (s1.length > 0 ? ' ' : '') + 'RT ' + s2 : '');
}
exports.concatShareSentences = concatShareSentences;

function isImageFileName(s) {
  if (s && s.length > 0) {
    s = S(s.toLowerCase()).collapseWhitespace().trim();
    return s.endsWith('.3gp') || s.endsWith('.jpg') || s.endsWith('.jpeg') || s.endsWith('.gif') || s.endsWith('.png') || s.endsWith('.bmp');
  }
  return false;
}
exports.isImageFileName = isImageFileName;

function merge(obj, mergeWith) {
  if (mergeWith) {
    for (var prop in mergeWith) {
      if (mergeWith.hasOwnProperty(prop)) {
        if (obj[prop] === undefined || obj[prop] === null) {
          obj[prop] = mergeWith[prop];
        } else {
          merge(obj[prop], mergeWith[prop]);
        }
      }
    }
  }
}
exports.merge = merge;

function mergeRecursive(obj1, obj2, ignoreKeys) {
  for (var p in obj2) {
    if (!arrayContains(ignoreKeys, p)) {
      try {
        // Property in destination object set; update its value.
        if (obj2[p].constructor === Object) {
          obj1[p] = mergeRecursive(obj1[p], obj2[p]);
        } else {
          obj1[p] = obj2[p];
        }
      } catch(e) {
        // Property in destination object not set; create it and set its value.
        obj1[p] = obj2[p];
      }
    }
  }
  return obj1;
}
exports.mergeRecursive = mergeRecursive;

function clone(obj, ignoreKeys) {
  return mergeRecursive({}, obj, ignoreKeys);
}
exports.clone = clone;

function selectImage(attachment) {
  var img = attachment ? attachment.image : null;
  if (attachment && attachment.fullImage && isImageFileName(attachment.fullImage.url)) {
    img = attachment.fullImage;
  }
  return img;
}
exports.selectImage = selectImage;

function fixImageUrl(url, sizeOption) {
  if (url) {
    // upravit rozliseni fotky na originalni
    var parts,
        size = sizeOption || 's0',
        googleusercontentHostRegexp = /lh[0-9]*.googleusercontent.com/,
        u = urlParser.parse(url, true);
    if (u.host && googleusercontentHostRegexp.test(u.host)) {
      parts = u.pathname.split('/');
      switch (parts.length) {
      case 3: // 2 & parts[0].toLowerCase() === 'proxy'
        if (parts[1].toLowerCase() === 'proxy') {
          var params = parts[2].split('=');
          if (params.length === 2) {
            params[1] = size;
            parts[2] = params.join('=');
          }
        }
        break;
      case 6:
        parts.splice(5, 0, size);
        break;
      case 7:
        parts[5] = size;
        break;
      }
      u.pathname = parts.join('/');
      url = urlParser.format(u);
    }
  }
  return url;
}
exports.fixImageUrl = fixImageUrl;

function getImageUrl(attachment, sizeOption) {
  var img = selectImage(attachment);
  return img ? fixImageUrl(img.url, sizeOption) : undefined;
}
exports.getImageUrl = getImageUrl;

exports.fixGoogleUrl = function(url) {
  var u = urlParser.parse(url || '', true);
  if (u.host) {
    return url;
  } else {
    if (url) {
      return 'https://plus.google.com' + (url[0] === '/' ? '' : '/') + url;
    } else {
      return url;
    }
  }
};

function fetchRemoteImageFileSize(uri, callback, timeout){
  request({
    type: 'HEAD',
    uri: uri,
    timeout: timeout || config.get('defaults:network:timeout')
  }, function(err, res/*, body*/){
    if (res) {
      callback(parseInt(res.headers['content-length'] || '-1'), res.headers['content-type']);
    } else {
      callback(-1);
    }
  });
}
exports.fetchRemoteImageFileSize = fetchRemoteImageFileSize;

function urlImageWithLimitedSize(uri, maxFileSize, callback, timeout, sizes){
  var index = 0;

  sizes = sizes || ['s0','s4096','s3072','s2048','s1024'];

  var tryUri = function() {
    var fixedUri = fixImageUrl(uri, sizes[index]);
    if (fixedUri === uri && index > 0) {
      callback(uri);
    } else {
      fetchRemoteImageFileSize(fixedUri, function(contentLength) {
        if (contentLength > maxFileSize && ++index < sizes.length) {
          tryUri();
        } else {
          callback(fixedUri);
        }
      }, timeout);
    }
  };

  tryUri();
}
exports.urlImageWithLimitedSize = urlImageWithLimitedSize;

function findActivityAttachments(attachments, objectType) {
  var items = [];
  if (attachments) {
    for (var i = 0; i < attachments.length; i++) {
      var attachment = attachments[i];
      if (attachment.objectType === objectType) {
        items.push(attachment);
      }
    }
  }
  return items;
}
exports.findActivityAttachments = findActivityAttachments;

function findActivityAttachment(attachments, objectType, requiredProperty) {
  var items = findActivityAttachments(attachments, objectType);
  if (items.length > 0) {
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item.hasOwnProperty(requiredProperty)) {
        return item;
      }
    }
    return items[0];
  } else {
    return null;
  }
}
exports.findActivityAttachment = findActivityAttachment;

function fixProfLinks(html) {
  var re = /<span class=\"proflinkWrapper\"><span class=\"proflinkPrefix\">\+<\/span><a href="(.*?)".*?>(.*?)<\/a><\/span>/g;
  if (html) {
    html = html.replace(re, '<a href="$1">$2</a>');
  }
  return html;
}
exports.fixProfLinks = fixProfLinks;

function replaceProfLinksWithValue(html) {
  var re = /<span class=\"proflinkWrapper\"><span class=\"proflinkPrefix\">\+<\/span><a href="(.*?)".*?>(.*?)<\/a><\/span>/g;
  // $1...odkaz, $2...value
  if (html) {
    html = html.replace(re, '$2');
  }
  return html;
}
exports.replaceProfLinksWithValue = replaceProfLinksWithValue;

function replaceProfLinksWithOid(html) {
  var re = /<span class=\"proflinkWrapper\"><span class=\"proflinkPrefix\">\+<\/span><a.*?oid="(.*?)".*?>.*?<\/a><\/span>/g;
  // $1...oid
  if (html) {
    html = html.replace(re, '+$1');
  }
  return html;
}
exports.replaceProfLinksWithOid = replaceProfLinksWithOid;

function replacePlusFromNames(text) {
  var re = /(^|\s+?)\+((\w|\d)+?)/g;
  if (text) {
    text = text.replace(re, '$1$2');
  }
  return text;
}
exports.replacePlusFromNames = replacePlusFromNames;

exports.escapeRegExp = function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};

exports.replaceAutocompletedInputWithUid = function replaceAutocompletedInputWithUid(html, prefix) {
  var $ = cheerio.load(html);
  $('input[class*="autocompleted-"][data-uid]').replaceWith(function() {
    return (prefix || '') + $(this).attr('data-uid');
  });
  return $.html();
};

exports.replaceAutocompletedInputWithValue = function replaceAutocompletedInputWithValue(html, replacePlus) {
  var $ = cheerio.load(html);
  $('input[class*="autocompleted-"][value]').replaceWith(function() {
    return replacePlus ? replacePlusFromNames($(this).attr('value')) : $(this).attr('value');
  });
  return $.html();
};

exports.deformatGoogleHtml = function deformatGoogleHtml(text) {
  var s = text
    .replace(/<\s*\/\s*p[^>]*\s*>\s*<\s*p[^>]*\s*>/gm, '\n')
    .replace(/<\s*\/?\s*p[^>]*\s*>/gm, '')
    .replace(/<\s*br[^>]*\/?\s*>/gm, '\n')
    .replace(/<\/?b>/gm, '*')
    .replace(/<\/?strong>/gm, '*')
    .replace(/<\/?i>/gm, '_')
    .replace(/<\/?del>/gm, '-');
  return prepareText(replaceProfLinksWithOid(s));
};

exports.shortObjectId = function shortObjectId(objId) {
  objId = objId ? objId.toString() : null;
  return objId && objId.length >= 8 ? objId.substr(0, 8) : objId;
};

exports.prepareVideoUrl = function prepareVideoUrl(url) {
  //https://www.youtube.com/embed/WHsHKzYOV2E
  //http://www.youtube.com/watch?v=WHsHKzYOV2E
  var videoId,
      u = urlParser.parse(url, true),
      embedRegEx = /^\/embed\/(.+)$/,
      youtubeRegEx = /^\/(.+)$/;

  if (u.host === 'youtu.be') {
    if (youtubeRegEx.test(u.pathname)) {
      videoId = u.pathname.match(youtubeRegEx)[1];
      u.host = 'www.youtube.com';
    }
  } else
  if (u.host === 'www.youtube.com') {
    if (u.pathname === '/watch' && u.query.v) {
      videoId = u.query.v;
    } else
    if (embedRegEx.test(u.pathname)) {
      videoId = u.pathname.match(embedRegEx)[1];
    }
  }

  if (videoId) {
    u.pathname = '/v/'+videoId;
    u.query = {autohide: 1, version: 3};
    u.search = '';
  }
  //https://www.youtube.com/v/WHsHKzYOV2E?autohide=1&version=3

  if (u.protocol !== 'https:') {
    u.protocol = 'https:';
  }

  return urlParser.format(u);
};

exports.enhanceFacebookLink = function enhanceFacebookLink(link) {
  var p = urlParser.parse(link, true);
  p.query = p.query || {};
  p.query[new Date().valueOf()] = 1;
  return urlParser.format(p);
};

exports.capitalize = function capitalize(str) {
  return str.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
};