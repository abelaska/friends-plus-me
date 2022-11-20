'use strict';

process.env.NODE_ENV = 'test';

var _dir = __dirname+'/../src/',
    expect = require('chai').expect,
    ObjectId = require('mongoose').Types.ObjectId,
    Types = require(_dir+'lib/Types'),
    Post = require(_dir+'models/Post'),
    Profile = require(_dir+'models/Profile').Profile,
    PostConvertor = require(_dir+'lib/convertors/PostConvertorFacebook');

describe('PostConvertorFacebook', function(){

  require('chai').config.includeStack = true;

  it('should convert link+photo post', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            uid: 'facebook-id',
            token: 'token',
            network: Types.network.facebook.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"facebook-id",
          "accountCode":20000,
          "html":"<p>\"There are 70,000 bridges classified as “structurally deficient” in the United States</p>",
          "processor":"repost:facebook:profile",
          "attachments":{
            "link" : {
                "photo" : {
                  "thumbnail" : {
                      "isFullBleed" : true,
                      "url" : "https://lh5.googleusercontent.com/proxy/O9_1Wrk2Ymkrt2Z9E45Of14UsnWhgtPLfx2CC07uiyxkZyoX8AbCCLWeTuKPevvXDagK71ipdlZWKQ=w300-h180/2",
                      "height" : 180,
                      "width" : 300
                  },
                  "height" : 630,
                  "width" : 1200,
                  "url" : "http://gidnes.cz/o/ogimage/idnes-idnes2.jpg"
                },
                "description" : "Nejnov&#283;j&scaron;&iacute; zpr&aacute;vy z va&scaron;eho kraje, &#268;esk&eacute; republiky a cel&eacute;ho sv&#283;ta.",
                "domain" : "idnes.cz",
                "title" : "iDNES.cz &ndash; zpr&aacute;vy, kter&yacute;m m&#367;&#382;ete v&#283;&#345;it",
                "url" : "http://idnes.cz"
            },
            "photo" : {
              "thumbnail" : {
                  "isFullBleed" : true,
                  "url" : "https://lh5.googleusercontent.com/proxy/O9_1Wrk2Ymkrt2Z9E45Of14UsnWhgtPLfx2CC07uiyxkZyoX8AbCCLWeTuKPevvXDagK71ipdlZWKQ=w300-h180",
                  "height" : 180,
                  "width" : 300
              },
              "height" : 630,
              "width" : 1200,
              "url" : "http://gidnes.cz/o/ogimage/idnes-idnes.jpg"
            },
          },
          "repost":{
            "is":false
          }
        }),
        shortenedSuffix = '-shortened',
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, url+shortenedSuffix);
        });

    conv.convert(function(err, req) {
      // console.log('err',err,'req',req && JSON.stringify(req));
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({"url":"https://graph.facebook.com/v2.2/facebook-id/links","req":{"access_token":"token","link":"http://idnes.cz-shortened","description":"Nejnov&#283;j&scaron;&iacute; zpr&aacute;vy z va&scaron;eho kraje, &#268;esk&eacute; republiky a cel&eacute;ho sv&#283;ta.","name":"iDNES.cz &ndash; zpr&aacute;vy, kter&yacute;m m&#367;&#382;ete v&#283;&#345;it","message":"\"There are 70,000 bridges classified as “structurally deficient” in the United States","picture":"http://gidnes.cz/o/ogimage/idnes-idnes.jpg"}});

      done();
    });
  });

  it('should convert link post', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            uid: 'facebook-id',
            token: 'token',
            network: Types.network.facebook.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"facebook-id",
          "accountCode":20000,
          "html":"<p>\"There are 70,000 bridges classified as “structurally deficient” in the United States</p>",
          "processor":"repost:facebook:profile",
          "attachments":{
            "link" : {
                "photo" : {
                  "thumbnail" : {
                      "isFullBleed" : true,
                      "url" : "https://lh5.googleusercontent.com/proxy/O9_1Wrk2Ymkrt2Z9E45Of14UsnWhgtPLfx2CC07uiyxkZyoX8AbCCLWeTuKPevvXDagK71ipdlZWKQ=w300-h180/2",
                      "height" : 180,
                      "width" : 300
                  },
                  "height" : 630,
                  "width" : 1200,
                  "url" : "http://gidnes.cz/o/ogimage/idnes-idnes2.jpg"
                },
                "description" : "Nejnov&#283;j&scaron;&iacute; zpr&aacute;vy z va&scaron;eho kraje, &#268;esk&eacute; republiky a cel&eacute;ho sv&#283;ta.",
                "domain" : "idnes.cz",
                "title" : "iDNES.cz &ndash; zpr&aacute;vy, kter&yacute;m m&#367;&#382;ete v&#283;&#345;it",
                "url" : "http://idnes.cz"
            }
          },
          "repost":{
            "is":false
          }
        }),
        shortenedSuffix = '-shortened',
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, url+shortenedSuffix);
        });

    conv.convert(function(err, req) {
      // console.log('err',err,'req',req && JSON.stringify(req));
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({"url":"https://graph.facebook.com/v2.2/facebook-id/links","req":{"access_token":"token","link":"http://idnes.cz-shortened","description":"Nejnov&#283;j&scaron;&iacute; zpr&aacute;vy z va&scaron;eho kraje, &#268;esk&eacute; republiky a cel&eacute;ho sv&#283;ta.","name":"iDNES.cz &ndash; zpr&aacute;vy, kter&yacute;m m&#367;&#382;ete v&#283;&#345;it","message":"\"There are 70,000 bridges classified as “structurally deficient” in the United States","picture":"http://gidnes.cz/o/ogimage/idnes-idnes2.jpg"}});

      done();
    });
  });

  it('should convert photo post to profile', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            uid: 'facebook-id',
            token: 'token',
            network: Types.network.facebook.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"facebook-id",
          "accountCode":20000,
          "html":"<p>Time to call it a night, gang. Have a great one and I'll see you in the morning!</p><p></p><p>https://plus.google.com/100035762233109552669/posts/LQ1JEfQW3RT</p>",
          "processor":"repost:facebook:profile",
          "attachments":{
            "photo":{
              "aniGif":true,
              "contentType":"image/gif",
              "height":136,
              "width":240,
              "url":"https://lh4.googleusercontent.com/-zj4BVjFBT78/UigNcQz2sqI/AAAAAAAA1UQ/X9maIM6XEXY/s2048/FDbWnSN.gif"
            }
          },
          "repost":{
            "is":false
          }
        }),
        shortenedSuffix = '-shortened',
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, url+shortenedSuffix);
        });

    conv.convert(function(err, req) {
      // console.log('err',err,'req',req && JSON.stringify(req));
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({"url":"https://graph.facebook.com/v2.2/facebook-id/photos","req":{"access_token":"token","url":"https://lh4.googleusercontent.com/-zj4BVjFBT78/UigNcQz2sqI/AAAAAAAA1UQ/X9maIM6XEXY/s2048/FDbWnSN.gif","name":"Time to call it a night, gang. Have a great one and I'll see you in the morning!\n\nhttps://plus.google.com/100035762233109552669/posts/LQ1JEfQW3RT"}});

      done();
    });
  });

  it('should convert photo post to group', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            uid: 'facebook-id',
            token: 'token',
            network: Types.network.facebook.code,
            account: Types.account.group.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"facebook-id",
          "accountCode":20000,
          "html":"<p>Time to call it a night, gang. Have a great one and I'll see you in the morning!</p><p></p><p>https://plus.google.com/100035762233109552669/posts/LQ1JEfQW3RT</p>",
          "processor":"repost:facebook:group",
          "attachments":{
            "photo":{
              "aniGif":true,
              "contentType":"image/gif",
              "height":136,
              "width":240,
              "url":"https://lh4.googleusercontent.com/-zj4BVjFBT78/UigNcQz2sqI/AAAAAAAA1UQ/X9maIM6XEXY/s2048/FDbWnSN.gif"
            }
          },
          "repost":{
            "is":false
          }
        }),
        shortenedSuffix = '-shortened',
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, url+shortenedSuffix);
        });

    conv.convert(function(err, req) {
      // console.log('err',err,'req',req && JSON.stringify(req));
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({"url":"https://graph.facebook.com/v2.2/facebook-id/feed","req":{"access_token":"token","message":"Time to call it a night, gang. Have a great one and I'll see you in the morning!\n\nhttps://plus.google.com/100035762233109552669/posts/LQ1JEfQW3RT","picture":"https://lh4.googleusercontent.com/-zj4BVjFBT78/UigNcQz2sqI/AAAAAAAA1UQ/X9maIM6XEXY/s2048/FDbWnSN.gif"}});

      done();
    });
  });

  it('should convert post with too long status', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            uid: 'facebook-id',
            token: 'token',
            network: Types.network.facebook.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"facebook-id",
          "accountCode":20000,
          "html":"<p>012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789</p>",
          "processor":"repost:facebook:profile",
          "attachments":{
            "photo":{
              "aniGif":true,
              "contentType":"image/gif",
              "height":136,
              "width":240,
              "url":"https://lh4.googleusercontent.com/-zj4BVjFBT78/UigNcQz2sqI/AAAAAAAA1UQ/X9maIM6XEXY/s2048/FDbWnSN.gif"
            }
          },
          "repost":{
            "url":"https://plus.google.com/100035762233109552669/posts/LQ1JEfQW3RT",
            "is":true
          }
        }),
        shortenedSuffix = '-shortened',
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, url+shortenedSuffix);
        });

    conv.convert(function(err, req) {
      // console.log('err',err,'req',req && JSON.stringify(req));
      
      expect(req).not.to.be.defined;
      expect(err).to.be.ok;
      expect(err).to.deep.equal({
        isFatal: true,
        error: {
          message: 'Message is too long, 2010 > max. 2000',
          code: 'MESSAGE_TOO_LONG' } });

      done();
    });
  });

  it('should convert photo repost to group', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            uid: 'facebook-id',
            token: 'token',
            network: Types.network.facebook.code,
            account: Types.account.group.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"facebook-id",
          "accountCode":20000,
          "html":"<p>Time to call it a night, gang. Have a great one and I'll see you in the morning!</p><p></p><p>https://plus.google.com/100035762233109552669/posts/LQ1JEfQW3RT</p>",
          "processor":"repost:facebook:group",
          "attachments":{
            "photo":{
              "aniGif":true,
              "contentType":"image/gif",
              "height":136,
              "width":240,
              "url":"https://lh4.googleusercontent.com/-zj4BVjFBT78/UigNcQz2sqI/AAAAAAAA1UQ/X9maIM6XEXY/s2048/FDbWnSN.gif"
            }
          },
          "repost":{
            "url":"https://plus.google.com/100035762233109552669/posts/LQ1JEfQW3RT",
            "is":true
          }
        }),
        shortenedSuffix = '-shortened',
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, url+shortenedSuffix);
        });

    conv.convert(function(err, req) {
      // console.log('err',err,'req',req && JSON.stringify(req));
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({"url":"https://graph.facebook.com/v2.2/facebook-id/feed","req":{"access_token":"token","message":"Time to call it a night, gang. Have a great one and I'll see you in the morning!\n\nhttps://plus.google.com/100035762233109552669/posts/LQ1JEfQW3RT-shortened","picture":"https://lh4.googleusercontent.com/-zj4BVjFBT78/UigNcQz2sqI/AAAAAAAA1UQ/X9maIM6XEXY/s2048/FDbWnSN.gif"}});

      done();
    });
  });

  it('should convert photo repost to profile', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            uid: 'facebook-id',
            token: 'token',
            network: Types.network.facebook.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"facebook-id",
          "accountCode":20000,
          "html":"<p>Time to call it a night, gang. Have a great one and I'll see you in the morning!</p><p></p><p>https://plus.google.com/100035762233109552669/posts/LQ1JEfQW3RT</p>",
          "processor":"repost:facebook:profile",
          "attachments":{
            "photo":{
              "aniGif":true,
              "contentType":"image/gif",
              "height":136,
              "width":240,
              "url":"https://lh4.googleusercontent.com/-zj4BVjFBT78/UigNcQz2sqI/AAAAAAAA1UQ/X9maIM6XEXY/s2048/FDbWnSN.gif"
            }
          },
          "repost":{
            "url":"https://plus.google.com/100035762233109552669/posts/LQ1JEfQW3RT",
            "is":true
          }
        }),
        shortenedSuffix = '-shortened',
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, url+shortenedSuffix);
        });

    conv.convert(function(err, req) {
      // console.log('err',err,'req',req && JSON.stringify(req));
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({"url":"https://graph.facebook.com/v2.2/facebook-id/photos","req":{"access_token":"token","actions":"[{\"name\":\"Comment on Google+\",\"link\": \"https://plus.google.com/100035762233109552669/posts/LQ1JEfQW3RT-shortened\"}]","url":"https://lh4.googleusercontent.com/-zj4BVjFBT78/UigNcQz2sqI/AAAAAAAA1UQ/X9maIM6XEXY/s2048/FDbWnSN.gif","name":"Time to call it a night, gang. Have a great one and I'll see you in the morning!\n\nhttps://plus.google.com/100035762233109552669/posts/LQ1JEfQW3RT-shortened"}});

      done();
    });
  });

  it('should convert video repost', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            uid: 'facebook-id',
            token: 'token',
            network: Types.network.facebook.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"facebook-id",
          "accountCode":20000,
          "html":"<p>What what what :)</p><p></p><p>https://plus.google.com/103778702993142591484/posts/VbQPzYdZz2Q</p>",
          "processor":"repost:facebook:profile",
          "attachments":{
            "link":{
              "description":"Steve Blank, serial entrepreneur and Stanford consulting associate professor, discusses the role of pattern recognition in entrepreneurship. He appeared at t...",
              "title":"Steve Blank: What Makes A Wise Entrepreneur?",
              "domain":"www.youtube.com",
              "url":"http://www.youtube.com/watch?v=M-W0nUhXTLM"
            },
            "video":{
              "embedUrl":"http://www.youtube.com/v/M-W0nUhXTLM?version=3&list=PLxq_lXOUlvQC5V9Jcn_cHHFnZBqljE43a"
            }
          },
          "repost":{
            "url":"https://plus.google.com/103778702993142591484/posts/VbQPzYdZz2Q",
            "is":true
          }
        }),
        shortenedSuffix = '-shortened',
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, url+shortenedSuffix);
        });

    conv.convert(function(err, req) {
      // console.log('err',err,'req',req && JSON.stringify(req));

      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({"url":"https://graph.facebook.com/v2.2/facebook-id/links","req":{"access_token":"token","actions":"[{\"name\":\"Comment on Google+\",\"link\": \"https://plus.google.com/103778702993142591484/posts/VbQPzYdZz2Q-shortened\"}]","link":"http://www.youtube.com/watch?v=M-W0nUhXTLM-shortened","description":"Steve Blank, serial entrepreneur and Stanford consulting associate professor, discusses the role of pattern recognition in entrepreneurship. He appeared at t...","name":"Steve Blank: What Makes A Wise Entrepreneur?","message":"What what what :)\n\nhttps://plus.google.com/103778702993142591484/posts/VbQPzYdZz2Q-shortened",picture: undefined}});

      done();
    });
  });

  it('should convert person autocomplete', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.facebook.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "aid": profile.accounts[0]._id,
          "accountCode": Types.createCode(profile.accounts[0].network, profile.accounts[0].account),
          "appendNoShare" : true,
          "attachments" : {
              "link" : {
                  "photo" : {
                      "thumbnail" : {
                          "isFullBleed" : true,
                          "url" : "https://lh5.googleusercontent.com/proxy/J2K-2r_InppKOV1cCP0VrVdkW7NO0QABvF_nRTe3N9JhwY5BeyYE_vRWH4Gyz2F_7vXVCfisLns4uwsylUYOijvuckjfIZQ0WFyPD4JsIWckJMcP9LOhfaL8J2CTr2N1f9yseKWub9lwIaM=w300-h180",
                          "height" : 180,
                          "width" : 300
                      },
                      "height" : 300,
                      "width" : 700,
                      "url" : "http://blog.uber.com/wp-content/uploads/2015/03/uber_Safety_BlogHeader_1400x600-700x300.png"
                  },
                  "description" : "We are committed to ensuring Uber is the safest way to get around a city. As part of that commitment, last December I promised to keep riders and drivers",
                  "domain" : "blog.uber.com",
                  "title" : "An update from the Uber Safety Team",
                  "url" : "http://blog.uber.com/safetyteamupdate"
              }
          },
          "blockedAt" : null,
          "createdAt" : new Date(),
          "editable" : true,
          "failures" : [],
          "html" : "<p>Suite &agrave; qq incidents avec ses chauffeurs partenaires,&nbsp;<input class=\"autocompleted autocompleted-person\" type=\"button\" value=\"+Uber\" data-uid=\"1234567890\" />&nbsp;publie une update sur sa vision de la s&eacute;curit&eacute; client.&nbsp;</p>",
          "lockedUntil" : new Date(),
          "modifiedAt" : new Date(),
          "pid" : new Date(),
          "processor" : "post:google:profile",
          "publishAt" : new Date(),
          "repost" : {
              "is" : false
          },
          "state" : -1,
          "tries" : 3,
          "uid" : "106564525522381795299"
        }),
        shortenedSuffix = '-shortened',
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, url+shortenedSuffix);
        });

    conv.convert(function(err, req) {
      // console.log('err',err,'req',req && JSON.stringify(req));
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({"url":"https://graph.facebook.com/v2.2/undefined/links","req":{access_token:undefined,"link":"http://blog.uber.com/safetyteamupdate-shortened","description":"We are committed to ensuring Uber is the safest way to get around a city. As part of that commitment, last December I promised to keep riders and drivers","name":"An update from the Uber Safety Team","message":"Suite à qq incidents avec ses chauffeurs partenaires, Uber publie une update sur sa vision de la sécurité client.  #ns","picture":"http://blog.uber.com/wp-content/uploads/2015/03/uber_Safety_BlogHeader_1400x600-700x300.png"}});

      done();
    });
  });
});