'use strict';

process.env.NODE_ENV = 'test';

var mongoose = require('mongoose'),
    moment = require('moment'),
    async = require('async'),
    expect = require('chai').expect,
    _ = require('underscore'),
    config = require('../src/lib/config').config,
    Post = require(__dirname+'/../src/models/Post');

describe('Post', function() {

  require('chai').config.includeStack = true;

  try { mongoose.connect(config.get('db:url'), config.get('db:options')); } catch(err) {}

  beforeEach(function(done) {
    Post.find({}, function(err, items) {
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
  });

  it('should _optimisticUpdate', function(done) {

    var p = new Post();

    p.save(function(err) {
      expect(err).not.to.be.defined;
      expect(p._id).to.be.ok;

      p._optimisticUpdate({$set: {html: 'new value'}}, function(err, updated) {
        expect(err).not.to.be.defined;
        expect(updated).to.eq(1);

        Post.findOne({_id: p._id}, function(err, p2) {
          expect(err).not.to.be.defined;
          expect(p2._id).to.be.ok;
          expect(p._id.toString()).to.eq(p2._id.toString());
          expect(p2.html).to.eq('new value');

          done();
        });
      });
    });
  });

  it('should _optimisticUpdate fail', function(done) {

    var p = new Post();

    p.save(function(err) {
      expect(err).not.to.be.defined;
      expect(p._id).to.be.ok;

      var originalUpdate = p.update;

      p.update = function(update, callback) {
        callback({
          err: 'Lock not granted. Try restarting the transaction.',
          code: 16759
        });
      };

      var tm = new Date();

      p._optimisticUpdate({$set: {html: 'new value'}}, function(err, updated) {

        tm = new Date() - tm;

        expect(err).to.eql({
          err: 'Lock not granted. Try restarting the transaction.',
          code: 16759
        });
        expect(updated).not.to.be.defined;
        expect(tm).to.be.above(499);

        p.update = originalUpdate;
        p._optimisticUpdate({$set: {html: 'new value 2'}}, function(err, updated) {
          expect(err).not.to.be.defined;
          expect(updated).to.eq(1);

          Post.findOne({_id: p._id}, function(err, p2) {
            expect(err).not.to.be.defined;
            expect(p2._id).to.be.ok;
            expect(p._id.toString()).to.eq(p2._id.toString());
            expect(p2.html).to.eq('new value 2');

            done();
          });
        });
      }, 500);
    });
  });
});