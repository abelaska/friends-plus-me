// @flow
/* eslint prefer-template: 0 */
import cheerio from 'cheerio';
import twitter from 'twitter-text';
import htmlToText from 'html-to-text';
import { AllHtmlEntities } from 'html-entities';

const TWEET_MAX_LEN = 280;
const entities = new AllHtmlEntities();

export const fixHtmlLines = (html: ?string): string => {
  html = (html && html.split(/<\s*br[^>]*\/?\s*>/).join('</p><p>')) || '';
  if (html.length && !html.match(/^<\s*p[^>]*\s*>/)) {
    html = `<p>${html}</p>`;
  }
  return html;
};

export const plainToHtml = (msg: ?string): string => {
  const lines = msg && msg.split('\n').map(line => entities.encode(line));
  msg = (lines && lines.join('</p><p>')) || '';
  if (!msg.match(/^<\s*p[^>]*\s*>/)) {
    msg = `<p>${msg}</p>`;
  }
  return msg;
};

export const replacePlusFromNames = (text: ?string): string => {
  const re = /(^|\s+?)\+((\w|\d)+?)/g;
  return (text && text.replace(re, '$1$2')) || '';
};

export const fixProfLinks = (html: ?string): string => {
  const $ = html && cheerio.load(html);
  if ($) {
    $('span[class="proflinkWrapper"]').replaceWith(function () {
      const $a = $(this).find('a[class="proflink"][oid]');
      return ($a && `<a href="${$a.attr('href')}">${$a.text()}</a>`) || '';
    });
  }
  return (
    ($ &&
      $.html()
        .replace('<html><head></head><body>', '')
        .replace('</body></html>', '')) ||
    ''
  );

  // const $el = html && cheerio.load(html)('a[class="proflink"][oid]');
  // return ($el && `<a href="${$el.attr('href')}">${$el.text()}</a>`) || '';
  // const re = /<span class="proflinkWrapper"><span class="proflinkPrefix">\+<\/span><a(.*)?[ ]+href="(.*?)".*?>(.*?)<\/a><\/span>/g;
  // return (html && html.replace(re, '<a href="$2">$3</a>')) || '';
};

export const replaceProfLinksWithValue = (html: ?string): string => {
  const $ = html && cheerio.load(html);
  if ($) {
    $('span[class="proflinkWrapper"]').replaceWith(function () {
      const $a = $(this).find('a[class="proflink"][oid]');
      return ($a && $a.text()) || '';
    });
  }
  return (
    ($ &&
      $.html()
        .replace('<html><head></head><body>', '')
        .replace('</body></html>', '')) ||
    ''
  );

  // const re = /<span class="proflinkWrapper"><span class="proflinkPrefix">\+<\/span><a(.*)?[ ]+href="(.*?)".*?>(.*?)<\/a><\/span>/g;
  // return (html && html.replace(re, '$3')) || ''; // $1...garbage, $2...odkaz, $3...value
};

export const replaceProfLinksWithOid = (html: ?string): string => {
  const re = /<span class="proflinkWrapper"><span class="proflinkPrefix">\+<\/span><a.*?oid="(.*?)".*?>.*?<\/a><\/span>/g;
  return (html && html.replace(re, '+$1')) || ''; // $1...oid
};

export const replaceAnchorLinksWithValue = (html: ?string): string => {
  const re = /<a\s+href="(.*?)"\s+class="ot-anchor"\s+rel="nofollow"\s*?>(.*?)<\/a>/g;
  const re2 = /<a\s+href="(.*?)"\s+class="ot-anchor"\s*?>(.*?)<\/a>/g;
  return (html && html.replace(re, '$2').replace(re2, '$2')) || ''; // $1...odkaz, $2...value
};

export const replaceHashtagLinksWithValue = (html: ?string): string => {
  const re = /<a\s+rel="nofollow"\s+class="ot-hashtag"\s+href="(.*?)".*?>(.*?)<\/a>/g;
  const re2 = /<a\s+class="ot-hashtag"\s+href="(.*?)".*?>(.*?)<\/a>/g;
  return (html && html.replace(re, '$2').replace(re2, '$2')) || ''; // $1...odkaz, $2...value
};

export const stripEmptyLinesFromTheStartAndEnd = (html: ?string): string => {
  html = (html || '').trim().replace(/<p>\s*<\/p>/, '<p></p>');
  let oldHtml;
  do {
    oldHtml = html;
    if (html !== '<p></p>') {
      html = html.replace(/<p>\s*<\/p>$/, '').replace(/^<p>\s*<\/p>/, '');
    }
  } while (oldHtml !== html);
  return html;
};

export const htmlToPlain = (html: ?string): string => {
  // html = replaceHashtagLinksWithValue(replaceProfLinksWithValue(replaceAnchorLinksWithValue(html)));
  html = replaceHashtagLinksWithValue(replaceProfLinksWithValue(replaceAnchorLinksWithValue(html)));
  html = htmlToText.fromString(html, {
    wordwrap: false,
    preserveNewlines: true,
    ignoreHref: false,
    noLinkBrackets: true,
    hideLinkHrefIfSameAsText: true,
    singleNewLineParagraphs: true
  });
  html = entities.decode(html).trim();
  return html;
};

export const concatSentencesHtml = (s1: ?string, s2: ?string, middleText: ?string): string => {
  s1 = fixHtmlLines(s1);
  s2 = fixHtmlLines(s2);
  return s1 + (s2 && s1 ? '<p>' + ((middleText && '---') || '') + '<p>' : '') + s2;
};

