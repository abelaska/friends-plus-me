'use strict';

process.env.NODE_ENV = 'test';

var _dir = __dirname+'/../src/',
    expect = require('chai').expect,
    ObjectId = require('mongoose').Types.ObjectId,
    Types = require(_dir+'lib/Types'),
    Post = require(_dir+'models/Post'),
    Profile = require(_dir+'models/Profile').Profile,
    Publisher = require(_dir+'lib/publishers/PublisherGooglePage');

describe('PublisherGooglePage', function(){

  this.timeout(60000);

  require('chai').config.includeStack = true;

  it('should detect error', function() {
    var pub = new Publisher(),
        err = {
          "message":{
            "errors":{
              "0":{
                "domain":"plus",
                "reason":"maxActivitiesPerDayMet",
                "message":"The maximum number of activities allowed per day has been met."
              }
            },
            "code":403,
            "message":"The maximum number of activities allowed per day has been met."
          },
          "code":403
        },
        err2 = {
          "message":{
            "errors":{
              "0":{
                "domain":"global",
                "reason":"forbidden",
                "message":"Forbidden"
              }
            },
            "code":403,
            "message":"Forbidden"
          },
          "code":403
        },
        err3 = {
          "error_description":"Missing required parameter: refresh_token",
          "message":"invalid_request",
          "code":400
        },
        err4 = {
          "error_description":"Token has been revoked.",
          "message":"invalid_grant",
          "code":400
        },
        err5 = {
          "code":403,
          "errors":"{\"error\":{\"errors\":[{\"domain\":\"global\",\"reason\":\"forbidden\",\"message\":\"Forbidden\"}],\"code\":403,\"message\":\"Forbidden\"}}"
        },
        err6 = {
            "errors" : "{\"error\":{\"errors\":[{\"domain\":\"global\",\"reason\":\"forbidden\",\"message\":\"Forbidden\"}],\"code\":403,\"message\":\"Forbidden\"}}",
            "code" : 403
        };

    expect(pub._errorMessage(err)).to.eq('The maximum number of activities allowed per day has been met.');
    expect(pub._isError(err, 403)).to.be.true;
    expect(pub._isError(err, 402)).to.be.false;
    expect(pub._isError(err, 403, 'The maximum number of activities allowed per day has been met.')).to.be.true;
    expect(pub._isError(err, 403, 'The maximum number of activities allowed per day has been met')).to.be.false;

    expect(pub._isError(err2, 403, 'Forbidden')).to.be.true;
    expect(pub._errorMessage(err2)).to.eq('Forbidden');

    expect(pub._isError(err3, 400, 'Missing required parameter: refresh_token')).to.be.true;
    expect(pub._isError(err3, 400, 'invalid_request')).to.be.true;
    expect(pub._errorMessage(err3)).to.eq('Missing required parameter: refresh_token');

    expect(pub._isError(err4, 400, 'Token has been revoked.')).to.be.true;
    expect(pub._errorMessage(err4)).to.eq('Token has been revoked.');

    expect(pub._isError(err5, 403, 'Forbidden')).to.be.true;
    expect(pub._errorMessage(err5)).to.eq('Forbidden');

    expect(pub._isError(err6, 403, 'Forbidden')).to.be.true;
    expect(pub._errorMessage(err6)).to.eq('Forbidden');
  });
});