/*jshint node: true */
'use strict';

const log = require('@fpm/logging').default;
const _ = require('lodash');
const tools = require('../lib/tools');
const image = require('../lib/image');

function lerror(err) {
  if (!err) {
    return err;
  }
  if (_.size(err)) {
    return err;
  }
  return err.toString();
}

function fixError(err) {
  if (err) {
    err.error = lerror(err.error);
  }
  return err;
}

module.exports = function(router) {

  router.post('/1/upload/photo/sign', tools.tokenOptional, function(req, res) {
    image.signedUploadUrl({ user: req.user, contentType: req.body.contentType }, (error, data) => {
      if (error) {
        log.error('Failed to prepare signed url for photo upload', { error });
        return res.status(500).json({ error: { message: 'Failed to prepare signed url for photo upload' } });
      }
      res.json(data);
    });
  });

  // request: {
  //   url: string             // url obrazku k uploadu
  // }
  // response: {
  //   url:           String,  // url originalniho obrazku
  //   width:         Number,  // sirka originalniho obrazku
  //   height:        Number,  // vyska originalniho obrazku
  //   contentType:   String,  // contentType: image/gif, image/jpeg, image/png
  //   aniGif:        Boolean  // true: animated gif, false: is not animated gif
  //   isFullBleed:   Boolean
  // }
  router.post('/1/photo/identify', tools.tokenRequired, function(req, res) {
    var url = req.body && req.body.url;
    if (!url) {
      return res.status(400).json({ error: { message: 'Invalid url parameter' } });
    }
    image.identify(url, (err, result) => {
      if (err) {
        var ignoreError = err.statusCode === 404;
        (ignoreError ? log.warn : log.error)('Failed to identify image from url', {
          url,
          userId: req.user._id.toString(),
          error: fixError(err),
          message: err.toString()
        });
        return res.status(500).json({ error: { message: 'Failed to identify image from url' } });
      }
      res.json(result);
    });
  });

  // request: {
  //   url: string             // url obrazku k uploadu
  // }
  // response: {
  //   url:           String,  // url originalniho obrazku
  //   gcs:           String,  // url full-sized obrazku ulozeneho v Google Cloud Storage
  //   width:         Number,  // sirka originalniho obrazku
  //   height:        Number,  // vyska originalniho obrazku
  //   contentType:   String,  // contentType: image/gif, image/jpeg, image/png
  //   aniGif:        Boolean  // true: animated gif, false: is not animated gif
  //   isFullBleed:   Boolean
  // }
  router.post('/1/upload/photo', tools.tokenRequired, function(req, res) {
    const url = req.body && req.body.url;
    if (!url) {
      return res.status(400).json({ error: { message: 'Invalid url parameter' } });
    }

    const user = req.user;
    const pid = req.body && req.body.pid;
    if (!pid) {
      return res.status(400).json({ error: { message: 'Invalid pid parameter' } });
    }

    if (user.memberOfProfiles.indexOf(pid) === -1) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    image.fetchAndStoreImage({ url, user, pid }, (err, result) => {
      if (err) {
        var ignoreError = err.statusCode === 404;
        (ignoreError ? log.warn : log.error)('Failed to fetch and store image', {
          url,
          pid,
          userId: user._id.toString(),
          error: fixError(err),
          message: err.toString()
        });
        return res.status(500).json({ error: { message: 'Failed to fetch and store image' } });
      }
      res.json(result);
    });
  });
};
