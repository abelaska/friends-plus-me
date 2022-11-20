'use strict';

process.env.NODE_ENV = 'test';

var expect = require('chai').expect,
    config = require(__dirname+'/../src/lib/config');

describe('config', function(){

  require('chai').config.includeStack = true;

  it('should secure object', function() {
    var o = {
          string: 'string',
          number: 1,
          boolean: true,
          token: 'token',
          accessToken: 'accessToken',
          access_token: 'access_token',
          secret: 'secret',
          secretValue: 'secretValue',
          prop: {
            string: 'string',
            number: 1,
            boolean: true,
            token: 'token',
            accessToken: 'accessToken',
            access_token: 'access_token',
            secret: 'secret',
            secretValue: 'secretValue'
          }
        },
        e = {
          string: 'string',
          number: 1,
          boolean: true,
          token: '__SECURED__',
          accessToken: '__SECURED__',
          access_token: '__SECURED__',
          secret: '__SECURED__',
          secretValue: '__SECURED__',
          prop: {
            string: 'string',
            number: 1,
            boolean: true,
            token: '__SECURED__',
            accessToken: '__SECURED__',
            access_token: '__SECURED__',
            secret: '__SECURED__',
            secretValue: '__SECURED__'
          }
        };
    expect(config.secureObject(o)).to.deep.eq(e);
    expect(o.token).to.eq('token');
  });
});