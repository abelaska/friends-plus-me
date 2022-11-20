'use strict';

process.env.NODE_ENV = 'test';

var expect = require('chai').expect,
    GoogleRefreshToken = require(__dirname+'/../src/lib/GoogleRefreshToken');

describe('GoogleRefreshToken', function(){

  require('chai').config.includeStack = true;

  it('should acquire new access token', function(done) {

    /*var r = new GoogleRefreshToken({
      account: {
        _id: 'id',
        uid: 'uid',
        secret: '!!!!!!!!!!'
      },
      user: { 
        _id: 'id'
      },
      reqPlus: {
        assignResponse: function(body, statusCode) {
          console.log('AAA',body,statusCode);
        }
      },
      canTryAnotherTokenRefresh: function(){ return true;}
    });
    console.log()
    r.execute(function(err, rr) {
      console.log('BBB',err);
      done();
    });*/
    done();
  });
});