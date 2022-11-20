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
    ProfileCosts = require(__dirname+'/../src/models/ProfileCosts'),
    Profile = require(__dirname+'/../src/models/Profile').Profile;

describe('ProfileCosts', function() {

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
      async.apply(removeAll, ProfileCosts),
      async.apply(removeAll, Profile)
    ], done);
  });

  it('should be a valid day', function() {
    var createdAt = moment.utc('2016-06-02 00:00:00.484Z');
    var day = createdAt.clone().startOf('day').subtract(1, 'days');
    expect(day.format()).to.eq('2016-06-01T00:00:00+00:00');
  });
});
