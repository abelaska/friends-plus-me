const log = require('@fpm/logging').default;
const crawlVideo = require('./crawlVideo');

module.exports = function videoProxy(router) {
  router.get('/video/proxy', (req, res) => {
    const url = req.query.url;

    if (!url) {
      return res.status(404).end();
    }

    crawlVideo({ url }, (err, reply, isFromCache) => {
      if (err) {
        log.error(`VideoProxy: ${url}`, {
          isFromCache,
          reply,
          error: err
        });

        return res.status(417).end(); // 417 Expectation Failed
      }

      res.set('X-Cache', isFromCache ? 'HIT' : 'MISS');

      return res.send(reply.html);
    });
  });
};
