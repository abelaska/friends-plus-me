'use strict';

process.env.NODE_ENV = 'test';

var _dir = __dirname+'/../src/',
    expect = require('chai').expect,
    ObjectId = require('mongoose').Types.ObjectId,
    Types = require(_dir+'lib/Types'),
    Post = require(_dir+'models/Post'),
    Profile = require(_dir+'models/Profile').Profile,
    PostConvertor = require(_dir+'lib/convertors/PostConvertorTwitter');

describe('PostConvertorTwitter', function(){

  require('chai').config.includeStack = true;

  it('should shorten link', function(done) {
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
          "accountCode" : 10000,
          "aid" : profile.accounts[0]._id,
          "attachments" : {
              "link" : {
                  "description" : null,
                  "domain" : "www.edutopia.org",
                  // "short" : {
                  //     "type" : "bitly",
                  //     "url" : "http://bit.ly/1D1Fu8x"
                  // },
                  "title" : "15+ Ways of Teaching Every Student to Code (Even Without a Computer)",
                  "url" : "http://www.edutopia.org/blog/15-ways-teaching-students-coding-vicki-davis?utm_content=bufferf2135&utm_medium=social&utm_source=plus.google.com&utm_campaign=buffer"
              },
              "photo" : {
                  "aniGif" : false,
                  "contentType" : "image/png",
                  "height" : 345,
                  "width" : 460,
                  "url" : "http://www.edutopia.org/sites/default/files/styles/share_image/public/davis-15-wyays-to-teach-every-student-to-code-3-01.png?itok=NvBBL5qN"
              }
          },
          "blockedAt" : null,
          "completedAt" : new Date(),
          "createdAt" : new Date(),
          "editable" : true,
          "extension" : {
              "publishers" : []
          },
          "failures" : [],
          "html" : "<p>test 5 http://www.edutopia.org/blog/15-ways-teaching-students-coding-vicki-davis?utm_content=bufferf2135&utm_medium=social&utm_source=plus.google.com&utm_campaign=buffer</p>",
          "id" : "581099946268602368",
          "lockedUntil" : new Date(),
          "modifiedAt" : new Date(),
          "pid" : profile._id,
          "processor" : "repost:twitter:profile",
          "publishAt" : new Date(),
          "repost" : {
              "id" : "z12chhj5wzncvlrav04ccjngupyetvexwcs",
              "src" : ObjectId("550741636216a40100a5db1c"),
              "url" : "https://plus.google.com/108087756774527107581/posts/dkagHYiQGko",
              "is" : true
          },
          "state" : 100,
          "tries" : 1,
          "uid" : "747422887",
          "url" : "https://twitter.com/747422887/status/581099946268602368"
        }),
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, 'http://bit.ly/1D1Fu8x');
        });

    conv.convert(function(err, req) {
      // console.log('err',err,'req',req && JSON.stringify(req));
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({
        "photoUrl": "http://www.edutopia.org/sites/default/files/styles/share_image/public/davis-15-wyays-to-teach-every-student-to-code-3-01.png?itok=NvBBL5qN",
        "status": "test 5 http://bit.ly/1D1Fu8x"
      });

      done();
    });
  });

  it('should convert link+photo post', function(done) {
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
          "uid":"twitter-id",
          "accountCode":10000,
          "html":"<p>\"There are 70,000 bridges classified as “structurally deficient” in the United States</p>",
          "processor":"repost:twitter:profile",
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
      expect(req).to.deep.equal({
        "photoUrl": "http://gidnes.cz/o/ogimage/idnes-idnes.jpg",
        "status": "\"There are 70,000 bridges classified as “structurally deficient” in the United States http://idnes.cz-shortened"
      });

      done();
    });
  });

  it('should convert link post', function(done) {
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
          "uid":"twitter-id",
          "accountCode":10000,
          "html":"<p>\"There are 70,000 bridges classified as “structurally deficient” in the United States</p>",
          "processor":"repost:twitter:profile",
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
      expect(req).to.deep.equal({
        "photoUrl": undefined,
        "status": "\"There are 70,000 bridges classified as “structurally deficient” in the United States http://idnes.cz-shortened"
      });

      done();
    });
  });

  it('should convert photo post', function(done) {
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
          "uid":"twitter-id",
          "accountCode":10000,
          "html":"<p>0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789</p>",
          "processor":"repost:twitter:profile",
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
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({
        "photoUrl": "https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s0/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png",
        "status": "0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789"
      });

      done();
    });
  });

  // it('should convert post with too long status', function(done) {
  //   var profile = new Profile({
  //         _id: ObjectId(),
  //         accounts: [{
  //           _id: ObjectId(),
  //           network: Types.network.twitter.code,
  //           account: Types.account.profile.code
  //         }]
  //       }),
  //       post = new Post({
  //         _id: ObjectId(),
  //         "uid":"twitter-id",
  //         "accountCode":10000,
  //         "html":"<p>0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789</p>",
  //         "processor":"repost:twitter:profile",
  //         "attachments":{
  //           "photo":{
  //             "aniGif":false,
  //             "contentType":"image/png",
  //             "height":666,
  //             "width":761,
  //             "url":"https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s0/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png"
  //           }
  //         },
  //         "repost":{
  //           "is":false
  //         },
  //         "state":0,
  //         "failures":[],
  //         "tries":0
  //       }),
  //       shortenedSuffix = '-shortened',
  //       conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
  //         lsCallback(null, url+shortenedSuffix);
  //       });

  //   conv.convert(function(err, req) {
  //     // console.log('err',err,'req',req && JSON.stringify(req));
      
  //     expect(req).not.to.be.defined;
  //     expect(err).to.be.ok;
  //     expect(err).to.deep.equal({
  //       isFatal: true,
  //       error: {
  //         message: 'Message is too long, 130 > max. 116',
  //         code: 'MESSAGE_TOO_LONG' } });

  //     done();
  //   });
  // });

  it('should convert photo repost', function(done) {
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
          "uid":"twitter-id",
          "accountCode":10000,
          "html":"<p>RT Think iPhone wouldn't sell? It already is sold out</p>",
          "processor":"repost:twitter:profile",
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
      expect(req).to.deep.equal({
        status: 'RT Think iPhone wouldn\'t sell? It already is sold out',
        photoUrl: "https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s0/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png"
      });

      done();
    });
  });

  it('should convert video repost', function(done) {
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
          uid: "twitter-id",
          accountCode: 10000,
          html: "<p>title</p><p>Good times! https://plus.google.com/118188440302609566032/posts/S4E9ya13XAV http://www.youtube.com/watch?v=opOsgzzDPdw</p>",
          processor: "repost:twitter:profile",
          attachments: {
            photo: {
              aniGif: false,
              contentType: "image/jpeg",
              "height":100,
              "width":133,
              "url":"https://images0-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&gadget=a&resize_h=100&url=http%3A%2F%2Fi4.ytimg.com%2Fvi%2FopOsgzzDPdw%2Fhqdefault.jpg"
            },
            "link":{
              "description":null,
              "title":"The Rocky Horror Picture Show- The Time Warp Dance",
              "domain":"www.youtube.com",
              "url":"http://www.youtube.com/watch?v=opOsgzzDPdw"
            },
            "video":{
              "embedUrl":"http://www.youtube.com/v/opOsgzzDPdw?version=3&autohide=1"
            }
          },
          "repost":{
            "url":"https://plus.google.com/118188440302609566032/posts/S4E9ya13XAV",
            "is":true
          },
          "state":0,
          "failures":[],
          "tries":0,
        }),
        shortenedSuffix = '-shortened',
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, url+shortenedSuffix);
        });

    conv.convert(function(err, req) {
      // console.log('err',err,'req',req && JSON.stringify(req));
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({
        status: 'title\nGood times! https://plus.google.com/118188440302609566032/posts/S4E9ya13XAV-shortened http://www.youtube.com/watch?v=opOsgzzDPdw-shortened',
        photoUrl: false
      });

      done();
    });
  });

  it('should not be too long', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.twitter.code,
            account: Types.account.profile.code,
            appendLink: true,
            limitMsgLen: true
          }]
        }),
        post = new Post({_id: ObjectId(),"uid":"twitter-id","accountCode":10000,"html":"<p>RT Можно ли читать всё подряд? http://pyonerka.livejournal.com/110291.html</p>","processor":"repost:twitter:profile","attachments":{"photo":{"aniGif":false,"contentType":"image/jpeg","height":372,"width":800,"url":"http://ic.pics.livejournal.com/pyonerka/53523689/37770/37770_900.jpg"},"link":{"description":null,"title":"Можно ли читать всё подряд?","domain":"pyonerka.livejournal.com","url":"http://pyonerka.livejournal.com/110291.html"}},"repost":{"id":"z13fevbg0taqvvcem23hh1t5uuuuuxpwd04","url":"https://plus.google.com/+АлексейВостриков/posts/Em3L53mtBNu","is":true},"extension":{"publishers":[]},"editable":true,"state":0,"failures":[],"tries":0,"blockedAt":null}),
        shortenedSuffix = '-shortened',
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, url+shortenedSuffix);
        });

    conv.convert(function(err, req) {
      // console.log('err',err,'req',req && JSON.stringify(req));

// total: 88
// <p>RT Можно ли читать всё подряд? https://plus.google.com/+АлексейВостриков/posts/Em3L53mtBNu</p>
// Можно ли читать всё подряд?=61-5(space+?)=56
// 88-24(link+space)=64-'RT '=61

// total 115:
// <p>RT Мормоны в России. Разведка США https://plus.google.com/+АлексейВостриков/posts/2Wu2XE4rETP https://www.youtube.com/watch?v=9sl6RXopQa8&feature=autoshare</p>
// Мормоны в России. Разведка США=64-4(space)-15(МорoРосс.РаeaCA)=45
// 115-2*24(link+space)=67-'RT '=64

      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({
        "status":"RT Можно ли читать всё подряд? http://pyonerka.livejournal.com/110291.html-shortened",
        "photoUrl":"http://ic.pics.livejournal.com/pyonerka/53523689/37770/37770_900.jpg"});

      done();
    });
  });

  it('should convert person autocomplete', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.twitter.code,
            account: Types.account.profile.code,
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
          "html" : "<p>Suite &agrave; qq avec ses chauffeurs partenaires,&nbsp;<input class=\"autocompleted autocompleted-person\" type=\"button\" value=\"+Uber\" data-uid=\"1234567890\" />&nbsp;publie une update sur sa vision de la s&eacute;curit&eacute; client.&nbsp;</p>",
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
      expect(req).to.deep.equal({photoUrl: undefined,"status":"Suite à qq avec ses chauffeurs partenaires, Uber publie une update sur sa vision de la sécurité client.  #ns http://blog.uber.com/safetyteamupdate-shortened"});

      done();
    });
  });

  it('should convert post with link already in the message', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.twitter.code,
            account: Types.account.profile.code,
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "aid": profile.accounts[0]._id,
          "accountCode": Types.createCode(profile.accounts[0].network, profile.accounts[0].account),
          "appendNoShare" : false,
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
          "html" : "<p>test http://blog.uber.com/safetyteamupdate</p>",
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
      expect(req).to.deep.equal({"status":"test http://blog.uber.com/safetyteamupdate-shortened",photoUrl: undefined});

      done();
    });
  });

  it('should convert post with link already shotened link', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.twitter.code,
            account: Types.account.profile.code,
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "aid": profile.accounts[0]._id,
          "accountCode": Types.createCode(profile.accounts[0].network, profile.accounts[0].account),
          "appendNoShare" : false,
          "attachments" : {
              "link" : {
                  "short": {
                    "url": "http://goo.gl/1"
                  },
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
          "html" : "<p>test http://goo.gl/1</p>",
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
      expect(req).to.deep.equal({"status":"test http://goo.gl/1",photoUrl: undefined});

      done();
    });
  });

  it('should convert post with link already shortened link to attach', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.twitter.code,
            account: Types.account.profile.code,
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "aid": profile.accounts[0]._id,
          "accountCode": Types.createCode(profile.accounts[0].network, profile.accounts[0].account),
          "appendNoShare" : false,
          "attachments" : {
              "link" : {
                  "short": {
                    "url": "http://blog.uber.com/safetyteamupdate/already-shortened"
                  },
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
          "html" : "<p>test http://blog.uber.com/safetyteamupdate</p>",
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
      expect(req).to.deep.equal({"status":"test http://blog.uber.com/safetyteamupdate/already-shortened",photoUrl: undefined});

      done();
    });
  });
});