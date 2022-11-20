'use strict';

process.env.NODE_ENV = 'test';

var mongoose = require('mongoose'),
    moment = require('moment'),
    async = require('async'),
    _ = require('underscore'),
    expect = require('chai').expect,
    config = require('../src/lib/config').config,
    SaaS = require('../src/lib/SaaS');

describe('SaaS', function() {

  require('chai').config.includeStack = true;

  try { mongoose.connect(config.get('db:url'), config.get('db:options')); } catch(err) {}

  it('should increment account activities analytics', function(done) {
    var s = new SaaS();
    // s.calculate(function(err, data, tm, times) {
    //   //console.log('result', JSON.stringify(data.system,null,2));
    //   //console.log('err',err,'tm',tm,'times',times);
    //   done();
    // });
    done();
  });
});