export const concatSentences = (s1: ?string, s2: ?string, middleText: ?string): string => {
  s1 = (s1 && htmlToPlain(s1)) || '';
  s2 = (s2 && htmlToPlain(s2)) || '';
  return s1 + (s2 && s1 ? '\n' + ((middleText && '---') || '') + '\n' : '') + s2;
};

export const concatShareMessageHtml = (s1: ?string, s2: ?string, middleText: ?string): string => {
  s1 = fixHtmlLines(s1);
  s2 = fixHtmlLines(s2);
  return s1 + ((s2 && ((s1 && '<p></p><p>') + (middleText || '---') + '</p><p></p>' || '') + s2) || '');
};

export const concatSentences2 = (s1: ?string, s2: ?string): string => {
  s1 = (s1 && htmlToPlain(s1)) || '';
  s2 = (s2 && htmlToPlain(s2)) || '';
  if (s1 === s2) {
    return s1;
  }
  if (s2.length > 0 && s1.length > 0) {
    s2 = ` (${s2})`;
  }
  return s1 + s2;
};

export const concatShareSentences2 = (s1: ?string, s2: ?string): string => {
  s1 = (s1 && htmlToPlain(s1)) || '';
  s2 = (s2 && htmlToPlain(s2)) || '';
  return s1 === s2 ? s1 : s1 + (s2.length > 0 ? `${s1.length > 0 ? ' ' : ''} ${s2}` : '');
};

export const concatShareMessage = (s1: ?string, s2: ?string, middleText: ?string): string => {
  s1 = (s1 && htmlToPlain(s1)) || '';
  s2 = (s2 && htmlToPlain(s2)) || '';
  return (
    s1 +
    (s2.length > 0
      ? (s1.length > 0 ? '\n' + ((middleText && '\n') || '') : '') +
        (middleText ? middleText + '\n' : '---') +
        '\n' +
        s2
      : '')
  );
};

export const truncate = (text: ?string, maxLength: number, truncateToLength: ?number): string => {
  maxLength = Math.max(0, (truncateToLength || maxLength) - 1);
  if (!text || text.length <= maxLength) {
    return text || '';
  }
  const parts = text.split(/[ \t]/);
  let len = parts.reduce((l, p) => l + p.length, 0) + parts.length;
  while (parts.length && len > maxLength) {
    len -= parts.pop().length + (parts.length > 1 ? 1 : 0);
  }
  return `${(parts.length && parts.join(' ').trim()) || text.substring(0, maxLength)}…`;
};

export const middleConcat = (s1: ?string, s2: ?string, middleText: ?string, lineBreaker: ?string): string => {
  if (!lineBreaker) {
    lineBreaker = '\n';
  }
  s1 = s1 == null ? '' : s1;
  s2 = s2 == null ? '' : s2;
  return s1 === s2
    ? s1
    : s1 +
        (s2.length > 0
          ? (s1.length > 0
              ? lineBreaker + ((middleText ? lineBreaker + middleText + lineBreaker : '') || '---') + lineBreaker
              : '') + s2
          : '');
};

export const unicodeTextShortener = (s: string, maxLength: number) => {
  if (!s) {
    return '';
  }
  let c;
  let cl;
  let cn;
  let rl = 0;
  const a = [];
  for (let i = 0; i < s.length; i++) {
    c = s.charAt(i);
    cn = c.charCodeAt(i);
    cl = cn < 0x0100 ? 1 : cn < 0x0800 ? 2 : cn <= 0xffff ? 3 : 4;
    if (rl + cl > maxLength) {
      break;
    } else {
      a.push(c);
    }
    rl += cl;
  }
  return a.join('');
};

export const tweetLength = (msg: string) => twitter.getTweetLength(msg);

export const shortenLinkedinHtml = (post: Object) => {
  const maxLength = 1250;
  let html = post.html || '';
  const plain = htmlToPlain(html);
  if (plain.length > maxLength) {
    html = plainToHtml(truncate(plain, maxLength));
  }
  return html;
};

export const shortenFacebookHtml = (post: Object) => {
  const maxLength = 10000;
  let html = post.html || '';
  const plain = htmlToPlain(html);
  if (plain.length > maxLength) {
    html = plainToHtml(truncate(plain, maxLength));
  }
  return html;
};

export const shortenTweetHtml = (post: Object) => {
  let html = post.html || '';
  const attachedLinkUrl = (post.attachments && post.attachments.link && post.attachments.link.url) || '';
  const attachedLinkShortenedUrl =
    (post.attachments && post.attachments.link && post.attachments.link.short && post.attachments.link.short.url) || '';
  const attachedLinkFound =
    (attachedLinkUrl && html.indexOf(attachedLinkUrl) > -1) ||
    (attachedLinkShortenedUrl && html.indexOf(attachedLinkShortenedUrl) > -1);
  const attachLink = (!attachedLinkFound && (attachedLinkUrl || attachedLinkShortenedUrl)) || '';
  const attachmentLength = (attachLink && tweetLength(' ' + attachLink)) || 0;
  const maxLength = TWEET_MAX_LEN - attachmentLength;

  let plain = htmlToPlain(html);
  if (plain.length > maxLength) {
    plain = htmlToPlain(stripEmptyLinesFromTheStartAndEnd(html));
    const lines = plain.split('\n');
    if (lines.length > 2 && lines[1].trim() === '') {
      plain = lines[0];
    }
    plain = plain.length > maxLength ? truncate(plain, maxLength) : plain;
    html = plainToHtml(plain);
  }

  return html;
};
