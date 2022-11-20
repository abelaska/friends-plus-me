'use strict';

process.env.NODE_ENV = 'test';

var mongoose = require('mongoose'),
    moment = require('moment'),
    async = require('async'),
    expect = require('chai').expect,
    ObjectId = mongoose.Types.ObjectId,
    _ = require('underscore'),
    States = require('../src/lib/States'),
    config = require('../src/lib/config').config,
    Profile = require(__dirname+'/../src/models/Profile').Profile,
    GoogleAccountStat = require(__dirname+'/../src/models/GoogleAccountStat');

describe('GoogleAccountStat', function() {

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
      async.apply(removeAll, GoogleAccountStat)
    ], done);
  });

  it('should push', function(done) {

    var now = moment.utc(),
        now2 = now.clone().add(1, 'days'),
        now3 = now2.clone().add(1, 'days');

    GoogleAccountStat.push('actorId', {
      name: 'name'
    }, {
      updatedAt: now.toDate(),
      circlerank: 1
    }, function(err, updated) {
      expect(err).to.be.null;
      expect(updated).to.deep.eq({ok:1, n:1});

      GoogleAccountStat.find({actorId: 'actorId'}, function(err, recs) {

        expect(err).to.be.null;
        expect(recs).to.be.ok;
        expect(recs.length).to.eq(1);
        
        var rec = recs[0];
        expect(rec).to.be.ok;

        expect(rec.name).to.eq('name');

        expect(rec.last).to.be.ok;
        expect(moment.utc(rec.last.updatedAt).format()).to.eq(now.format());

        expect(rec.records).to.be.ok;
        expect(rec.records.length).to.eq(1);
        expect(moment.utc(rec.records[0].updatedAt).format()).to.eq(now.format());

        GoogleAccountStat.push('actorId', {
          name: 'name2'
        }, {
          updatedAt: now2.toDate(),
          circlerank: 2
        }, function(err, updated) {
          expect(err).to.be.null;
          expect(updated).to.deep.eq({ok:1, n:1});

          GoogleAccountStat.find({actorId: 'actorId'}, function(err, recs) {

            expect(err).to.be.null;

            expect(recs).to.be.ok;
            expect(recs.length).to.eq(1);
            
            var rec = recs[0];
            expect(rec).to.be.ok;

            expect(rec.name).to.eq('name2');

            expect(rec.last).to.be.ok;
            expect(moment.utc(rec.last.updatedAt).format()).to.eq(now2.format());

            expect(rec.records).to.be.ok;
            expect(rec.records.length).to.eq(2);
            expect(moment.utc(rec.records[0].updatedAt).format()).to.eq(now.format());
            expect(moment.utc(rec.records[1].updatedAt).format()).to.eq(now2.format());

            GoogleAccountStat.push('actorId', {
              name: 'name3'
            }, {
              updatedAt: now3.toDate(),
              circlerank: 3
            }, function(err, updated) {
              expect(err).to.be.null;
              expect(updated).to.deep.eq({ok:1, n:1});

              GoogleAccountStat.find({actorId: 'actorId'}, function(err, recs) {

                expect(err).to.be.null;

                expect(recs).to.be.ok;
                expect(recs.length).to.eq(1);
                
                var rec = recs[0];
                expect(rec).to.be.ok;

                expect(rec.name).to.eq('name3');

                expect(rec.last).to.be.ok;
                expect(moment.utc(rec.last.updatedAt).format()).to.eq(now3.format());

                expect(rec.records).to.be.ok;
                expect(rec.records.length).to.eq(3);
                expect(moment.utc(rec.records[0].updatedAt).format()).to.eq(now.format());
                expect(moment.utc(rec.records[1].updatedAt).format()).to.eq(now2.format());
                expect(moment.utc(rec.records[2].updatedAt).format()).to.eq(now3.format());

                done();
              });
            });
          });
        });
      });
    });
  });
});