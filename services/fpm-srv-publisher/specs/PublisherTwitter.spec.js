'use strict';

process.env.NODE_ENV = 'test';

var _dir = __dirname+'/../src/',
    expect = require('chai').expect,
    ObjectId = require('mongoose').Types.ObjectId,
    Types = require(_dir+'lib/Types'),
    Post = require(_dir+'models/Post'),
    Profile = require(_dir+'models/Profile').Profile,
    Publisher = require(_dir+'lib/publishers/PublisherTwitter');

describe('PublisherTwitter', function(){

  this.timeout(60000);

  require('chai').config.includeStack = true;

  it('should detect error', function() {
    var pub = new Publisher(),
        err = {"statusCode":401,"errors":{"errors":{"0":{"code":89,"message":"Invalid or expired token."}}}},
        err2 = {"statusCode":400,"errors":"{\"errors\":[{\"code\":324,\"message\":\"The validation of media ids failed.\"}]}"},
        err3 = {"statusCode":401,"errors":{"0":{"code":32,"message":"Could not authenticate you."}}},
        err4 = {"code":"ENOTFOUND","errno":"ENOTFOUND","syscall":"getaddrinfo","hostname":"api.twitter.com","host":"api.twitter.com","port":443},
        err5 = {"code":"FAILED_TO_GET_IMAGE","statusCode":404};

    expect(pub._errorMessage(err)).to.eq('(#89) Invalid or expired token.');
    expect(pub._isError(err, 401)).to.be.true;
    expect(pub._isError(err, 402)).to.be.false;
    expect(pub._isError(err, 401, 'Invalid or expired token.')).to.be.true;
    expect(pub._isError(err, 401, 'Invalid or expired token')).to.be.false;

    expect(pub._errorMessage(err2)).to.eq('(#324) The validation of media ids failed.');
    expect(pub._isError(err2, 400, 'The validation of media ids failed.')).to.be.true;
    expect(pub._isError(err2, 400, 'The validation of media ids failed')).to.be.false;

    expect(pub._errorMessage(err3)).to.eq('(#32) Could not authenticate you.');
    expect(pub._isError(err3, 401, 'Could not authenticate you.')).to.be.true;
    expect(pub._isError(err3, 401, 'Could not authenticate you')).to.be.false;

    expect(pub._errorMessage(err4)).to.eq('ENOTFOUND. ENOTFOUND. getaddrinfo. api.twitter.com. api.twitter.com. 443');
    expect(pub._errorMessage(err5)).to.eq('Failed to fetch image');
  });
});