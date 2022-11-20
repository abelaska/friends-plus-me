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
    User = require(__dirname+'/../src/models/User').Model,
    Profile = require(__dirname+'/../src/models/Profile').Profile;

describe('User', function() {

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
      async.apply(removeAll, User),
      async.apply(removeAll, Profile)
    ], done);
  });

  it('should create FetchAccount', function(done) {
    new User({}).save(function(err, user) {

      expect(err).to.be.null;
      expect(user).to.be.ok;

      new Profile({
        accounts: [{
          members: {
            manager: [user._id]
          }
        }]
      }).save(function(err, profile) {

        expect(err).to.be.null;
        expect(profile).to.be.ok;

        var account = profile.accounts[0];

        expect(user.canManageAccount(account)).to.true;
        expect(new User().canManageAccount(account)).to.false;

        done();
      });
    });
  });
});