import urlParser from 'url';

const GoogleusercontentHostRegExp = /lh[0-9]*.googleusercontent.com/;
const BlogspotHostRegExp = /[0-9]+.bp.blogspot.com/;

export const fixImageUrl = (url, sizeOption) => {
  if (!url) {
    return url;
  }
  let parts;
  const size = sizeOption || 's0';
  const u = urlParser.parse(url, true);
  if (u.host && (GoogleusercontentHostRegExp.test(u.host) || BlogspotHostRegExp.test(u.host))) {
    parts = u.pathname.split('/');
    switch (parts.length) {
      case 3: // 2 & parts[0].toLowerCase() === 'proxy'
        if (parts[1].toLowerCase() === 'proxy') {
          const params = parts[2].split('=');
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
      default:
        break;
    }
    u.pathname = parts.join('/');
    url = urlParser.format(u);
  }
  return url;
};
