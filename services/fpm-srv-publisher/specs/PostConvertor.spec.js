'use strict';

process.env.NODE_ENV = 'test';

var _dir = __dirname+'/../src/',
    expect = require('chai').expect,
    ObjectId = require('mongoose').Types.ObjectId,
    Types = require(_dir+'lib/Types'),
    Post = require(_dir+'models/Post'),
    Profile = require(_dir+'models/Profile').Profile,
    PostConvertor = require(_dir+'lib/PostConvertor');

describe('PostConvertor', function(){

  require('chai').config.includeStack = true;

  it('should replace shortened links within the post request', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.twitter.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          appendNoShare: true,
          attachments: {
            link: {
              url: 'http://link-attachment-url.cz/123456'
            }
          },
          html: '',
          repost: {
            is: true,
            url: 'https://repost-url.cz/1234'
          }
        }),
        shortenedPrefix = 'shortened-',
        status = 'Status text '+post.repost.url+' '+post.repost.url+'/ '+post.attachments.link.url+' end. '+post.attachments.link.url,
        statusShortened = 'Status text '+shortenedPrefix+post.repost.url+' '+shortenedPrefix+post.repost.url+' '+shortenedPrefix+post.attachments.link.url+' end. '+shortenedPrefix+post.attachments.link.url,
        title = 'Title '+post.repost.url+' '+post.repost.url+' end.',
        titleShortened = 'Title '+shortenedPrefix+post.repost.url+' '+shortenedPrefix+post.repost.url+' end.',
        req = {
          number: 1,
          bool: true,
          _status: status,
          status: status,
          title: title,
          test: {
            status: status,
            test2: {
              _status: status,
              status: status
            },
            title: title
          }
        },
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, shortenedPrefix+url);
        });

    conv._shortenObj(req, function(err, req2) {
      
      expect(err).not.to.be.defined;
      expect(req2).to.be.ok;
      expect(req2).to.deep.equal({
        number: 1,
        bool: true,
        _status: status,
        status: statusShortened,
        title: titleShortened,
        test: {
          status: statusShortened,
          title: titleShortened,
          test2: {
            _status: status,
            status: statusShortened
          }
        }
      });
      expect(post.html).to.eq('<p> #ns</p>');

      done();
    });
  });

  it('should append #ns hashtag', function() {

    var account = {
          _id: ObjectId(),
          network: Types.network.twitter.code,
          account: Types.account.profile.code
        },
        profile = new Profile({
          _id: ObjectId(),
          accounts: [account]
        });

    function create(html, appendNoShare) {
      return new PostConvertor(new Post({appendNoShare: appendNoShare || false, html: html}), profile, account).post.html;
    }

    expect(create('', true)).to.eq('<p> #ns</p>');
    expect(create('<p></p>', true)).to.eq('<p> #ns</p>');
    expect(create('<p>ahoj</p><p></p>', true)).to.eq('<p>ahoj</p><p> #ns</p>');
    expect(create('<p>ahoj</p><p>#ahoj</p>', true)).to.eq('<p>ahoj</p><p>#ahoj #ns</p>');
  });
});