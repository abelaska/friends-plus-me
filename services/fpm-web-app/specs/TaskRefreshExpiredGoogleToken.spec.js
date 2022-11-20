'use strict';

process.env.NODE_ENV = 'test';

var moment = require('moment'),
    async = require('async'),
    expect = require('chai').expect,
    TaskRefreshExpiredGoogleToken = require('../src/tasks/TaskRefreshExpiredGoogleToken'),
    config = require('../src/lib/config').config;

describe('TaskRefreshExpiredGoogleToken', function() {

  require('chai').config.includeStack = true;

  it('should extract accountId from expired key', function() {
    var n = new TaskRefreshExpiredGoogleToken();
    expect(n._extractAccountIdFromExpiredKey('gt:refresh:52f5deb22b2c04080095cb32', n.subscribeRetryKeyPrefixRegEx)).to.eq(null);
    expect(n._extractAccountIdFromExpiredKey('gt:retry:52f5deb22b2c04080095cb32', n.subscribeRetryKeyPrefixRegEx)).to.eq('52f5deb22b2c04080095cb32');
    expect(n._extractAccountIdFromExpiredKey('gt:refresh:52f5deb22b2c04080095cb32', n.subscribeKeyPrefixRegEx)).to.eq(null);
    expect(n._extractAccountIdFromExpiredKey('gat:52f5deb22b2c04080095cb32', n.subscribeKeyPrefixRegEx)).to.eq('52f5deb22b2c04080095cb32');
  });
});
