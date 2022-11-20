'use strict';

process.env.NODE_ENV = 'test';

var expect = require('chai').expect,
    config = require(__dirname+'/../src/lib/config').config,
    Monitor = require(__dirname+'/../src/lib/Monitor');

describe('Monitor', function(){

  require('chai').config.includeStack = true;

  it('should register key with default prefix', function() {
    Monitor.setKeyPrefix('A');
    Monitor.registerKey('aaa');
    Monitor.setKeyPrefix(null);
    expect(Monitor.getKeys().indexOf('A:aaa')).to.gte(0);
  });

  it('should register keys', function() {
    Monitor.registerKeys('a','b');
    expect(Monitor.getKeys().indexOf('a')).to.gte(0);
    expect(Monitor.getKeys().indexOf('b')).to.gte(0);
    expect(Monitor.getKeys().indexOf('c')).to.eq(-1);

    Monitor.registerKeys(['a2','b2']);
    expect(Monitor.getKeys().indexOf('a2')).to.gte(0);
    expect(Monitor.getKeys().indexOf('b2')).to.gte(0);
  });

  it('should register key', function() {
    Monitor.registerKey('aa');
    expect(Monitor.getKeys().indexOf('aa')).to.gte(0);
  });

  it('should inc/get value', function(done) {
    var key = 'test0:'+new Date().valueOf();
    Monitor.inc(key).then(function() {
      Monitor.get(key).then(function(value) {
        expect(value).to.eq('1');
        Monitor.inc(key).then(function() {
          Monitor.get(key).then(function(value) {
            expect(value).to.eq('2');
            done();
          });
        });
      });
    });
  });

  it('should incby/get value', function(done) {
    var key = 'test1:'+new Date().valueOf();
    Monitor.incby(key, 123).finally(function() {
      Monitor.get(key).then(function(value) {
        expect(value).to.eq('123');
        Monitor.incby(key, 123).finally(function() {
          Monitor.get(key).then(function(value) {
            expect(value).to.eq('246');
            done();
          });
        });
      });
    });
  });

  it('should set/get value', function(done) {
    var key = 'test2:'+new Date().valueOf(),
        originalValue = 'VALUE:'+new Date();
    Monitor.set(key, originalValue).finally(function() {
      Monitor.get(key).then(function(value) {
        expect(value).to.eq(originalValue);
        done();
      });
    });
  });

  it('should multi set/get values', function(done) {
    var key0 = 'test3'+new Date().valueOf(),
        key1 = 'test4'+new Date().valueOf(),
        obj = {};
    obj[key0] = 'VALUE0:'+new Date().valueOf();
    obj[key1] = 'VALUE1:'+new Date().valueOf();
    Monitor.setAll(obj).finally(function() {
      Monitor.getAll().then(function(value) {
        expect(value[key0]).to.eq(obj[key0]);
        expect(value[key1]).to.eq(obj[key1]);
        done();
      });
    });
  });
});