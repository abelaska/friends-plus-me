'use strict';

process.env.NODE_ENV = 'test';

var mongoose = require('mongoose'),
    moment = require('moment-timezone'),
    async = require('async'),
    _ = require('underscore'),
    expect = require('chai').expect,
    ObjectId = mongoose.Types.ObjectId,
    config = require('../src/lib/config').config,
    Types = require('../src/lib/Types'),
    Profile = require(__dirname+'/../src/models/Profile').Profile;

describe('Profile', function() {

  require('chai').config.includeStack = true;

  try { mongoose.connect(config.get('db:url'), config.get('db:options')); } catch(err) {}

  it('should limit number of accounts', function() {
    expect(new Profile({use:{maxAccounts:1}}).isAnotherAccountAllowed).to.be.true;
    expect(new Profile({use:{}}).isAnotherAccountAllowed).to.be.true;
    expect(new Profile({}).isAnotherAccountAllowed).to.be.true;

    expect(new Profile({accounts:[{}],use:{maxAccounts:2}}).isAnotherAccountAllowed).to.be.true;
    expect(new Profile({accounts:[{}],use:{maxAccounts:1}}).isAnotherAccountAllowed).to.be.false;
    expect(new Profile({accounts:[{}],use:{maxAccounts:0}}).isAnotherAccountAllowed).to.be.false;
  });

  function createAccounts() {
    var accounts = [],
        args = Array.prototype.slice.call(arguments);
    args.forEach(function(pair) {
      accounts.push({
        network: Types.network[pair[0]].code,
        account: pair.length > 1 ? Types.account[pair[1]].code : undefined,
        state: 0
      });
    });
    return accounts;
  }

  it('should count account with countActiveAccountsByType', function() {
    expect(new Profile({accounts:createAccounts(['google','profile'],['twitter','profile'])}).countActiveAccountsByType(Types.network.google.code, Types.account.page.code)).to.eq(0);
    expect(new Profile({accounts:createAccounts(['google','profile'],['twitter','profile'])}).countActiveAccountsByType(Types.network.google.code, Types.account.profile.code)).to.eq(1);
    expect(new Profile({accounts:createAccounts(['google','profile'],['google','profile'],['twitter','profile'])}).countActiveAccountsByType(Types.network.google.code, Types.account.profile.code)).to.eq(2);
  }); 

  it('should count account with countActiveAccountsByNetwork', function() {
    expect(new Profile({accounts:createAccounts(['google','profile'],['twitter','profile'])}).countActiveAccountsByNetwork(Types.network.facebook.code)).to.eq(0);
    expect(new Profile({accounts:createAccounts(['google','profile'],['twitter','profile'])}).countActiveAccountsByNetwork(Types.network.google.code)).to.eq(1);
    expect(new Profile({accounts:createAccounts(['google','profile'],['google','profile'],['twitter','profile'])}).countActiveAccountsByNetwork(Types.network.google.code)).to.eq(2);
  });

  it('should block last active account', function() {
    var accounts = createAccounts(['google','profile'],['google','page'],['twitter','profile'],['facebook','profile']);
    accounts[accounts.length-1].state = 2;
    var profile = new Profile({accounts:accounts});
    expect(profile.blockLastActiveAccount().network).to.eq(Types.network.twitter.code);
    var account = profile.blockLastActiveAccount();
    expect(account.network).to.eq(Types.network.google.code);
    expect(account.account).to.eq(Types.account.page.code);
    account = profile.blockLastActiveAccount();
    expect(account.network).to.eq(Types.network.google.code);
    expect(account.account).to.eq(Types.account.profile.code);
    expect(profile.blockLastActiveAccount()).not.to.ok;
  });

  it('should block last active account with blockLastActiveAccountOfNetwork', function() {
    var accounts = createAccounts(['google','profile'],['google','page'],['twitter','profile'],['facebook','profile']);
    accounts[accounts.length-1].state = 2;
    var profile = new Profile({accounts:accounts}),
        account = profile.blockLastActiveAccountOfNetwork(Types.network.google.code);
    expect(account).to.be.ok;
    expect(account.network).to.eq(Types.network.google.code);
    expect(account.account).to.eq(Types.account.page.code);
    expect(profile.accounts[0].state).to.eq(0);
    expect(profile.accounts[1].state).to.eq(2);
    expect(profile.accounts[2].state).to.eq(0);
    account = profile.blockLastActiveAccountOfNetwork(Types.network.twitter.code);
    expect(account).to.be.ok;
    expect(account.network).to.eq(Types.network.twitter.code);
    expect(profile.accounts[0].state).to.eq(0);
    expect(profile.accounts[1].state).to.eq(2);
    expect(profile.accounts[2].state).to.eq(2);
    account = profile.blockLastActiveAccountOfNetwork(Types.network.google.code);
    expect(account).to.be.ok;
    expect(account.network).to.eq(Types.network.google.code);
    expect(account.account).to.eq(Types.account.profile.code);
    expect(profile.accounts[0].state).to.eq(2);
    expect(profile.accounts[1].state).to.eq(2);
    expect(profile.accounts[2].state).to.eq(2);
    expect(profile.blockLastActiveAccountOfNetwork(Types.network.google.code)).not.to.ok;
  });

  it('should block last active account with blockLastActiveAccountOfType', function() {
    var accounts = createAccounts(['google','profile'],['google','page'],['twitter','profile'],['facebook','profile']);
    accounts[accounts.length-1].state = 2;
    var profile = new Profile({accounts:accounts}),
        account = profile.blockLastActiveAccountOfType(Types.network.google.code, Types.account.profile.code);
    expect(account).to.be.ok;
    expect(account.network).to.eq(Types.network.google.code);
    expect(account.account).to.eq(Types.account.profile.code);
    expect(profile.accounts[0].state).to.eq(2);
    expect(profile.accounts[1].state).to.eq(0);
    expect(profile.blockLastActiveAccountOfType(Types.network.google.code, Types.account.profile.code)).not.to.ok;
  });

  it('should unblock firt blocked account', function() {
    var accounts = createAccounts(['google','profile'],['google','page'],['twitter','profile'],['facebook','profile']);
    var profile = new Profile({accounts:accounts,use:{network:{google:{limit:1}}}}),
        account = profile.unblockFirstBlockedAccount();
    expect(account).not.to.be.ok;

    profile.accounts[profile.accounts.length-1].state = 2;
    account = profile.unblockFirstBlockedAccount();
    expect(account).to.be.ok;
    expect(account.network).to.eq(Types.network.facebook.code);
    expect(account.account).to.eq(Types.account.profile.code);
    expect(profile.accounts[profile.accounts.length-1].state).to.eq(1);

    account = profile.unblockFirstBlockedAccount();
    expect(account).not.to.be.ok;
  });

  it('should unblock firt blocked account with network limit', function() {
    var accounts = createAccounts(['google','profile'],['google','page'],['twitter','profile'],['facebook','profile']);
    var profile = new Profile({accounts:accounts,use:{network:{google:{limit:2}}}}),
        account = profile.unblockFirstBlockedAccount();
    expect(account).not.to.be.ok;

    profile.accounts[profile.accounts.length-1].state = 2;
    account = profile.unblockFirstBlockedAccount();
    expect(account).to.be.ok;
    expect(account.network).to.eq(Types.network.facebook.code);
    expect(account.account).to.eq(Types.account.profile.code);
    expect(profile.accounts[profile.accounts.length-1].state).to.eq(1);

    account = profile.unblockFirstBlockedAccount();
    expect(account).not.to.be.ok;

    profile.accounts[1].state = 2;
    account = profile.unblockFirstBlockedAccount();
    expect(account).to.be.ok;
    expect(account.network).to.eq(Types.network.google.code);
    expect(account.account).to.eq(Types.account.page.code);
    expect(profile.accounts[1].state).to.eq(1);

    account = profile.unblockFirstBlockedAccount();
    expect(account).not.to.be.ok;
  });

  it('should unblock firt blocked account with network and account type limit', function() {
    var accounts = createAccounts(['google','profile'],['google','page'],['google','profile'],['twitter','profile'],['facebook','profile']);
    var profile = new Profile({accounts:accounts,use:{network:{google:{limit:2,profile:{limit:1}}}}}),
        account = profile.unblockFirstBlockedAccount();
    expect(account).not.to.be.ok;

    profile.accounts[profile.accounts.length-1].state = 2;
    account = profile.unblockFirstBlockedAccount();
    expect(account).to.be.ok;
    expect(account.network).to.eq(Types.network.facebook.code);
    expect(account.account).to.eq(Types.account.profile.code);
    expect(profile.accounts[profile.accounts.length-1].state).to.eq(1);

    account = profile.unblockFirstBlockedAccount();
    expect(account).not.to.be.ok;

    profile.accounts[1].state = 2;
    profile.accounts[2].state = 2;
    account = profile.unblockFirstBlockedAccount();
    expect(account).to.be.ok;
    expect(account.network).to.eq(Types.network.google.code);
    expect(account.account).to.eq(Types.account.page.code);
    expect(profile.accounts[1].state).to.eq(1);

    account = profile.unblockFirstBlockedAccount();
    expect(account).not.to.be.ok;
  });

  it('should block 1 google profile account with updateAccountsByUseLimits', function(done) {
    var accounts = createAccounts(['google','profile'],['google','page'],['google','profile'],['twitter','profile'],['facebook','profile']);
    var profile = new Profile({accounts:accounts,use:{network:{google:{limit:3,profile:{limit:1}}}}});
    profile.updateAccountsByUseLimits(function(err) {
      expect(err).not.to.be.ok;
      expect(profile.accounts[0].state).to.eq(0);
      expect(profile.accounts[1].state).to.eq(0);
      expect(profile.accounts[2].state).to.eq(2);
      expect(profile.accounts[3].state).to.eq(0);
      expect(profile.accounts[4].state).to.eq(0);
      done();
    });
  });

  it('should block 1 google account with updateAccountsByUseLimits', function(done) {
    var accounts = createAccounts(['google','profile'],['google','page'],['google','profile'],['twitter','profile'],['facebook','profile']);
    var profile = new Profile({accounts:accounts,use:{network:{google:{limit:2,profile:{limit:1}}}}});
    profile.updateAccountsByUseLimits(function(err) {
      expect(err).not.to.be.ok;
      expect(profile.accounts[0].state).to.eq(0);
      expect(profile.accounts[1].state).to.eq(0);
      expect(profile.accounts[2].state).to.eq(2);
      expect(profile.accounts[3].state).to.eq(0);
      expect(profile.accounts[4].state).to.eq(0);
      done();
    });
  });

  it('should block 2 google accounts with updateAccountsByUseLimits', function(done) {
    var accounts = createAccounts(['google','profile'],['google','page'],['google','profile'],['twitter','profile'],['facebook','profile']);
    var profile = new Profile({accounts:accounts,use:{network:{google:{limit:1,profile:{limit:1}}}}});
    profile.updateAccountsByUseLimits(function(err) {
      expect(err).not.to.be.ok;
      expect(profile.accounts[0].state).to.eq(0);
      expect(profile.accounts[1].state).to.eq(2);
      expect(profile.accounts[2].state).to.eq(2);
      expect(profile.accounts[3].state).to.eq(0);
      expect(profile.accounts[4].state).to.eq(0);
      done();
    });
  });

  it('should block 3 accounts with updateAccountsByUseLimits', function(done) {
    var accounts = createAccounts(['google','profile'],['google','page'],['google','profile'],['twitter','profile'],['facebook','profile']);
    var profile = new Profile({accounts:accounts,use:{maxAccounts:2, network:{google:{limit:1,profile:{limit:1}}}}});
    profile.updateAccountsByUseLimits(function(err) {
      expect(err).not.to.be.ok;
      expect(profile.accounts[0].state).to.eq(0);
      expect(profile.accounts[1].state).to.eq(2);
      expect(profile.accounts[2].state).to.eq(2);
      expect(profile.accounts[3].state).to.eq(0);
      expect(profile.accounts[4].state).to.eq(2);
      done();
    });
  });

  it('should block 4 accounts with updateAccountsByUseLimits', function(done) {
    var accounts = createAccounts(['google','profile'],['google','page'],['google','profile'],['twitter','profile'],['facebook','profile']);
    var profile = new Profile({accounts:accounts,use:{maxAccounts:1, network:{google:{limit:1,profile:{limit:1}}}}});
    profile.updateAccountsByUseLimits(function(err) {
      expect(err).not.to.be.ok;
      expect(profile.accounts[0].state).to.eq(0);
      expect(profile.accounts[1].state).to.eq(2);
      expect(profile.accounts[2].state).to.eq(2);
      expect(profile.accounts[3].state).to.eq(2);
      expect(profile.accounts[4].state).to.eq(2);
      done();
    });
  });

  it('should unblock 1 account with updateAccountsByUseLimits', function(done) {
    var accounts = createAccounts(['google','profile'],['google','page'],['google','profile'],['twitter','profile'],['facebook','profile']);
    accounts[1].state = 2;
    var profile = new Profile({accounts:accounts,use:{maxAccounts:6, network:{google:{limit:2,profile:{limit:1}}}}});
    profile.updateAccountsByUseLimits(function(err) {
      expect(err).not.to.be.ok;
      expect(profile.accounts[0].state).to.eq(0);
      expect(profile.accounts[1].state).to.eq(1);
      expect(profile.accounts[2].state).to.eq(2);
      expect(profile.accounts[3].state).to.eq(0);
      expect(profile.accounts[4].state).to.eq(0);
      done();
    });
  });

  it('should unblock 2 account with updateAccountsByUseLimits', function(done) {
    var accounts = createAccounts(['google','profile'],['google','page'],['google','profile'],['twitter','profile'],['facebook','profile']);
    accounts[0].state = 2;
    accounts[1].state = 2;
    accounts[3].state = 2;
    var profile = new Profile({accounts:accounts,use:{maxAccounts:6, network:{google:{limit:3,profile:{limit:2}}}}});
    profile.updateAccountsByUseLimits(function(err) {
      expect(err).not.to.be.ok;
      expect(profile.accounts[0].state).to.eq(1);
      expect(profile.accounts[1].state).to.eq(1);
      expect(profile.accounts[2].state).to.eq(0);
      expect(profile.accounts[3].state).to.eq(1);
      expect(profile.accounts[4].state).to.eq(0);
      done();
    });
  });

  it('should unblock all accounts with updateAccountsByUseLimits', function(done) {
    var accounts = createAccounts(['google','profile'],['google','page'],['google','profile'],['twitter','profile'],['facebook','profile']);
    accounts[0].state = 2;
    accounts[1].state = 2;
    accounts[3].state = 2;
    var profile = new Profile({accounts:accounts,use:{maxAccounts:6}});
    profile.updateAccountsByUseLimits(function(err) {
      expect(err).not.to.be.ok;
      expect(profile.accounts[0].state).to.eq(1);
      expect(profile.accounts[1].state).to.eq(1);
      expect(profile.accounts[2].state).to.eq(0);
      expect(profile.accounts[3].state).to.eq(1);
      expect(profile.accounts[4].state).to.eq(0);
      done();
    });
  });

  it('should limit number accounts', function() {

    var googCode = Types.network.google.code,
        profCode = Types.account.profile.code,
        pageCode = Types.account.page.code;

    function c(assignAccounts, limits, maxAccounts) {
      var accounts = [];
      while (assignAccounts-- > 0) {
        accounts.push({network:googCode, account:pageCode});
      }
      return new Profile({accounts:accounts,use:{maxAccounts:maxAccounts,network:limits}});
    }

    function t(profile, networkName, accountName) {
      return profile.isAnotherAccountAllowedByTypeName(networkName, accountName);
    }

    expect(t(new Profile({use:{}}), 'google')).to.be.true;
    expect(t(new Profile({}), 'google')).to.be.true;
    expect(t(new Profile({use:{maxAccounts:1}}), 'google')).to.be.true;

    expect(t(c(0,null,2), 'google')).to.be.true;
    expect(t(c(1,null,2), 'google')).to.be.true;
    expect(t(c(1,null,1), 'google')).to.be.false;
    expect(t(c(1,null,0), 'google')).to.be.false;

    expect(t(c(0), 'google', 'profile')).to.be.true;
    expect(t(c(0,{}), 'google', 'profile')).to.be.true;

    expect(t(c(0,{google:{}}), 'google', 'profile')).to.be.true;
    expect(t(c(1,{google:{}}), 'google', 'profile')).to.be.true;
    expect(t(c(0,{google:{limit:-1}}), 'google', 'profile')).to.be.true;
    expect(t(c(1,{google:{limit:-1}}), 'google', 'profile')).to.be.true;
    expect(t(c(0,{google:{limit:1}}), 'google', 'profile')).to.be.true;
    expect(t(c(1,{google:{limit:1}}), 'google', 'profile')).to.be.false;

    expect(t(c(0,{google:{limit:1,profile:{}}}), 'google', 'profile')).to.be.true;
    expect(t(c(1,{google:{limit:1,profile:{}}}), 'google', 'profile')).to.be.false;

    expect(t(c(0,{google:{limit:1,profile:{limit:-1}}}), 'google', 'profile')).to.be.true;
    expect(t(c(1,{google:{limit:1,profile:{limit:-1}}}), 'google', 'profile')).to.be.false;

    expect(t(c(0,{google:{limit:1,profile:{limit:1}}}), 'google', 'profile')).to.be.true;
    expect(t(c(1,{google:{limit:2,profile:{limit:1}}}), 'google', 'profile')).to.be.true;
    expect(t(c(1,{google:{limit:2,page:{limit:1}}}), 'google', 'page')).to.be.false;

    expect(t(c(0,{google:{page:{limit:1}}}), 'google', 'page')).to.be.true;
    expect(t(c(1,{google:{page:{limit:1}}}), 'google', 'page')).to.be.false;

    expect(t(c(0,{google:{limit:-1,profile:{limit:1}}}), 'google', 'profile')).to.be.true;
    expect(t(c(1,{google:{limit:-1,page:{limit:1}}}), 'google', 'profile')).to.be.true;
    expect(t(c(1,{google:{limit:-1,page:{limit:2}}}), 'google', 'page')).to.be.true;
    expect(t(c(1,{google:{limit:-1,page:{limit:1}}}), 'google', 'page')).to.be.false;
  });

  it('should return subscriptionType', function(){
    var u = new Profile();
    expect(u.subscriptionType).to.be.null;

    u.subscription = {id:'0',gw:'PAYPAL'};
    expect(u.subscriptionType).to.equal('PAYPAL');
  });

  it('should return subscriptionAmount', function(){
    var u = new Profile();
    expect(u.subscriptionAmount).to.be.null;

    u.subscription = {id:'0',amount:10};
    expect(u.subscriptionAmount).to.equal(10);
  });

  it('should return subscriptionIntervalMonths', function(){
    var u = new Profile();
    expect(u.subscriptionIntervalMonths).to.equal(0);

    u.subscription = {id:'0',interval:'MONTH'};
    expect(u.subscriptionIntervalMonths).to.equal(1);

    u.subscription = {id:'0',interval:'YEAR'};
    expect(u.subscriptionIntervalMonths).to.equal(12);
  });

  it('should return accountDestinationsByHashtags noshare', function(){
    var r,
        a0 = { _id: '51b0bb912c9e259f4a000001', state: 0,token:'token' },
        a1 = { _id: '51b0bb912c9e259f4a000002', state: 0,token:'token' },
        a2 = { _id: '51b0bb912c9e259f4a000003', state: 0,token:'token' },
        a3 = { _id: '51b0bb912c9e259f4a000004', state: 0,token:'token' },
        u = new Profile({
          routes:[{
            src: a0._id,
            ddg:[a3._id],
            chdg:[{
              override: false,
              keep: false,
              noshare: false,
              hashtag: ['a','b'],
              dst: [a1._id, a2._id]
            },{
              override: false,
              keep: false,
              noshare: false,
              hashtag: ['c'],
              dst: [a2._id]
            },{
              override: false,
              keep: false,
              noshare: true,
              hashtag: ['d'],
              dst: [a2._id]
            }]
          }],
          accounts:[a0,a1,a2,a3]
        });

    r = u.accountDestinationsByHashtags(a0, ['a']);
    expect(r.length).to.equal(3);
    expect(r).to.contain(a1._id);
    expect(r).to.contain(a2._id);
    expect(r).to.contain(a3._id);
    expect(u.findAccountHashtagsToRemove(a0)).to.eql(['a','b','c','d']);

    r = u.accountDestinationsByHashtags(a0, ['a','b','c','d']);
    expect(r.length).to.equal(0);

    r = u.accountDestinationsByHashtags(a0, ['d']);
    expect(r.length).to.equal(0);

    u.routes[0].chdg[2].noshare = false;
    r = u.accountDestinationsByHashtags(a0, ['d']);
    expect(r.length).to.equal(2);
    expect(r).to.contain(a2._id);
    expect(r).to.contain(a3._id);
    expect(u.findAccountHashtagsToRemove(a0)).to.eql(['a','b','c','d']);
  });

  it('should return accountDestinationsByHashtags noshare+override', function(){
    var r,
        a0 = { _id: ObjectId('51b0bb912c9e259f4a000001'), state: 0,token:'token' },
        a1 = { _id: ObjectId('51b0bb912c9e259f4a000002'), state: 0,token:'token' },
        a2 = { _id: ObjectId('51b0bb912c9e259f4a000003'), state: 0,token:'token' },
        a3 = { _id: ObjectId('51b0bb912c9e259f4a000004'), state: 0,token:'token' },
        u = new Profile({
          routes:[{
            src: a0._id,
            ddg:[a3._id.toString()],
            chdg:[{
              keep: false,
              hashtag: ['a','b'],
              dst: [a1._id.toString(), a2._id.toString()]
            },{
              keep: false,
              hashtag: ['c'],
              dst: [a2._id.toString()]
            },{
              keep: false,
              noshare: true,
              override: true,
              hashtag: ['d'],
              dst: [a2._id.toString()]
            }]
          }],
          accounts:[a0,a1,a2,a3]
        });

    r = u.accountDestinationsByHashtags(a0, ['a']);
    expect(r.length).to.equal(3);
    expect(r).to.contain(a1._id.toString());
    expect(r).to.contain(a2._id.toString());
    expect(r).to.contain(a3._id.toString());

    r = u.accountDestinationsByHashtags(a0, ['a','b','c','d']);
    expect(r.length).to.equal(0);

    r = u.accountDestinationsByHashtags(a0, ['d']);
    expect(r.length).to.equal(0);

    u.routes[0].chdg[2].noshare = false;
    r = u.accountDestinationsByHashtags(a0, ['d']);
    expect(r.length).to.equal(1);
    expect(r).to.contain(a2._id.toString());
  });

  it('should return accountDestinationsByHashtags override 2', function(){
    var r,
        a0 = { _id: '51b0bb912c9e259f4a000001', state: 0,token:'token' },
        a1 = { _id: '51b0bb912c9e259f4a000002', state: 0,token:'token' },
        a2 = { _id: '51b0bb912c9e259f4a000003', state: 0,token:'token' },
        a3 = { _id: '51b0bb912c9e259f4a000004', state: 0,token:'token' },
        u = new Profile({
          routes:[{
            src: a0._id,
            ddg:[a1._id,a2._id],
            chdg:[{
              override: false,
              keep: false,
              hashtag: ['a'],
              dst: [a3._id]
            }]
          }],
          accounts:[a0,a1,a2,a3]
        });

    expect(u.findAccountHashtagsToRemove(a0)).to.eql(['a']);

    r = u.accountDestinationsByHashtags(a0, []);
    expect(r.length).to.equal(2);
    expect(r).to.contain(a1._id);
    expect(r).to.contain(a2._id);

    r = u.accountDestinationsByHashtags(a0, ['b']);
    expect(r.length).to.equal(2);
    expect(r).to.contain(a1._id);
    expect(r).to.contain(a2._id);

    r = u.accountDestinationsByHashtags(a0, ['a']);
    expect(r.length).to.equal(3);
    expect(r).to.contain(a1._id);
    expect(r).to.contain(a2._id);
    expect(r).to.contain(a3._id);
  });

  it('should return accountDestinationsByHashtags', function(){
    var r,
        a0 = { _id: '51b0bb912c9e259f4a000001', state: 0,token:'token' },
        a1 = { _id: '51b0bb912c9e259f4a000002', state: 0,token:'token' },
        a2 = { _id: '51b0bb912c9e259f4a000003', state: 0,token:'token' },
        a3 = { _id: '51b0bb912c9e259f4a000004', state: 0,token:'token' },
        u = new Profile({
          routes:[{
            src: a0._id,
            ddg:[a3._id],
            chdg:[{
              keep: false,
              hashtag: ['a','b'],
              dst: [a1._id, a2._id]
            },{
              keep: false,
              hashtag: ['c'],
              dst: [a2._id]
            }]
          }],
          accounts:[a0,a1,a2,a3]
        });

    expect(u.accountDestinationsByHashtags(null, []).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a1, []).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a2, []).length).to.equal(0);

    r = u.accountDestinationsByHashtags(a0, []);
    expect(r.length).to.equal(1);
    expect(r).to.contain(a3._id.toString());

    r = u.accountDestinationsByHashtags(a0, [], true);
    expect(r.length).to.equal(0);

    r = u.accountDestinationsByHashtags(a0, ['a']);
    expect(r.length).to.equal(3);
    expect(r).to.contain(a1._id);
    expect(r).to.contain(a2._id);
    expect(r).to.contain(a3._id);

    r = u.accountDestinationsByHashtags(a0, ['b']);
    expect(r.length).to.equal(3);
    expect(r).to.contain(a1._id);
    expect(r).to.contain(a2._id);
    expect(r).to.contain(a3._id);

    r = u.accountDestinationsByHashtags(a0, ['c']);
    expect(r.length).to.equal(2);
    expect(r).to.contain(a2._id);
    expect(r).to.contain(a3._id);

    r = u.accountDestinationsByHashtags(a0, ['d']);
    expect(r.length).to.equal(1);
    expect(r).to.contain(a3._id);

    r = u.accountDestinationsByHashtags(a0, ['c','d']);
    expect(r.length).to.equal(2);
    expect(r).to.contain(a2._id);
    expect(r).to.contain(a3._id);

    r = u.accountDestinationsByHashtags(a0, ['a','c']);
    expect(r.length).to.equal(3);
    expect(r).to.contain(a1._id);
    expect(r).to.contain(a2._id);
    expect(r).to.contain(a3._id);

    // all accounts are disabled
    u.accounts.forEach(function(a) {
      u.disableAccount(a);
    });

    expect(u.accountDestinationsByHashtags(null, []).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a1, []).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a2, []).length).to.equal(0);

    expect(u.accountDestinationsByHashtags(a0, []).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a0, ['a']).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a0, ['b']).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a0, ['c']).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a0, ['d']).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a0, ['c','d']).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a0, ['a','c']).length).to.equal(0);
  });


  it('should return accountDestinationsByHashtags override', function(){
    var r,
        a0 = { _id: '51b0bb912c9e259f4a000001', state: 0,token:'token' },
        a1 = { _id: '51b0bb912c9e259f4a000002', state: 0,token:'token' },
        a2 = { _id: '51b0bb912c9e259f4a000003', state: 0,token:'token' },
        a3 = { _id: '51b0bb912c9e259f4a000004', state: 0,token:'token' },
        a4 = { _id: '51b0bb912c9e259f4a000005', state: 0,token:'token' },
        u = new Profile({
          routes:[{
            src: a0._id,
            ddg:[a3._id],
            chdg:[{
              keep: false,
              override: true,
              noshare: false,
              hashtag: ['c'],
              dst: [a2._id]
            },{
              keep: false,
              override: true,
              noshare: false,
              hashtag: ['e'],
              dst: [a4._id]
            },{
              override: false,
              keep: false,
              noshare: false,
              hashtag: ['a','b'],
              dst: [a1._id, a2._id]
            }]
          }],
          accounts:[a0,a1,a2,a3,a4]
        });

    expect(u.accountDestinationsByHashtags(null, []).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a1, []).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a2, []).length).to.equal(0);

    r = u.accountDestinationsByHashtags(a0, []);
    expect(r.length).to.equal(1);
    expect(r).to.contain(a3._id.toString());

    r = u.accountDestinationsByHashtags(a0, [], true);
    expect(r.length).to.equal(0);

    r = u.accountDestinationsByHashtags(a0, ['a']);
    expect(r.length).to.equal(3);
    expect(r).to.contain(a1._id);
    expect(r).to.contain(a2._id);
    expect(r).to.contain(a3._id);

    r = u.accountDestinationsByHashtags(a0, ['b']);
    expect(r.length).to.equal(3);
    expect(r).to.contain(a1._id);
    expect(r).to.contain(a2._id);
    expect(r).to.contain(a3._id);

    r = u.accountDestinationsByHashtags(a0, ['c']);
    expect(r.length).to.equal(1);
    expect(r).to.contain(a2._id);

    r = u.accountDestinationsByHashtags(a0, ['d']);
    expect(r.length).to.equal(1);
    expect(r).to.contain(a3._id);

    r = u.accountDestinationsByHashtags(a0, ['c','d']);
    expect(r.length).to.equal(1);
    expect(r).to.contain(a2._id);

    r = u.accountDestinationsByHashtags(a0, ['a','c']);
    expect(r.length).to.equal(2);
    expect(r).to.contain(a1._id);
    expect(r).to.contain(a2._id);

    r = u.accountDestinationsByHashtags(a0, ['e']);
    expect(r.length).to.equal(1);
    expect(r).to.contain(a4._id);

    r = u.accountDestinationsByHashtags(a0, ['a','c','e']);
    expect(r.length).to.equal(3);
    expect(r).to.contain(a1._id);
    expect(r).to.contain(a2._id);
    expect(r).to.contain(a4._id);

    // all accounts are disabled
    u.accounts.forEach(function(a) {
      u.disableAccount(a);
    });

    expect(u.accountDestinationsByHashtags(null, []).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a1, []).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a2, []).length).to.equal(0);

    expect(u.accountDestinationsByHashtags(a0, []).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a0, ['a']).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a0, ['b']).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a0, ['c']).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a0, ['d']).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a0, ['c','d']).length).to.equal(0);
    expect(u.accountDestinationsByHashtags(a0, ['a','c']).length).to.equal(0);
  });


  it('should return accountDestinationsByHashtags correctly', function(){
    
    function acc(id) {
      return { _id: id, state: 0,token:'token' };
    }

    var r,
        a0 = acc('51b0bb912c9e259f4a000001'),
        u = new Profile({
          routes:[{
            "chdg" : [ {
                "keep" : false,
                "noshare" : false,
                "override" : true,
                "dst" : [ 
                  "5314a4c31551b808006d243f", 
                  "5314a4ee1551b808006d2452", 
                  "5314a4f91551b808006d2455", 
                  "5314a6f81551b808006d2487", 
                  "5314a71e1551b808006d248c", 
                  "5314a7461551b808006d248e", 
                  "5314a76e1551b808006d2490", 
                  "5314a7e21551b808006d2494", 
                  "5314a7f01551b808006d2496", 
                  "5314a8411551b808006d2498", 
                  "5314b2161551b808006d2554", 
                  "535cdd49d7b104100098c225", 
                  "54fd01af2f6d001200ecb780", 
                  "551fe46d00b72501006b2834", 
                  "551fe56d00b72501006b2838", 
                  "551fe5ed00b72501006b2839"
                ],
                "hashtag" : ["IEC"]
              },{
                "override" : true,
                "keep" : false,
                "noshare" : true,
                "dst" : [],
                "hashtag" : ["plusonly","ns","noshare"]
              }, {
                "keep" : false,
                "noshare" : false,
                "override" : true,
                "dst" : [ 
                  "5314a4c31551b808006d243f", 
                  "5314a71e1551b808006d248c", 
                  "5314a7461551b808006d248e", 
                  "5314a76e1551b808006d2490", 
                  "5314a7f01551b808006d2496", 
                  "5314b2161551b808006d2554", 
                  "54fd01af2f6d001200ecb780"
                ],
                "hashtag" : [ "GI"]
              }, {
                "keep" : false,
                "noshare" : false,
                "override" : true,
                "dst" : [ 
                  "5314a4ee1551b808006d2452", 
                  "5314a4f91551b808006d2455", 
                  "5314a6f81551b808006d2487", 
                  "5314a7e21551b808006d2494", 
                  "5314a8411551b808006d2498", 
                  "535cdd49d7b104100098c225"
                ],
                "hashtag" : [ "YGP"]
              }, {
                "keep" : false,
                "noshare" : false,
                "override" : true,
                "dst" : [ 
                  "5314a4f91551b808006d2455"
                ],
                "hashtag" : [ "YP"]
              }
            ],
            "ddg" : [ 
                "5314a4c31551b808006d243f", 
                "5314a4ee1551b808006d2452", 
                "5314a4f91551b808006d2455", 
                "5314a6f81551b808006d2487", 
                "5314a71e1551b808006d248c", 
                "5314a7461551b808006d248e", 
                "5314a76e1551b808006d2490", 
                "5314a7e21551b808006d2494", 
                "5314a7f01551b808006d2496", 
                "5314a8411551b808006d2498", 
                "5314b2161551b808006d2554", 
                "535cdd49d7b104100098c225", 
                "54fd01af2f6d001200ecb780", 
                "551fe46d00b72501006b2834", 
                "551fe56d00b72501006b2838", 
                "551fe5ed00b72501006b2839"
            ],
            "src" : a0._id
          }],
          accounts:[a0,
            acc("5314a4c31551b808006d243f"), 
            acc("5314a4ee1551b808006d2452"), 
            acc("5314a4f91551b808006d2455"),
            acc("5314a6f81551b808006d2487"), 
            acc("5314a71e1551b808006d248c"), 
            acc("5314a7461551b808006d248e"), 
            acc("5314a76e1551b808006d2490"), 
            acc("5314a7e21551b808006d2494"), 
            acc("5314a7f01551b808006d2496"), 
            acc("5314a8411551b808006d2498"), 
            acc("5314b2161551b808006d2554"), 
            acc("535cdd49d7b104100098c225"),
            acc("54fd01af2f6d001200ecb780"),
            acc("551fe46d00b72501006b2834"), 
            acc("551fe56d00b72501006b2838"), 
            acc("551fe5ed00b72501006b2839"),
          ]
        });

    r = u.accountDestinationsByHashtags(a0, ['YGP','nq']);
    expect(r).to.eql([ 
      "5314a4ee1551b808006d2452", 
      "5314a4f91551b808006d2455", 
      "5314a6f81551b808006d2487", 
      "5314a7e21551b808006d2494", 
      "5314a8411551b808006d2498", 
      "535cdd49d7b104100098c225"
    ]);

    r = u.accountDestinationsByHashtags(a0, ['ygp','nq']);
    expect(r).to.eql([ 
      "5314a4ee1551b808006d2452", 
      "5314a4f91551b808006d2455", 
      "5314a6f81551b808006d2487", 
      "5314a7e21551b808006d2494", 
      "5314a8411551b808006d2498", 
      "535cdd49d7b104100098c225"
    ]);

    r = u.accountDestinationsByHashtags(a0, ['nq']);
    expect(r).to.eql([ 
      "5314a4c31551b808006d243f", 
      "5314a4ee1551b808006d2452", 
      "5314a4f91551b808006d2455", 
      "5314a6f81551b808006d2487", 
      "5314a71e1551b808006d248c", 
      "5314a7461551b808006d248e", 
      "5314a76e1551b808006d2490", 
      "5314a7e21551b808006d2494", 
      "5314a7f01551b808006d2496", 
      "5314a8411551b808006d2498", 
      "5314b2161551b808006d2554", 
      "535cdd49d7b104100098c225", 
      "54fd01af2f6d001200ecb780", 
      "551fe46d00b72501006b2834", 
      "551fe56d00b72501006b2838", 
      "551fe5ed00b72501006b2839"
    ]);
  });
});