/* jshint node: true, esversion: 6 */

const log = require('@fpm/logging').default;
const { ObjectId, User } = require('@fpm/db');
const express = require('express');

const bindAddress = '0.0.0.0';
const bindPort = process.env.PORT || 8080;

const app = express()
  .disable('x-powered-by')
  .disable('etag')
  .enable('trust proxy');

app.get('/health', (req, res) => {
  User.findById(ObjectId(), '_id', error => {
    if (error) {
      res.status(500).send('fail');
    } else {
      res.send('ok');
    }
  });
});

app.get('/_ah/health', (req, res) => {
  User.findById(ObjectId(), '_id', error => {
    if (error) {
      res.status(500).send('fail');
    } else {
      res.send('ok');
    }
  });
});

app.get('/_ah/start', (req, res) => {
  res.send('ok');
});

app.get('/_ah/stop', (req, res) => {
  res.send('ok');
});

app.listen(bindPort, bindAddress, () => {
  log.info(`GAE HTTP server listening on ${bindAddress}:${bindPort}`);
});
