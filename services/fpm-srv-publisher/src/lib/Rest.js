/* jshint node: true, esversion: 6 */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const http = require('http');
const https = require('https');
const uuid = require('uuid');
const qs = require('querystring');
const _ = require('underscore');
const url = require('url');
const Agents = require('./Agents');

var Rest = module.exports = function Rest(agent) {
  this.agent = this._agent(agent);
  this.defaultTimeout = config.get('defaults:network:timeout') || 15000;
  return this;
};

/*options:{
  url: string,
  data: object,
  timeout: msecs,
  headers: {headerName:headerValue,...}
}*/
Rest.prototype.form = function(options, callback) {

  if (!options.headers) {
    options.headers = {};
  }

  options.data = qs.stringify(options.data).toString('utf8');
  options.headers.Accept = 'application/json';
  options.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=utf-8';

  this.post(options, callback);
};

/*options:{
  url: string,
  data: object,
  timeout: msecs,
  headers: {headerName:headerValue,...}
}*/
Rest.prototype.json = function(options, callback) {

  if (!options.headers) {
    options.headers = {};
  }

  options.data = JSON.stringify(options.data);
  options.headers.Accept = 'application/json';
  options.headers['Content-Type'] = 'application/json';

  this.post(options, callback);
};

Rest.prototype.multipart = function(options, callback) {

  if (!options.headers) {
    options.headers = {};
  }

  var body = [],
      boundary = uuid();

  options.data.forEach(function (part) {
    var partBody = part.body;
    delete part.body;
    var preamble = '--' + boundary + '\r\n';
    Object.keys(part).forEach(function (key) {
      preamble += key + ': ' + part[key] + '\r\n';
    });
    preamble += '\r\n';
    body.push(new Buffer(preamble));
    body.push(new Buffer(partBody));
    body.push(new Buffer('\r\n'));
  });
  body.push(new Buffer('--' + boundary + '--'));

  options.data = body.join('');
  options.headers['Content-Type'] = 'multipart/mixed; boundary=' + boundary;

  this.post(options, callback);
};

/*options:{
  url: string,
  data: string,
  timeout: msecs,
  headers: {headerName:headerValue,...}
}*/
Rest.prototype.post = function(options, callback) {
  options.method = 'POST';
  this.method(options, callback);
};

/*options:{
  url: string,
  data: string,
  timeout: msecs,
  headers: {headerName:headerValue,...}
}*/
Rest.prototype.delete = function(options, callback) {
  options.method = 'DELETE';
  this.method(options, callback);
};

/*options:{
  url: string,
  timeout: msecs,
  headers: {headerName:headerValue,...}
}*/
Rest.prototype.get = function(options, callback) {
  options.method = 'GET';
  this.method(options, callback);
};

Rest.prototype._agent = function(agent) {
  if (_.isString(agent)) {
    agent = Agents(agent);
  }
  return agent || false;
};

/*options:{
  method: string,
  url: string,
  data: string,
  timeout: msecs,
  headers: {headerName:headerValue,...}
}*/
Rest.prototype.method = function(options, fcallback) {

  if (!options.headers) {
    options.headers = {};
  }

  options.headers['Accept-Charset'] = 'UTF-8';
  options.headers['Content-Length'] = options.data ? Buffer.byteLength(options.data, 'utf8') : 0;

  function callback(err, res, body, tm) {
    if (fcallback) {
      var cb = fcallback;
      fcallback = null;
      cb(err, res, body, tm);
    }
  }

  var tid,
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
        method: options.method,
        headers: options.headers,
        agent: this.agent || this._agent(options.agent)
      },
      client = (secure ? https : http);

  function startTimeoutTimer() {
    tid = setTimeout(function() {
      if (!aborted && !completed) {

        tm = new Date() - tm;

        aborted = true;

        req.abort();

        var e = new Error('ESOCKETTIMEDOUT');
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

  var req = client.request(opts, function(res) {
        res.setEncoding('utf8');

        var body = '';
        res.on('data', function(chunk) {
          body += chunk.toString('utf8');
        });

        res.on('end', function() {

          completed = true;

          tm = new Date() - tm;

          stopTimeoutTimer();

          var isNotCalled = true,
              contentType = res && res.headers ? res.headers['content-type'] || '' : '',
              isResponseJson = contentType.toLowerCase().indexOf('application/json') > -1;

          if (body && body.length > 0 && isResponseJson) {
            try {
              body = JSON.parse(body);
            }
            catch (err) {
              isNotCalled = false;
              callback(err, res, null, tm);
            }
          }
          if (isNotCalled) {
            callback(null, res, body, tm);
          }
        });
      });
  req.on('socket', function(socket) {
      socket.setTimeout(timeout);
      socket.on('timeout', function() {

        aborted = true;

        tm = new Date() - tm;

        stopTimeoutTimer();

        req.abort();

        var e = new Error('ESOCKETTIMEDOUT');
        e.code = 'ESOCKETTIMEDOUT';

        callback(e, null, null, tm);
      });
  });
  req.on('error', function(err) {

    stopTimeoutTimer();

    if (!aborted && !completed) {

      tm = new Date() - tm;

      aborted = true;

      req.abort();

      callback(err, null, null, tm);
    }
  });

  startTimeoutTimer();

  if (options.data) {
    req.write(options.data);
  }

  req.end();
};

/*options:{
  url: string,
  timeout: msecs,
  headers: {headerName:headerValue,...}
}*/
Rest.prototype.download = function(options, callback, doNotConvertBodyToBuffer) {

  if (!options.headers) {
    options.headers = {};
  }

  options.headers['Accept-Charset'] = 'UTF-8';

  var req, tid,
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
        encoding: null,
        agent: this.agent || this._agent(options.agent)
      },
      client = (secure ? https : http);

  function startTimeoutTimer() {
    tid = setTimeout(function onTimeout() {
      if (!aborted && !completed) {

        tm = new Date() - tm;

        aborted = true;

        req.abort();

        var e = new Error('ESOCKETTIMEDOUT');
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

  req = client.get(opts)
  .on('socket', function(socket) {
    socket.setTimeout(timeout);
    socket.on('timeout', function() {

      aborted = true;

      tm = new Date() - tm;

      stopTimeoutTimer();

      req.abort();

      var e = new Error('ESOCKETTIMEDOUT');
      e.code = 'ESOCKETTIMEDOUT';

      callback(e, null, null, tm);
    });
  })
  .on('response', function(res) {
    res.setEncoding('binary');

    var body = '';

    res
    .on('error', onError)
    .on('data', function(chunk) {
      body += chunk;

      if (options.maxDownloadSize > 0 && body.length >= options.maxDownloadSize) {
        res.destroy();
      }
    })
    .on('end', function() {

      completed = true;

      tm = new Date() - tm;

      stopTimeoutTimer();

      callback(null, res, doNotConvertBodyToBuffer ? body : new Buffer(body, 'binary'), tm);
    });
  })
  .on('error', onError);
};