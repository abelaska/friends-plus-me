'use strict';

process.env.NODE_ENV = 'test';

var mongoose = require('mongoose'),
    moment = require('moment'),
    async = require('async'),
    expect = require('chai').expect,
    _ = require('underscore'),
    config = require('../src/lib/config').config,
    TimeCounters = require(__dirname+'/../src/models/TimeCounters').Model;

describe('TimeCounters', function() {

  require('chai').config.includeStack = true;

  try { mongoose.connect(config.get('db:url'), config.get('db:options')); } catch(err) {}

  beforeEach(function(done) {
    TimeCounters.find({}, function(err, items) {
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

  it('should inc one', function(done) {

    TimeCounters.inc('test', '544cab0dba95cf12006d4332', function(err) {
      expect(err).not.to.be.defined;

      TimeCounters.findOne({_id: '544cab0dba95cf12006d4332'}, function(err, tc) {
        expect(err).to.be.null;
        expect(tc).to.be.defined;

        var now = moment.utc();

        expect(tc.counters).to.be.defined;
        expect(tc.counters['y'+now.format('YYYY')].test).to.be.equal(1);
        expect(tc.counters['m'+now.format('YYYYMM')].test).to.be.equal(1);
        expect(tc.counters['w'+now.format('YYYYww')].test).to.be.equal(1);
        expect(tc.counters['d'+now.format('YYYYMMDD')].test).to.be.equal(1);

        TimeCounters.inc('test', '544cab0dba95cf12006d4332', function(err) {
          expect(err).not.to.be.defined;

          TimeCounters.findOne({_id: '544cab0dba95cf12006d4332'}, function(err, tc) {
            expect(err).to.be.null;
            expect(tc).to.be.defined;

            var now = moment.utc();

            expect(tc.counters).to.be.defined;
            expect(tc.counters['y'+now.format('YYYY')].test).to.be.equal(2);
            expect(tc.counters['m'+now.format('YYYYMM')].test).to.be.equal(2);
            expect(tc.counters['w'+now.format('YYYYww')].test).to.be.equal(2);
            expect(tc.counters['d'+now.format('YYYYMMDD')].test).to.be.equal(2);

            done();
          });      
        });
      });      
    });
  });

  it('should inc one without callback', function() {
    TimeCounters.inc('test', '544cab0dba95cf12006d4333');
  });

  it('should inc two', function(done) {

    TimeCounters.inc('test', '544cab0dba95cf12006d4334', '544cab0dba95cf12006d4335', function(err) {
      expect(err).not.to.be.defined;

      var now = moment.utc();

      TimeCounters.findOne({_id: '544cab0dba95cf12006d4334'}, function(err, tc) {
        expect(err).to.be.null;
        expect(tc).to.be.defined;
        expect(tc.counters).to.be.defined;
        expect(tc.counters['y'+now.format('YYYY')].test).to.be.equal(1);
        expect(tc.counters['m'+now.format('YYYYMM')].test).to.be.equal(1);
        expect(tc.counters['w'+now.format('YYYYww')].test).to.be.equal(1);
        expect(tc.counters['d'+now.format('YYYYMMDD')].test).to.be.equal(1);

        TimeCounters.findOne({_id: '544cab0dba95cf12006d4335'}, function(err, tc) {
          expect(err).to.be.null;
          expect(tc).to.be.defined;
          expect(tc.counters).to.be.defined;
          expect(tc.counters['y'+now.format('YYYY')].test).to.be.equal(1);
          expect(tc.counters['m'+now.format('YYYYMM')].test).to.be.equal(1);
          expect(tc.counters['w'+now.format('YYYYww')].test).to.be.equal(1);
          expect(tc.counters['d'+now.format('YYYYMMDD')].test).to.be.equal(1);

          done();
        });      
      });      
    });
  });

  it('should inc two objects', function(done) {

    TimeCounters.inc('test', {_id:'544cab0dba95cf12006d4334'}, {_id:'544cab0dba95cf12006d4335'}, function(err) {
      expect(err).not.to.be.defined;

      var now = moment.utc();

      TimeCounters.findOne({_id: '544cab0dba95cf12006d4334'}, function(err, tc) {
        expect(err).to.be.null;
        expect(tc).to.be.defined;
        expect(tc.counters).to.be.defined;
        expect(tc.counters['y'+now.format('YYYY')].test).to.be.equal(1);
        expect(tc.counters['m'+now.format('YYYYMM')].test).to.be.equal(1);
        expect(tc.counters['w'+now.format('YYYYww')].test).to.be.equal(1);
        expect(tc.counters['d'+now.format('YYYYMMDD')].test).to.be.equal(1);

        TimeCounters.findOne({_id: '544cab0dba95cf12006d4335'}, function(err, tc) {
          expect(err).to.be.null;
          expect(tc).to.be.defined;
          expect(tc.counters).to.be.defined;
          expect(tc.counters['y'+now.format('YYYY')].test).to.be.equal(1);
          expect(tc.counters['m'+now.format('YYYYMM')].test).to.be.equal(1);
          expect(tc.counters['w'+now.format('YYYYww')].test).to.be.equal(1);
          expect(tc.counters['d'+now.format('YYYYMMDD')].test).to.be.equal(1);

          done();
        });      
      });      
    });
  });

  it('should inc two without callback', function() {
    TimeCounters.inc('test', '544cab0dba95cf12006d4336', '544cab0dba95cf12006d4337');
  });
});