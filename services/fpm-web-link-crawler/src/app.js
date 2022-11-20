/* global console:false, process:false */
require("app-root-dir").set(__dirname);

require("./raven");

const express = require("express");
const cors = require("cors");
const responseTime = require("response-time");
const bodyParser = require("body-parser");
const config = require("@fpm/config");
const log = require("@fpm/logging").default;

const crawler = require("./lib/crawler");
const videoProxy = require("./lib/videoProxy");
const gae = require("./lib/gae");

const app = express();
const http = require("http").Server(app);

const router = express.Router();
const isProd = config.get("isProd");
const isDev = !isProd;
const httpPort = process.env.PORT || config.get("http:port");
const httpAddress = config.get("http:bind") || "localhost";

app
  .disable("x-powered-by")
  .enable("trust proxy")
  .use(responseTime())
  .use(
    require("morgan")(
      ':method :url :status :res[content-length] - :response-time ms ":referrer" ":user-agent"',
      {
        skip: (req) => {
          const path = req.path.toLowerCase();
          return (
            [
              "/health",
              "/favicon.ico",
              "/robots.txt",
              "/apple-touch-icon.png",
            ].indexOf(path) > -1 || path.indexOf("/_ah/") === 0
          );
        },
      }
    )
  )
  // .use((req, res, next) => {
  //   res.set('X-Link-Crawler', config.get('GAE_MODULE_VERSION') || config.get('version'));
  //   res.set('X-Instance', config.get('HOSTNAME') || config.get('instance-id'));
  //   next();
  // })
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true, limit: "32kB" }))
  .use(
    express.static(`${__dirname}/../public`, {
      maxAge: isProd ? 1 * 31 * 24 * 60 * 60 * 1000 : 0,
      setHeaders(res /* , path */) {
        res.set("access-control-allow-origin", "*");
        res.set("x-frame-options", "SAMEORIGIN");
        res.set("x-content-type-options", "nosniff");
        res.set("x-xss-protection", "1; mode=block");
      },
    })
  );

if (isDev) {
  app.use(require("errorhandler")());
}

app.use("/", router);

router.all("*", cors());

gae(router);
crawler(router);
videoProxy(router);

// error handler must be registered as last
app.use((err, req, res, next) => {
  if (err) {
    log.error("Uncaught error", {
      error: err,
      stack: err.stack,
    });
    res.status(500).end();
  } else {
    next();
  }
});

// HTTP(S)
http.listen(httpPort, httpAddress, () => {
  log.info(`HTTP server listening on port ${httpAddress}:${httpPort}`);
});

// // var url = 'https://www.psychologytoday.com/blog/the-depression-cure/200907/dietary-sugar-and-mental-illness-surprising-link';
// // var url = 'http://jighinfo-empresarial.blogspot.com/2015/09/el-petroleo-de-texas-cae-77-y-cierra-en.html?spref=tw';
// // var url = 'http://coyotitos.com/ganadores-concurso-de-fotografia-de-paisajes-2015/?utm_campaign=whatsapp-espanol&utm_source=gplus&utm_medium=sil';
// var url = 'https://google.com';
// // var url = 'http://www.theguardian.com/travel/2013/sep/17/top-10-national-parks-california';
// // var url = 'https://friendsplus.me';
// require('request')('http://localhost:'+httpPort+'/?url='+url, function(err, rsp, body) {
//   console.log('(0.)',body);
//   require('request')('http://localhost:'+httpPort+'/?url='+url, function(err, rsp, body) {
//     console.log('(1.)',body);
//     process.exit(0);
//   });
// })
