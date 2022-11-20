'use strict';

process.env.NODE_ENV = 'test';

var mongoose = require('mongoose'),
    moment = require('moment'),
    async = require('async'),
    _ = require('underscore'),
    expect = require('chai').expect,
    AvatarImage = require('../src/lib/AvatarImage'),
    config = require('../src/lib/config').config;

describe('AvatarImage', function() {

  this.timeout(30000);

  require('chai').config.includeStack = true;

  it('should work', function(done) {
    // var a = new AvatarImage();
    // a.store("https://s3.amazonaws.com/static.friendsplus.me/images/logo-114x114.png", "1", function(err, newUrl) {
    //   expect(err).to.be.null;
    //   expect(newUrl.indexOf('https://fpmpi-loysoftwaresro.netdna-ssl.com/avatar/')).to.eq(0);
      done();
    // });
  });
});
