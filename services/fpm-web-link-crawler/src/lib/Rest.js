/* jshint node: true */

const http = require('http');
const https = require('https');
const url = require('url');
const config = require('@fpm/config');

const Rest = (module.exports = function Rest() {
  this.defaultTimeout = config.get('defaults:network:timeout') || 15000;
  return this;
});

/* options:{
  url: string,
  timeout: msecs,
  headers: {headerName:headerValue,...}
} */
Rest.prototype.download = function (options, callback, doNotConvertBodyToBuffer) {
  if (!options.headers) {
    options.headers = {};
  }

  options.headers['Accept-Charset'] = 'UTF-8';

  let req,
    tid,
    aborted = false,
    completed = false,
    tm = new Date(),
    u = url.parse(options.url),
    timeout = options.timeout || this.defaultTimeout,
    secure = u.protocol === 'https:',
    opts = {
      hostname: u.hostname,
      port: u.port || (secure ? 443 : 80),
      path: u.path,
      requestCert: false,
      rejectUnauthorized: false,
      headers: options.headers,
      encoding: null
    },
    client = secure ? https : http;

  function startTimeoutTimer() {
    tid = setTimeout(() => {
      if (!aborted && !completed) {
        tm = new Date() - tm;

        aborted = true;

        if (req) {
          req.abort();
        }

        const e = new Error('ESOCKETTIMEDOUT');
        e.code = 'ESOCKETTIMEDOUT';

        callback(e, null, null, tm);
      }
    }, timeout);
  }

  function stopTimeoutTimer() {
    if (tid) {
      clearTimeout(tid);
      tid = null;
    }
  }

  function onError(err) {
    stopTimeoutTimer();

    if (!aborted && !completed) {
      tm = new Date() - tm;

      aborted = true;

      req.abort();

      callback(err, null, null, tm);
    }
  }

  startTimeoutTimer();

  req = client
    .get(opts)
    .on('socket', socket => {
      socket.setTimeout(timeout);
      socket.on('timeout', () => {
        aborted = true;

        tm = new Date() - tm;

        stopTimeoutTimer();

        req.abort();

        const e = new Error('ESOCKETTIMEDOUT');
        e.code = 'ESOCKETTIMEDOUT';

        callback(e, null, null, tm);
      });
    })
    .on('response', res => {
      res.setEncoding('binary');

      let body = '';

      res
        .on('error', onError)
        .on('data', chunk => {
          body += chunk;

          if (options.maxDownloadSize > 0 && body.length >= options.maxDownloadSize) {
            res.destroy();
          }
        })
        .on('end', () => {
          completed = true;

          tm = new Date() - tm;

          stopTimeoutTimer();

          callback(null, res, doNotConvertBodyToBuffer ? body : new Buffer(body, 'binary'), tm);
        });
    })
    .on('error', onError);
};
