'use strict';

process.env.NODE_ENV = 'test';

var _dir = __dirname+'/../src/',
    expect = require('chai').expect,
    ObjectId = require('mongoose').Types.ObjectId,
    Types = require(_dir+'lib/Types'),
    Post = require(_dir+'models/Post'),
    Profile = require(_dir+'models/Profile').Profile,
    PostConvertor = require(_dir+'lib/convertors/PostConvertorTumblr');

describe('PostConvertorTumblr', function(){

  require('chai').config.includeStack = true;

  it('should convert link+photo post', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.tumblr.code,
            account: Types.account.blog.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"tumblr-id",
          "accountCode":40000,
          "processor":"repost:tumblr:profile",
          "html":"<p>\"There are 70,000 bridges classified as “structurally deficient” in the United States</p>",
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
      // console.log('err',err,'req',req);
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({ type: 'text',
        title: 'iDNES.cz – zprávy, kterým můžete věřit',
        body: '<p>&quot;There are 70,000 bridges classified as &#x201C;structurally deficient&#x201D; in the United States</p><p>http://idnes.cz-shortened</p><p><img src="http://gidnes.cz/o/ogimage/idnes-idnes2.jpg"/></p>',
        tags: '' });

      done();
    });
  });

  it('should convert link post', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.tumblr.code,
            account: Types.account.blog.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"tumblr-id",
          "accountCode":40000,
          "html":"<p>Eric Curts, Tim Maki, Richard Knepp, Carol LaRow, Joshua Mulloy, Rachel Small, Andrew Gamble, Deb Boisvert, and Lucie deLaBruere</p>",
          "processor":"repost:tumblr:profile",
          "attachments":{
            "link":{
              "description":null,
              "title":"Hangout",
              "domain":"plus.google.com",
              "url":"https://plus.google.com/116502499532003007487/posts/2WhfokBHpeD"
            }
          },
          "repost":{
            "url":"https://plus.google.com/116502499532003007487/posts/2WhfokBHpeD",
            "is":true
          }
        }),
        shortenedSuffix = '-shortened',
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, url+shortenedSuffix);
        });

    conv.convert(function(err, req) {
      // console.log('err',err,'req',req);
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({
        type: 'link',
        url: 'https://plus.google.com/116502499532003007487/posts/2WhfokBHpeD-shortened',
        title: 'Hangout',
        description: '<p>Eric Curts, Tim Maki, Richard Knepp, Carol LaRow, Joshua Mulloy, Rachel Small, Andrew Gamble, Deb Boisvert, and Lucie deLaBruere</p>',
        tags: ''
      });

      done();
    });
  });

  it('should convert photo post', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.tumblr.code,
            account: Types.account.blog.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"tumblr-id",
          "accountCode":40000,
          "html":"<p>Time to call it a night, gang. Have a great one and I&#39;ll see you in the morning!</p>",
          "processor":"repost:tumblr:profile",
          "attachments":{
            "photo":{
              "aniGif":true,
              "contentType":"image/gif",
              "height":136,
              "width":240,
              "url":"https://lh4.googleusercontent.com/-zj4BVjFBT78/UigNcQz2sqI/AAAAAAAA1UQ/X9maIM6XEXY/w500/FDbWnSN.gif"
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
      // console.log('err',err,'req',req);
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({
        type: 'photo',
        link: undefined,
        caption: '<p>Time to call it a night, gang. Have a great one and I&apos;ll see you in the morning!</p>',
        source: 'https://lh4.googleusercontent.com/-zj4BVjFBT78/UigNcQz2sqI/AAAAAAAA1UQ/X9maIM6XEXY/w500/FDbWnSN.gif',
        tags: ''
      });

      done();
    });
  });

  it('should convert link with photo repost', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.tumblr.code,
            account: Types.account.blog.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"tumblr-id",
          "accountCode":40000,
          "html":"<p>The Dachau camp library was accessible to all prisoners except Jews and those in the isolation and punishment blocks.</p>",
          "processor":"repost:tumblr:profile",
          "attachments":{
            "link":{
              "photo":{
                "thumbnail":{
                  "isFullBleed":false,
                  "height":380,
                  "width":506,
                  "url":"http://31.media.tumblr.com/fc561440337abb70edc89a87950133af/tumblr_mqv7liJXbK1qz56bgo1_1280.jpg"
                },
                "aniGif":false,
                "contentType":"image/jpeg",
                "height":960,
                "width":1280,
                "url":"http://31.media.tumblr.com/fc561440337abb70edc89a87950133af/tumblr_mqv7liJXbK1qz56bgo1_1280.jpg"
              },
              "description":null,
              "title":"bookpatrol: “ Dachau Concentration Camp Library ”",
              "domain":"mostlysignssomeportents.tumblr.com",
              "url":"http://mostlysignssomeportents.tumblr.com/post/57224532827"
            }
          },
          "repost":{
            "url":"https://plus.google.com/115157882097089845153/posts/HehTFdtfMyp",
            "is":true
          }
        }),
        shortenedSuffix = '-shortened',
        conv = new PostConvertor(post, profile, profile.accounts[0], function(url, lsCallback) {
          lsCallback(null, url+shortenedSuffix);
        });

    conv.convert(function(err, req) {
      // console.log('err',err,'req',req);
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({ type: 'text',
        title: 'bookpatrol: “ Dachau Concentration Camp Library ”',
        body: '<p>The Dachau camp library was accessible to all prisoners except Jews and those in the isolation and punishment blocks.</p><p>http://mostlysignssomeportents.tumblr.com/post/57224532827-shortened</p><p><img src="http://31.media.tumblr.com/fc561440337abb70edc89a87950133af/tumblr_mqv7liJXbK1qz56bgo1_1280.jpg"/></p>',
        tags: '' });

      done();
    });
  });

  it('should convert video repost', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.tumblr.code,
            account: Types.account.blog.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          uid: "tumblr-id",

          "accountCode":40000,
          "html":"<p><b>No, they aren&#39;t really using claws to remove illegally parked cars.</b></p><p></p><p>I just saw this on <a href=\"https://plus.google.com/116806352365658350717\">Good Morning America</a> as &quot;How they deal with illegally parked cars in Russia.&quot;</p><p></p><p>Here&#39;s what it actually is, according to multiple accounts in the video description: &quot;These new Mazdas were being delivered aboard the ferry Cougar Ace, which partially sank off of the Aleutian Islands during a ballast transfer. Because of the damage they sustained when the ship rolled over, the cars were deemed a safety hazard, and the entire cargo was ordered destroyed. THAT is what you&#39;re seeing here.&quot;</p><p></p><p>More in the second-to-last paragraph here:</p><p></p><p><a href=\"http://www.caranddriver.com/features/cougar-ace-the-great-103-million-snafu-at-sea-breaking-down-the-cars-page-5\" class=\"ot-anchor\">http://www.caranddriver.com/features/cougar-ace-the-great-103-million-snafu-at-sea-breaking-down-the-cars-page-5</a>  <a class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23GoogleMaps\">#GoogleMaps</a>  <a class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23Twitter\">#Twitter</a></p>",
          "processor":"repost:tumblr:profile",
          "attachments":{
            "link":{
              "description":null,
              "title":"A Radical Way To Deal With Illegal Parking",
              "domain":"www.youtube.com",
              "url":"http://www.youtube.com/watch?v=Y1WItaegeUc"
            },
            "video":{
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
      // console.log('err',err,'req',req);
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({
        type: 'video',
        caption: '<p><b>No, they aren&#39;t really using claws to remove illegally parked cars.</b></p><p></p><p>I just saw this on <a href="https://plus.google.com/116806352365658350717">Good Morning America</a> as &quot;How they deal with illegally parked cars in Russia.&quot;</p><p></p><p>Here&#39;s what it actually is, according to multiple accounts in the video description: &quot;These new Mazdas were being delivered aboard the ferry Cougar Ace, which partially sank off of the Aleutian Islands during a ballast transfer. Because of the damage they sustained when the ship rolled over, the cars were deemed a safety hazard, and the entire cargo was ordered destroyed. THAT is what you&#39;re seeing here.&quot;</p><p></p><p>More in the second-to-last paragraph here:</p><p></p><p><a href="http://www.caranddriver.com/features/cougar-ace-the-great-103-million-snafu-at-sea-breaking-down-the-cars-page-5" class="ot-anchor">http://www.caranddriver.com/features/cougar-ace-the-great-103-million-snafu-at-sea-breaking-down-the-cars-page-5</a>  #GoogleMaps  #Twitter</p>',
        embed: 'http://www.youtube.com/v/Y1WItaegeUc?autohide=1&version=3',
        tags: 'GoogleMaps,Twitter'
      });

      done();
    });
  });

  it('should convert person autocomplete', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.tumblr.code,
            account: Types.account.blog.code
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
      expect(req).to.deep.equal({"type":"text","title":"An update from the Uber Safety Team","body":"<p>Suite &#xE0; qq incidents avec ses chauffeurs partenaires,&#xA0;Uber&#xA0;publie une update sur sa vision de la s&#xE9;curit&#xE9; client.&#xA0; #ns</p><p>http://blog.uber.com/safetyteamupdate-shortened</p><p><img src=\"http://blog.uber.com/wp-content/uploads/2015/03/uber_Safety_BlogHeader_1400x600-700x300.png\"/></p>","tags":"ns"});

      done();
    });
  });
});