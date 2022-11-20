const urlParser = require('url');

const embedRegEx = /^\/embed\/(.+)$/;
const youtubeRegEx = /^\/(.+)$/;

// curl -v "localhost:8080?url=https://www.youtube.com/watch?v=huRVCqOyDcU"
// curl -v "localhost:8080/video/proxy?url=https://www.youtube.com/watch?v=huRVCqOyDcU"
// curl -v "localhost:8080/video/proxy?url=xoxo"
// curl -v "localhost:8080?url=xoxo"
// curl -v "localhost:8080/video/proxy?url=https://vimeo.com/231941695"

exports.extractYoutubeVideoId = function extractYoutubeVideoId(url) {
  // https://youtu.be/huRVCqOyDcU
  // https://www.youtube.com/embed/huRVCqOyDcU
  // https://www.youtube.com/watch?v=huRVCqOyDcU
  // https://www.youtube.com/attribution_link?a=PTDtNAayU4w&u=/watch?v%3DIRdrt8nPyy8%26feature%3Dshare
  let videoId;
  if (url) {
    const { host, pathname, query } = urlParser.parse(url, true);

    if (['youtu.be', 'www.youtube.com'].indexOf(host) === -1) {
      return videoId;
    }

    switch (host) {
      case 'youtu.be':
        videoId = youtubeRegEx.test(pathname) && pathname.match(youtubeRegEx)[1];
        break;
      case 'www.youtube.com':
        videoId = (embedRegEx.test(pathname) && pathname.match(embedRegEx)[1]) || (pathname === '/watch' && query.v);
        break;
      default:
        break;
    }

    if (pathname === '/attribution_link' && query.u) {
      const q = urlParser.parse(query.u, true);
      videoId = q && q.query && q.pathname === '/watch' && q.query.v;
    }
  }
  return videoId;
};
