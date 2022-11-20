'use strict';

process.env.NODE_ENV = 'test';

var _dir = __dirname+'/../src/',
    expect = require('chai').expect,
    ObjectId = require('mongoose').Types.ObjectId,
    Types = require(_dir+'lib/Types'),
    Post = require(_dir+'models/Post'),
    Profile = require(_dir+'models/Profile').Profile,
    PostConvertor = require(_dir+'lib/convertors/PostConvertorLinkedin');

describe('PostConvertorLinkedin', function(){

  require('chai').config.includeStack = true;

  it('should convert link+photo post', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.linkedin.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"linkedin-id",
          "accountCode":30000,
          "html":"<p>\"There are 70,000 bridges classified as “structurally deficient” in the United States</p>",
          "processor":"repost:linkedin:profile",
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
          },
          "state":0,
          "failures":[],
          "tries":0
        }),
        shortenedSuffix = '-shortened',
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, url+shortenedSuffix);
        });

    conv.convert(function(err, req) {
      // console.log('err',err,'req',req && JSON.stringify(req));
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({"comment":"\"There are 70,000 bridges classified as “structurally deficient” in the United States","visibility":{"code":"connections-only"},"content":{"title":"iDNES.cz &ndash; zpr&aacute;vy, kter&yacute;m m&#367;&#382;ete v&#283;&#345;it","description":"Nejnov&#283;j&scaron;&iacute; zpr&aacute;vy z va&scaron;eho kraje, &#268;esk&eacute; republiky a cel&eacute;ho sv&#283;ta.","submitted-url":"http://idnes.cz-shortened","submitted-image-url":"http://gidnes.cz/o/ogimage/idnes-idnes.jpg"}});

      done();
    });
  });

  it('should convert link post', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.linkedin.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"linkedin-id",
          "accountCode":30000,
          "html":"<p>\"There are 70,000 bridges classified as “structurally deficient” in the United States</p>",
          "processor":"repost:linkedin:profile",
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
          },
          "state":0,
          "failures":[],
          "tries":0
        }),
        shortenedSuffix = '-shortened',
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, url+shortenedSuffix);
        });

    conv.convert(function(err, req) {
      // console.log('err',err,'req',req && JSON.stringify(req));
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({"comment":"\"There are 70,000 bridges classified as “structurally deficient” in the United States","visibility":{"code":"connections-only"},"content":{"title":"iDNES.cz &ndash; zpr&aacute;vy, kter&yacute;m m&#367;&#382;ete v&#283;&#345;it","description":"Nejnov&#283;j&scaron;&iacute; zpr&aacute;vy z va&scaron;eho kraje, &#268;esk&eacute; republiky a cel&eacute;ho sv&#283;ta.","submitted-url":"http://idnes.cz-shortened","submitted-image-url":"http://gidnes.cz/o/ogimage/idnes-idnes2.jpg"}});

      done();
    });
  });

  it('should convert photo post', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.linkedin.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"linkedin-id",
          "accountCode":30000,
          "html":"<p>0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789</p>",
          "processor":"repost:linkedin:profile",
          "attachments":{
            "photo":{
              "aniGif":false,
              "contentType":"image/png",
              "height":666,
              "width":761,
              "url":"https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s0/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png"
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
      expect(req).to.deep.equal({"comment":"0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789","visibility":{"code":"connections-only"},"content":{"title":"Photo","description":"","submitted-url":"https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s0/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png","submitted-image-url":"https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s0/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png"}});

      done();
    });
  });

  it('should convert post with too long status', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.linkedin.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"linkedin-id",
          "accountCode":30000,
          "html":"<p>012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789</p>",
          "processor":"repost:linkedin:profile",
          "attachments":{
            "photo":{
              "aniGif":false,
              "contentType":"image/png",
              "height":666,
              "width":761,
              "url":"https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s0/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png"
            }
          },
          "repost":{
            "is":false
          },
          "state":0,
          "failures":[],
          "tries":0
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
          message: 'Message is too long, 660 > max. 620',
          code: 'MESSAGE_TOO_LONG' } });

      done();
    });
  });

  it('should convert photo repost', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.linkedin.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"linkedin-id",
          "accountCode":30000,
          "html":"<p>RT Think iPhone wouldn't sell? It already is sold out</p>",
          "processor":"repost:linkedin:profile",
          "attachments":{
            "photo":{
              "aniGif":false,
              "contentType":"image/png",
              "height":666,
              "width":761,
              "url":"https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s0/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png"
            }
          },
          "repost":{
            "url":"https://plus.google.com/114197358633834273250/posts/T3XEwvYje7N",
            "is":true
          },
          "state":0,
          "failures":[],
          "tries":0
        }),
        shortenedSuffix = '-shortened',
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, url+shortenedSuffix);
        });

    conv.convert(function(err, req) {
      // console.log('err',err,'req',req && JSON.stringify(req));
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({"comment":"RT Think iPhone wouldn't sell? It already is sold out","visibility":{"code":"connections-only"},"content":{"title":"Photo","description":"","submitted-url":"https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s0/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png","submitted-image-url":"https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s0/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png"}});

      done();
    });
  });

  it('should convert video repost for profile', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.linkedin.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"linkedin-id",
          "accountCode":30000,
          "html":"<p>No, they aren't really using claws to remove illegally parked cars. ... read the rest https://plus.google.com/102898672602346817738/posts/6FJ3EpMxc1K</p>",
          "processor":"repost:linkedin:profile",
          "attachments":{
            "link":{
              "photo":{
                "thumbnail":{
                  "isFullBleed":false,
                  "aniGif":false,
                  "contentType":"image/jpeg",
                  "height":372,
                  "width":497,
                  "url":"https://images2-focus-opensocial.googleusercontent.com/gadgets/proxy?url=http://i2.ytimg.com/vi/Y1WItaegeUc/hqdefault.jpg&container=focus&gadget=a&rewriteMime=image/*&refresh=31536000&resize_w=497"
                },
                "aniGif":false,
                "contentType":"image/jpeg",
                "height":372,
                "width":497,
                "url":"https://images2-focus-opensocial.googleusercontent.com/gadgets/proxy?url=http://i2.ytimg.com/vi/Y1WItaegeUc/hqdefault.jpg&container=focus&gadget=a&rewriteMime=image/*&refresh=31536000&resize_w=497"
              },
              "description":"Meanwhile in Russia.",
              "title":"A Radical Way To Deal With Illegal Parking",
              "domain":"www.youtube.com",
              "url":"http://www.youtube.com/watch?v=Y1WItaegeUc"
            },"video":{
              "embedUrl":"http://www.youtube.com/v/Y1WItaegeUc?autohide=1&version=3"
            }
          },
          "repost":{
            "url":"https://plus.google.com/102898672602346817738/posts/6FJ3EpMxc1K",
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
      expect(req).to.deep.equal({"comment":"No, they aren't really using claws to remove illegally parked cars. ... read the rest https://plus.google.com/102898672602346817738/posts/6FJ3EpMxc1K-shortened","visibility":{"code":"connections-only"},"content":{"title":"A Radical Way To Deal With Illegal Parking","description":"Meanwhile in Russia.","submitted-url":"http://www.youtube.com/watch?v=Y1WItaegeUc-shortened","submitted-image-url":"https://images2-focus-opensocial.googleusercontent.com/gadgets/proxy?url=http://i2.ytimg.com/vi/Y1WItaegeUc/hqdefault.jpg&container=focus&gadget=a&rewriteMime=image/*&refresh=31536000&resize_w=497"}});

      done();
    });
  });

  it('should convert video repost for group', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.linkedin.code,
            account: Types.account.group.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"linkedin-id",
          "accountCode":30000,
          "html":"<p>No, they aren't really using claws to remove illegally parked cars. ... read the rest https://plus.google.com/102898672602346817738/posts/6FJ3EpMxc1K</p>",
          "processor":"repost:linkedin:profile",
          "attachments":{
            "link":{
              "photo":{
                "thumbnail":{
                  "isFullBleed":false,
                  "aniGif":false,
                  "contentType":"image/jpeg",
                  "height":372,
                  "width":497,
                  "url":"https://images2-focus-opensocial.googleusercontent.com/gadgets/proxy?url=http://i2.ytimg.com/vi/Y1WItaegeUc/hqdefault.jpg&container=focus&gadget=a&rewriteMime=image/*&refresh=31536000&resize_w=497"
                },
                "aniGif":false,
                "contentType":"image/jpeg",
                "height":372,
                "width":497,
                "url":"https://images2-focus-opensocial.googleusercontent.com/gadgets/proxy?url=http://i2.ytimg.com/vi/Y1WItaegeUc/hqdefault.jpg&container=focus&gadget=a&rewriteMime=image/*&refresh=31536000&resize_w=497"
              },
              "description":"Meanwhile in Russia.",
              "title":"A Radical Way To Deal With Illegal Parking",
              "domain":"www.youtube.com",
              "url":"http://www.youtube.com/watch?v=Y1WItaegeUc"
            },"video":{
              "embedUrl":"http://www.youtube.com/v/Y1WItaegeUc?autohide=1&version=3"
            }
          },
          "repost":{
            "url":"https://plus.google.com/102898672602346817738/posts/6FJ3EpMxc1K",
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
      expect(req).to.deep.equal({"title":"No, they aren't really using claws to remove illegally parked cars. ... read the rest https://plus.g","summary":"No, they aren't really using claws to remove illegally parked cars. ... read the rest https://plus.google.com/102898672602346817738/posts/6FJ3EpMxc1K-shortened","content":{"title":"A Radical Way To Deal With Illegal Parking","description":"Meanwhile in Russia.","submitted-url":"http://www.youtube.com/watch?v=Y1WItaegeUc-shortened","submitted-image-url":"https://images2-focus-opensocial.googleusercontent.com/gadgets/proxy?url=http://i2.ytimg.com/vi/Y1WItaegeUc/hqdefault.jpg&container=focus&gadget=a&rewriteMime=image/*&refresh=31536000&resize_w=497"}});

      done();
    });
  });

  it('should convert person autocomplete', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.linkedin.code,
            account: Types.account.group.code
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
      expect(req).to.deep.equal({"title":"Suite à qq incidents avec ses chauffeurs partenaires, Uber publie une update sur sa vision de la séc","summary":"Suite à qq incidents avec ses chauffeurs partenaires, Uber publie une update sur sa vision de la sécurité client.  #ns","content":{"title":"An update from the Uber Safety Team","description":"We are committed to ensuring Uber is the safest way to get around a city. As part of that commitment, last December I promised to keep riders and drivers","submitted-url":"http://blog.uber.com/safetyteamupdate-shortened","submitted-image-url":"http://blog.uber.com/wp-content/uploads/2015/03/uber_Safety_BlogHeader_1400x600-700x300.png"}});

      done();
    });
  });
});