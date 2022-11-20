'use strict';

process.env.NODE_ENV = 'test';

var _dir = __dirname+'/../src/',
    expect = require('chai').expect,
    ObjectId = require('mongoose').Types.ObjectId,
    Types = require(_dir+'lib/Types'),
    Post = require(_dir+'models/Post'),
    Profile = require(_dir+'models/Profile').Profile,
    Publisher = require(_dir+'lib/publishers/PublisherTumblr');

describe('PublisherTumblr', function(){

  this.timeout(60000);

  require('chai').config.includeStack = true;

  it('should detect error', function() {
    var pub = new Publisher(),
        err = {"statusCode":400,"errors":{"0":"You've exceeded your daily post limit."}},
        err2 = {"statusCode":401,"errors":{}};

    expect(pub._errorMessage(err)).to.eq('You\'ve exceeded your daily post limit.');
    expect(pub._isError(err, 400)).to.be.true;
    expect(pub._isError(err, 402)).to.be.false;
    expect(pub._isError(err, 400, 'You\'ve exceeded your daily post limit.')).to.be.true;
    expect(pub._isError(err, 400, 'You\'ve exceeded your daily post limit')).to.be.false;

    expect(pub._errorMessage(err2)).to.eq('');
    expect(pub._isError(err2, 401)).to.be.true;
    expect(pub._isError(err2, 402)).to.be.false;
  });
});