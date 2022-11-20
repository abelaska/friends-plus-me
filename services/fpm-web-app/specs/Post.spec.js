'use strict';

process.env.NODE_ENV = 'test';

var async = require('async'),
    expect = require('chai').expect,
    Types = require('../src/lib/Types'),
    config = require('../src/lib/config').config,
    Post = require(__dirname+'/../src/models/Post');

describe('Post', function() {

  require('chai').config.includeStack = true;

  try { mongoose.connect(config.get('db:url'), config.get('db:options')); } catch(err) {}

  function removeAll(model, done) {
    model.find({}, function(err, items) {
      if (items && items.length > 0) {
        async.forEach(items, function(item, callback) {
          item.remove(callback);
        }, function(err){
          done();
        });
      } else {
        done();
      }
    });    
  }

  beforeEach(function(done) {
    async.parallel([
      async.apply(removeAll, Post)
    ], done);
  });

  it('should get next time for google profile', function() {
    var p = new Post({tries: 0, accountCode: Types.createCodeByName('google', 'profile')});
    expect(p.nextInSeconds()).to.eq(60);  p.tries++;
    expect(p.nextInSeconds()).to.eq(72);  p.tries++;
    expect(p.nextInSeconds()).to.eq(86);  p.tries++;
    expect(p.nextInSeconds()).to.eq(103); p.tries++;
    expect(p.nextInSeconds()).to.eq(124); p.tries++;
    expect(p.nextInSeconds()).to.eq(149); p.tries++;
    expect(p.nextInSeconds()).to.eq(179);
  });

  it('should get next time for google community', function() {
    var p = new Post({tries: 0, accountCode: Types.createCodeByName('google', 'community')});
    expect(p.nextInSeconds()).to.eq(60);  p.tries++;
    expect(p.nextInSeconds()).to.eq(72);  p.tries++;
    expect(p.nextInSeconds()).to.eq(86);  p.tries++;
    expect(p.nextInSeconds()).to.eq(103); p.tries++;
    expect(p.nextInSeconds()).to.eq(124); p.tries++;
    expect(p.nextInSeconds()).to.eq(149); p.tries++;
    expect(p.nextInSeconds()).to.eq(179);
  });

  it('should get next time for google collection', function() {
    var p = new Post({tries: 0, accountCode: Types.createCodeByName('google', 'collection')});
    expect(p.nextInSeconds()).to.eq(60);  p.tries++;
    expect(p.nextInSeconds()).to.eq(72);  p.tries++;
    expect(p.nextInSeconds()).to.eq(86);  p.tries++;
    expect(p.nextInSeconds()).to.eq(103); p.tries++;
    expect(p.nextInSeconds()).to.eq(124); p.tries++;
    expect(p.nextInSeconds()).to.eq(149); p.tries++;
    expect(p.nextInSeconds()).to.eq(179);
  });

  it('should get next time for google page', function() {
    var p = new Post({tries: 0, accountCode: Types.createCodeByName('google', 'page')});
    expect(p.nextInSeconds()).to.eq(60);    p.tries++;
    expect(p.nextInSeconds()).to.eq(144);   p.tries++;
    expect(p.nextInSeconds()).to.eq(345);   p.tries++;
    expect(p.nextInSeconds()).to.eq(829);   p.tries++;
    expect(p.nextInSeconds()).to.eq(1990);  p.tries++;
    expect(p.nextInSeconds()).to.eq(4777);  p.tries++;
    expect(p.nextInSeconds()).to.eq(11466);
  });
});