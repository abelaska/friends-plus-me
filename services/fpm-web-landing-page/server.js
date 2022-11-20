const express = require('express');
const nextjs = require('next');
const request = require('request');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT, 10) || 3000;
const app = nextjs({ dev });
const handle = app.getRequestHandler();

const reverseProxyPaths = ['/1/braintree/webhooks', '/1/paypal/ipn/callback'];

const reverseProxy = path => (req, res) => {
  req.pipe(
    request(`https://app.friendsplus.me${path}`, (error, response /* , body */) => {
      const status = error || !response || !response.statusCode ? 500 : response.statusCode;
      if (error) {
        console.error(`Failed to reverse proxy path ${path}, status:${status}`, { stack: error.stack });
      }
      return res.status(status).end();
    })
  );
};

app.prepare().then(() => {
  const server = express();
  server.set('x-powered-by', false);

  server.get('/health', (req, res) => res.send('ok'));

  server.use((req, res, next) => {
    req.connection.proxySecure = true;
    res.set('x-frame-options', 'SAMEORIGIN');
    res.set('x-content-type-options', 'nosniff');
    res.set('x-xss-protection', '1; mode=block');
    next();
  });

  server.use(
    express.static(`${__dirname}/static`, {
      setHeaders(res /* , path */) {
        res.set('access-control-allow-origin', '*');
      }
    })
  );

  server.get('/premium', (req, res) => res.redirect(301, '/pricing'));
  server.get('/team', (req, res) => res.redirect(301, '/about'));
  server.get('/contact', (req, res) => res.redirect(301, '/about'));
  server.get('/help', (req, res) => res.redirect(301, 'http://help.friendsplus.me'));
  server.get('/faq', (req, res) => res.redirect(301, 'http://help.friendsplus.me'));
  server.get('/privacy', (req, res) => res.redirect(301, 'http://www.iubenda.com/privacy-policy/367858'));
  server.get('/plus', (req, res) => res.redirect(301, 'https://plus.google.com/+FriendsPlusMe'));
  server.get('/twitter', (req, res) => res.redirect(301, 'https://twitter.com/FriendsPlusMe'));
  server.get('/facebook', (req, res) => res.redirect(301, 'https://www.facebook.com/FriendsPlusMe'));
  server.get('/share', (req, res) => res.redirect(301, 'https://app.friendsplus.me/share'));
  server.get('/partner/:partner', (req, res) =>
    res.redirect(301, `https://app.friendsplus.me/partner/${req.params.partner}`)
  );

  reverseProxyPaths.map(path => server.post(path, reverseProxy(path)));

  server.get('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(port, err => {
    if (err) throw err;
    console.log(`Ready on http://localhost:${port}`);
  });
});
