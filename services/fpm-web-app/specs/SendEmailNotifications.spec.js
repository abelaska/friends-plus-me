'use strict';

process.env.NODE_ENV = 'test';

var moment = require('moment'),
    async = require('async'),
    expect = require('chai').expect,
    SendEmailNotifications = require('../src/jobs/SendEmailNotifications'),
    config = require('../src/lib/config').config;

describe('SendEmailNotifications', function() {

  require('chai').config.includeStack = true;

  it('should get invite-team-member template', function(done) {
    var n = new SendEmailNotifications();
    n._getTemplate('invite-team-member', function(err, temp) {
      expect(err).to.be.null;
      expect(temp).to.be.ok;
      expect(temp.subject).to.be.ok;
      expect(temp.body).to.be.ok;

      var data = {
        owner: {
          actorId: 'owner.actorId',
          name: 'owner.name',
          image: 'owner.image'
        },
        url: 'url'
      };

      expect(temp.subject(data)).to.eq('Team Member Invitation');
      expect(temp.body(data)).be.ok;
      expect(temp.body(data).length).be.at.least(1);

      done();
    });
  });

  it('should get reconnect template', function(done) {
    var n = new SendEmailNotifications();
    n._getTemplate('reconnect', function(err, temp) {
      expect(err).to.be.null;
      expect(temp).to.be.ok;
      expect(temp.subject).to.be.ok;
      expect(temp.body).to.be.ok;

      var data = {
        network: 'network',
        accountName: 'accountName',
        accountNetwork: 'accountNetwork',
        accountType: 'accountType',
        url: 'url'
      };

      expect(temp.subject(data)).to.eq('Warning: Friends+Me fails to access your accountNetwork account "accountName"');
      expect(temp.body(data)).be.ok;
      expect(temp.body(data).length).be.at.least(1);

      done();
    });
  });

  it('should get welcome template', function(done) {
    var n = new SendEmailNotifications();
    n._getTemplate('welcome', function(err, temp) {
      expect(err).to.be.null;
      expect(temp).to.be.ok;
      expect(temp.subject).to.be.ok;
      expect(temp.body).to.be.ok;

      var data = {
      };

      expect(temp.subject(data)).to.eq('Get Started with Friends+Me');
      expect(temp.body(data)).be.ok;
      expect(temp.body(data).length).be.at.least(1);

      done();
    });
  });
});
