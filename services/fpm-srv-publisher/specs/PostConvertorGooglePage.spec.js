'use strict';

process.env.NODE_ENV = 'test';

var _dir = __dirname+'/../src/',
    expect = require('chai').expect,
    ObjectId = require('mongoose').Types.ObjectId,
    Types = require(_dir+'lib/Types'),
    Post = require(_dir+'models/Post'),
    Profile = require(_dir+'models/Profile').Profile,
    PostConvertor = require(_dir+'lib/convertors/PostConvertorGooglePage');

describe('PostConvertorGooglePage', function(){

  require('chai').config.includeStack = true;

  it('should convert link+photo post', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.google.code,
            account: Types.account.page.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"google-id",
          "accountCode":1,
          "html":"<p>\"There are 70,000 bridges classified as “structurally deficient” in the United States</p>",
          "processor":"repost:google:page",
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
      expect(req).to.deep.equal({"req":{"object":{"content":"\"There are 70,000 bridges classified as “structurally deficient” in the United States","attachments":[{"url":"http://idnes.cz-shortened"}]},"access":{"items":[{"type":"public"}]}},"photoUrl":false});

      done();
    });
  });

  it('should convert link post', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.google.code,
            account: Types.account.page.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"google-id",
          "accountCode":1,
          "html":"<p>\"There are 70,000 bridges classified as “structurally deficient” in the United States</p>",
          "processor":"repost:google:page",
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
      expect(req).to.deep.equal({photoUrl: false,"req":{"object":{"content":"\"There are 70,000 bridges classified as “structurally deficient” in the United States","attachments":[{"url":"http://idnes.cz-shortened"}]},"access":{"items":[{"type":"public"}]}}});

      done();
    });
  });

  it('should convert photo post', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.google.code,
            account: Types.account.page.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"google-id",
          "accountCode":1,
          "html":"<p>0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789</p>",
          "processor":"repost:google:page",
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
      expect(req).to.deep.equal({"req":{"object":{"content":"0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789"},"access":{"items":[{"type":"public"}]}},"photoUrl":"https://lh5.googleusercontent.com/-OLlp0vtXzmA/UFLn6-__10I/AAAAAAAAsGg/Ica7uXYvBc4/s0/Screen%2BShot%2B2012-09-14%2Bat%2B1.16.13%2BAM.png"});

      done();
    });
  });

  it('should convert photo repost', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.google.code,
            account: Types.account.page.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"google-id",
          "accountCode":1,
          "html":"<p><b>&quot;When your house is burning down, you should brush your teeth.&quot;</b></p><p></p><p>Possibly The Oatmeal&#39;s best, and that&#39;s saying something.</p><p></p><p>Funny and profane, as you&#39;d expect from The Oatmeal. But also surprisingly moving.</p><p></p><p>http://theoatmeal.com/comics/house</p>",
          "processor":"repost:google:page",
          "attachments":{
            "photo":{
              "aniGif":false,
              "contentType":"image/png",
              "height":396,
              "width":558,
              "url":"https://lh5.googleusercontent.com/-Li8WOPBDzio/UR0X2GwrFCI/AAAAAAAAMwk/2ZtR4iaUkS0/s0/house_big2.png"
            }
          },
          "repost":{
            "url":"https://plus.google.com/115157882097089845153/posts/gYdoyY7jihX",
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
      expect(req).to.deep.equal({"req":{"object":{"content":"*\"When your house is burning down, you should brush your teeth.\"*\n\nPossibly The Oatmeal's best, and that's saying something.\n\nFunny and profane, as you'd expect from The Oatmeal. But also surprisingly moving.\n\nhttp://theoatmeal.com/comics/house"},"access":{"items":[{"type":"public"}]}},"photoUrl":"https://lh5.googleusercontent.com/-Li8WOPBDzio/UR0X2GwrFCI/AAAAAAAAMwk/2ZtR4iaUkS0/s0/house_big2.png"});

      done();
    });
  });

  it('should convert video repost', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.google.code,
            account: Types.account.page.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "uid":"google-id",
          "accountCode":1,
          "html":"<p><b>No, they aren&#39;t really using claws to remove illegally parked cars.</b></p><p></p><p>I just saw this on Good Morning America as &quot;How they deal with illegally parked cars in Russia.&quot;</p><p></p><p>Here&#39;s what it actually is, according to multiple accounts in the video description: &quot;These new Mazdas were being delivered aboard the ferry Cougar Ace, which partially sank off of the Aleutian Islands during a ballast transfer. Because of the damage they sustained when the ship rolled over, the cars were deemed a safety hazard, and the entire cargo was ordered destroyed. THAT is what you&#39;re seeing here.&quot;</p><p></p><p>More in the second-to-last paragraph here:</p><p></p><p>http://www.caranddriver.com/features/cougar-ace-the-great-103-million-snafu-at-sea-breaking-down-the-cars-page-5</p><p></p><p>https://plus.google.com/102898672602346817738/posts/6FJ3EpMxc1K</p>",
          "processor":"repost:google:page",
          "attachments":{
            "link":{
              "description":"Meanwhile in Russia.",
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
      // console.log('err',err,'req',req && JSON.stringify(req));
      
      expect(err).not.to.be.defined;
      expect(req).to.be.ok;
      expect(req).to.deep.equal({"req":{"object":{"content":"*No, they aren't really using claws to remove illegally parked cars.*\n\nI just saw this on Good Morning America as \"How they deal with illegally parked cars in Russia.\"\n\nHere's what it actually is, according to multiple accounts in the video description: \"These new Mazdas were being delivered aboard the ferry Cougar Ace, which partially sank off of the Aleutian Islands during a ballast transfer. Because of the damage they sustained when the ship rolled over, the cars were deemed a safety hazard, and the entire cargo was ordered destroyed. THAT is what you're seeing here.\"\n\nMore in the second-to-last paragraph here:\n\nhttp://www.caranddriver.com/features/cougar-ace-the-great-103-million-snafu-at-sea-breaking-down-the-cars-page-5\n\nhttps://plus.google.com/102898672602346817738/posts/6FJ3EpMxc1K-shortened","attachments":[{"url":"http://www.youtube.com/watch?v=Y1WItaegeUc-shortened"}]},"access":{"items":[{"type":"public"}]}},"photoUrl":false});

      done();
    });
  });

  it('should convert person autocomplete', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.google.code,
            account: Types.account.page.code
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
      expect(req).to.deep.equal({"req":{"object":{"content":"Suite à qq incidents avec ses chauffeurs partenaires, +1234567890 publie une update sur sa vision de la sécurité client.  #ns","attachments":[{"url":"http://blog.uber.com/safetyteamupdate-shortened"}]},"access":{"items":[{"type":"public"}]}},"photoUrl":false});

      done();
    });
  });


  it('should convert person autocomplete', function(done) {
    var profile = new Profile({
          _id: ObjectId(),
          accounts: [{
            _id: ObjectId(),
            network: Types.network.google.code,
            account: Types.account.page.code
          }]
        }),
        post = new Post({
          _id: ObjectId(),
          "aid": profile.accounts[0]._id,
          "accountCode": Types.createCode(profile.accounts[0].network, profile.accounts[0].account),
          "appendNoShare" : true,
          "attachments" : {
            "photo" : {
              "url" : "https://fpm-photo-upload.s3.amazonaws.com/6ed0bf3c3bf64e558fc4418f5936f27c.jpg"
            }
          },
          "blockedAt" : null,
          "createdAt" : new Date(),
          "editable" : true,
          "failures" : [],
          "html" : "<p><strong>New Friends+Me comes with more powerful features.</strong></p><p>&nbsp;</p><p>Check your new dashboard https://app.friendsplus.me</p><p>&nbsp;</p><p>It&rsquo;s been awhile and a lot has changed. The plans are bigger, the vision is wider, the user base is growing and I&rsquo;ve finally released the new Friends+Me version I promised you all for so long. You know&hellip; :)</p><p>&nbsp;</p><p>Wanna you know what I am up to with this and other upcoming Friends+Me releases?</p><p>&nbsp;</p><p><strong>Friends+Me will become the best tool for publishing to Google+, social networks and other platforms.</strong></p><p>&nbsp;</p><p>Don&rsquo;t forget to tell your boss, colleagues, friends, mothers, fathers, well everybody about Friends+Me because I need your help to finish this quest.</p><p>&nbsp;</p><p><strong>I bet you wanna know more about the new version of Friends+Me, right? Let&rsquo;s see what we have here.</strong></p><p>&nbsp;</p><p>Complete redesign of the landing page and the web application. We&rsquo;re again a bit closer to the perfect user experience. Hard to achieve but we&rsquo;re getting there.</p><p>&nbsp;</p><p>Schedule/publish new posts for every connected account without even leaving the Friends+Me web application. No exceptions. Publishing to Google+ profiles will be available soon.</p><p>&nbsp;</p><p>Friends+Me can now satisfy your social media publishing needs.</p><p>&nbsp;</p><p>Here&rsquo;s just a short list of new features:</p><p>* Publish/schedule a post for every connected account.<br />* Manage queue and timeline of all accounts from one place.<br />* More powerful reposts routing. Control hashtags can be configured to override default destination accounts.<br />* Pause a queue per account, in case you want to temporarily stop publishing to a specific account.<br />* Draft your posts before you publish them.<br />* Prepare a post, pick the destination accounts and schedule or publish the new post immediately by the new share dialog.<br />* Use the post editor with autocomplete for Google+ mentions and hashtags.<br />* <strong>And much more!</strong></p><p>&nbsp;</p><p>If you hit any problem with the new version, let me know and I&rsquo;ll fix it asap.</p><p>&nbsp;</p><p><strong>Have fun!</strong></p>",
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
      expect(req).to.deep.equal({"req":{"object":{"content":"*New Friends+Me comes with more powerful features.*\n \nCheck your new dashboard https://app.friendsplus.me\n \nIt’s been awhile and a lot has changed. The plans are bigger, the vision is wider, the user base is growing and I’ve finally released the new Friends+Me version I promised you all for so long. You know… :)\n \nWanna you know what I am up to with this and other upcoming Friends+Me releases?\n \n*Friends+Me will become the best tool for publishing to Google+, social networks and other platforms.*\n \nDon’t forget to tell your boss, colleagues, friends, mothers, fathers, well everybody about Friends+Me because I need your help to finish this quest.\n \n*I bet you wanna know more about the new version of Friends+Me, right? Let’s see what we have here.*\n \nComplete redesign of the landing page and the web application. We’re again a bit closer to the perfect user experience. Hard to achieve but we’re getting there.\n \nSchedule/publish new posts for every connected account without even leaving the Friends+Me web application. No exceptions. Publishing to Google+ profiles will be available soon.\n \nFriends+Me can now satisfy your social media publishing needs.\n \nHere’s just a short list of new features:\n* Publish/schedule a post for every connected account.\n* Manage queue and timeline of all accounts from one place.\n* More powerful reposts routing. Control hashtags can be configured to override default destination accounts.\n* Pause a queue per account, in case you want to temporarily stop publishing to a specific account.\n* Draft your posts before you publish them.\n* Prepare a post, pick the destination accounts and schedule or publish the new post immediately by the new share dialog.\n* Use the post editor with autocomplete for Google+ mentions and hashtags.\n* *And much more!*\n \nIf you hit any problem with the new version, let me know and I’ll fix it asap.\n \n*Have fun!* #ns"},"access":{"items":[{"type":"public"}]}},"photoUrl":"https://fpm-photo-upload.s3.amazonaws.com/6ed0bf3c3bf64e558fc4418f5936f27c.jpg"});

      done();
    });
  });
});