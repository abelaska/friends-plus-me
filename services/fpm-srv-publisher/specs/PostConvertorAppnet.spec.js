'use strict';

process.env.NODE_ENV = 'test';

var _dir = __dirname+'/../src/',
    expect = require('chai').expect,
    ObjectId = require('mongoose').Types.ObjectId,
    Types = require(_dir+'lib/Types'),
    Post = require(_dir+'models/Post'),
    Profile = require(_dir+'models/Profile').Profile,
    PostConvertor = require(_dir+'lib/convertors/PostConvertorAppnet');

describe('PostConvertorAppnet', function(){

  require('chai').config.includeStack = true;

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
          "uid":"appnet-id",
          "accountCode":50000,
          "html":"<p>\"There are 70,000 bridges classified as “structurally deficient” in the United States</p>",
          "processor":"repost:appnet:profile",
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
      expect(req).to.deep.equal({"annotations":[{"type":"net.app.core.oembed","value":{"version":"1.0","type":"photo","embeddable_url":"https://photos.app.net/{post_id}/1","url":"http://gidnes.cz/o/ogimage/idnes-idnes.jpg","width":1200,"height":630,"thumbnail_url":"https://lh5.googleusercontent.com/proxy/O9_1Wrk2Ymkrt2Z9E45Of14UsnWhgtPLfx2CC07uiyxkZyoX8AbCCLWeTuKPevvXDagK71ipdlZWKQ=w300-h180","thumbnail_width":300,"thumbnail_height":180}}],"text":"\"There are 70,000 bridges classified as “structurally deficient” in the United States http://idnes.cz-shortened"});

      done();
    });
  });

  it('should convert photo post', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.appnet.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"appnet-id",
          "accountCode":50000,
          "html":"<p>0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789</p>",
          "processor":"repost:appnet:profile",
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
      expect(req).to.deep.equal({"annotations":[{"type":"net.app.core.oembed","value":{"version":"1.0","type":"photo","embeddable_url":"https://photos.app.net/{post_id}/1","url":"https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s0/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png","width":761,"height":666,thumbnail_url: undefined,thumbnail_width: undefined,thumbnail_height: undefined}}],"text":"0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789"});

      done();
    });
  });

  it('should convert post with too long status', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.appnet.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"appnet-id",
          "accountCode":50000,
          "html":"<p>0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789</p>",
          "processor":"repost:appnet:profile",
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
      
      expect(req).not.to.be.defined;
      expect(err).to.be.ok;
      expect(err).to.deep.equal({
        isFatal: true,
        error: {
          message: 'Message is too long, 310 > max. 256',
          code: 'MESSAGE_TOO_LONG' } });

      done();
    });
  });

  it('should convert link repost', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.appnet.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"appnet-id",
          "accountCode":50000,
          "html":"<p>Think iPhone wouldn't sell? It already is sold out</p><p></p><p>In just about an hour Apple sold out all of its \"ship first day\" inventory. The only way to get one the first day now is to wait in line... https://plus.google.com/114197358633834273250/posts/T3XEwvYje7N</p>",
          "processor":"repost:appnet:profile",
          "attachments":{
            "link":{
              "photo":{
                "thumbnail":{
                  "isFullBleed":false,
                  "height":443,
                  "width":506,
                  "url":"https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s506/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png"
                },
                "height":666,
                "width":761,
                "url":"https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s0/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png"
              },
              "title":"Reshared post from Robert Scoble\n \n\nThink iPhone wouldn't sell? It already is sold out\n\nIn just a...",
              "domain":"plus.google.com",
              "url":"https://plus.google.com/114197358633834273250/posts/T3XEwvYje7N"
            }
          },
          "repost":{
            "url":"https://plus.google.com/114197358633834273250/posts/T3XEwvYje7N",
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
      expect(req).to.deep.equal({"annotations":[{"type":"net.app.core.crosspost","value":{"canonical_url":"https://plus.google.com/114197358633834273250/posts/T3XEwvYje7N-shortened"}},{"type":"net.app.core.oembed","value":{"version":"1.0","type":"photo","embeddable_url":"https://photos.app.net/{post_id}/1","url":"https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s0/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png","width":761,"height":666,"thumbnail_url":"https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s506/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png","thumbnail_width":506,"thumbnail_height":443}}],"text":"Think iPhone wouldn't sell? It already is sold out\n\nIn just about an hour Apple sold out all of its \"ship first day\" inventory. The only way to get one the first day now is to wait in line... https://plus.google.com/114197358633834273250/posts/T3XEwvYje7N-shortened"});

      done();
    });
  });

  it('should convert video repost', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.appnet.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"appnet-id",
          "accountCode":50000,
          "html":"<p>Good times! — http://www.youtube.com/watch?v=opOsgzzDPdw</p>",
          "processor":"repost:appnet:profile",
          "attachments":{
            "link":{
              "photo":{
                "thumbnail":{
                  "isFullBleed":false,
                  "aniGif":false,
                  "contentType":"image/jpeg",
                  "height":100,
                  "width":133,
                  "url":"https://images0-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&gadget=a&resize_h=100&url=http%3A%2F%2Fi4.ytimg.com%2Fvi%2FopOsgzzDPdw%2Fhqdefault.jpg"
                },
                "aniGif":false,
                "contentType":"image/jpeg",
                "height":100,
                "width":133,
                "url":"https://images0-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&gadget=a&resize_h=100&url=http%3A%2F%2Fi4.ytimg.com%2Fvi%2FopOsgzzDPdw%2Fhqdefault.jpg"
              },
              "description":"It&#39;s astounding Time is fleeting Madness...takes its toll But Listen Closely Not for very much longer I&#39;ve got to...keep control I remember don&#39; the time war...",
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
      expect(req).to.deep.equal({"annotations":[{"type":"net.app.core.crosspost","value":{"canonical_url":"https://plus.google.com/118188440302609566032/posts/S4E9ya13XAV-shortened"}},{"type":"net.app.core.oembed","value":{"version":"1.0","type":"photo","embeddable_url":"https://photos.app.net/{post_id}/1","url":"https://images0-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&gadget=a&resize_h=100&url=http%3A%2F%2Fi4.ytimg.com%2Fvi%2FopOsgzzDPdw%2Fhqdefault.jpg","width":133,"height":100,"thumbnail_url":"https://images0-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&gadget=a&resize_h=100&url=http%3A%2F%2Fi4.ytimg.com%2Fvi%2FopOsgzzDPdw%2Fhqdefault.jpg","thumbnail_width":133,"thumbnail_height":100}}],"text":"Good times! — http://www.youtube.com/watch?v=opOsgzzDPdw-shortened"});

      done();
    });
  });

  it('should convert person autocomplete', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.appnet.code,
            account: Types.account.profile.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "aid": profile.accounts[0]._id,
          "accountCode":50000,
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
      expect(req).to.deep.equal({"annotations":[{"type":"net.app.core.oembed","value":{"version":"1.0","type":"photo","embeddable_url":"https://photos.app.net/{post_id}/1","url":"http://blog.uber.com/wp-content/uploads/2015/03/uber_Safety_BlogHeader_1400x600-700x300.png","width":700,"height":300,"thumbnail_url":"https://lh5.googleusercontent.com/proxy/J2K-2r_InppKOV1cCP0VrVdkW7NO0QABvF_nRTe3N9JhwY5BeyYE_vRWH4Gyz2F_7vXVCfisLns4uwsylUYOijvuckjfIZQ0WFyPD4JsIWckJMcP9LOhfaL8J2CTr2N1f9yseKWub9lwIaM=w300-h180","thumbnail_width":300,"thumbnail_height":180}}],"text":"Suite à qq incidents avec ses chauffeurs partenaires, Uber publie une update sur sa vision de la sécurité client.  #ns http://blog.uber.com/safetyteamupdate-shortened"});

      done();
    });
  });
});