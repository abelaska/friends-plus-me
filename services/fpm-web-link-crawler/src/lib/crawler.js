/* jshint node: true */

const { URL } = require('url');
const crawl = require('./crawl');
const log = require('@fpm/logging').default;

module.exports = router => {
  router.get('/', (req, res) => {
    const { url } = req.query;
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).end();
    }
    crawl({ url }, (error, reply, isFromCache) => {
      if (error) {
        log.error(`Crawl: ${url}`, { isFromCache, reply, error });
        return res.status(417).end(); // 417 Expectation Failed
      }
      res.set('X-Cache', isFromCache ? 'HIT' : 'MISS');
      res.json(reply);
    });
  });
};
