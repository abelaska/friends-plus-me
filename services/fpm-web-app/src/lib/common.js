'use strict';

const config = require('@fpm/config');
const express = require('express');

exports.createExpress = () => {
  const app = express();

  app.set('x-powered-by', false);

  if (config.get('isProduction')) {
    app.set('trust proxy', true);
  }

  return app;
};
