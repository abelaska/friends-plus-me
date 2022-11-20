"use strict";

process.env.NODE_ENV = "test";

var fs = require("fs"),
	expect = require("chai").expect,
	GooglePlusPage = require(__dirname + "/../src/lib/GooglePlusPage");

describe("GooglePlusPage", function () {
	this.timeout(30000);

	require("chai").config.includeStack = true;

	it("should get activity", function (done) {
		// (new GooglePlusPage({
		//   _id: '12afe2820a2188b208006af9',
		//   uid: '108087756774527107581',
		//   token: 'XXX',
		//   secret: 'XXX'
		// })).getActivity('z13yzjfjnx2cflqjy04ccjngupyetvexwcs', function(err, data) {
		//   expect(err).to.be.null;
		//   expect(data).to.be.ok;
		//   expect(data.actor).to.be.ok;
		//   expect(data.actor.displayName).to.eq('FPMTest');
		//   expect(data.object).not.to.be.ok;
		done();
		// }, 'actor');
	});

	it("should publish photo post", function (done) {
		// (new GooglePlusPage({
		//   _id: '531f0bd012ebb43c72b7e049',
		//   uid: '108087756774527107581',
		//   token: 'XXX',
		//   secret: 'XXX'
		// })).insertWithMedia({
		//   object: {
		//     content: 'test photo post\nnext line #f'
		//   }
		// },
		// 'https://fpm-loysoftwaresro.netdna-ssl.com/images/apple-touch-icon-72x72.png?v=2.11.1',
		// function(err, data, tm) {

		//   expect(err).to.be.null;
		//   expect(data).to.be.ok;
		//   expect(data.object.content).to.be.eq('test photo post<br />next line <a rel=\"nofollow\" class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23f\">#f</a>﻿');
		//   expect(data.object.originalContent).to.be.eq('test photo post\nnext line #f');

		done();
		// });
	});

	it("should publish post", function (done) {
		// (new GooglePlusPage({
		//   _id: '531f0bd012ebb43c72b7e049',
		//   uid: '108087756774527107581',
		//   token: 'XXX',
		//   secret: 'XXX'
		// })).insert({
		//   object: {
		//     content: 'test\nnext line #f'
		//   }
		// },
		// function(err, data, tm) {

		//   expect(err).to.be.null;
		//   expect(data).to.be.ok;
		//   expect(data.object.content).to.be.eq('test<br />next line <a rel=\"nofollow\" class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23f\">#f</a>﻿');
		//   expect(data.object.originalContent).to.be.eq('test\nnext line #f');

		done();
		// });
	});

	it("should publish share", function (done) {
		// (new GooglePlusPage({
		//   _id: '531f0bd012ebb43c72b7e049',
		//   uid: '108087756774527107581',
		//   token: 'XXX',
		//   secret: 'XXX'
		// })).insert({
		//   annotation: '_underline_ -crossed- *bold* test2',
		//   object: {
		//     id: 'z13xerd50u2qjxzic04cejgpluums1jhpmg0k'
		//   }
		// },
		// function(err, data, tm) {

		//   expect(err).to.be.null;
		//   expect(data).to.be.ok;
		//   expect(data.annotation).to.be.eq('<i>underline</i> <del>crossed</del> <b>bold</b> test2');
		//   expect(data.object.id).to.be.eq('z13xerd50u2qjxzic04cejgpluums1jhpmg0k');

		done();
		// });
	});

	/*it('should publish post', function(done) {
    (new GooglePlusPage({
      _id: '531f0bd012ebb43c72b7e049',
      uid: '108087756774527107581',
      token: 'XXX',
      secret: 'XXX'
    })).insert({
      "access":{"items":[{"type":"public"}]},
      "object":{
        "attachments":[{
          //"fullImage":{"type":"image/jpeg","url":"http://cdn.btrcdn.com/pics/hostpics/fe9ce393-f045-470e-ba31-860db790ed50_blogtalkradio.jpg"},
          //"image":{"width":120,"height":120,"type":"image/jpeg","url":"https://lh4.googleusercontent.com/proxy/tXPeiLEp7hk0cMzVLE2hxBs-JTq0V6xmJsZ6YfDpD0LSuK652VK5xjOuLXhE5r8iEc84F3YxpUyQE17r5igpqKxb9Y0EbshirGke9tf4vXGrFMCsgb3q2RFGi8TEpHJXPiUlP_wO5DB7gA=w120-h120"},
          //"image":{"url":"https://lh4.googleusercontent.com/proxy/tXPeiLEp7hk0cMzVLE2hxBs-JTq0V6xmJsZ6YfDpD0LSuK652VK5xjOuLXhE5r8iEc84F3YxpUyQE17r5igpqKxb9Y0EbshirGke9tf4vXGrFMCsgb3q2RFGi8TEpHJXPiUlP_wO5DB7gA=w120-h120"},
          "url":"http://www.blogtalkradio.com/prestwickcomputergeek/2014/04/26/your-tech-questions-our-answers-tech-news-42614-84",
          "content":"We discuss all the tech news from the past week, select the Geek Pick Of The Week, elaborate on the ?Big Tech Question/Topic Of The Week? and share your \"help!\" questions and input. This Week: Google Encrypts Gmail end to end, Apple TV adds channels, Netflix price increase?, Exploit of ?Jailbroken? Iphones, IOS 7.1.1 arrives, SIRI on Apple TV, Apple continues to make plenty of money, Windows 8.1 gets a Start Menu in August 2014, OS X security upd...",
          "displayName":"Your Tech Questions & Our Answers + Tech News 4/26/14 – 84",
          "objectType":"article"}],
          "content":"*Join us on BlogTalkRadio Live - Saturday 4/26/14 -12:30 PM - **http://prestwickcomputer.com** - Prestwick Computer Geek Radio Show.* Your Questions & Our Answers. Question/Topic of the Week - Malware and Anti-Virus Software"}},
    function(err, data, tm) {

      console.log('XXX',err?JSON.stringify(err,null,2):null,data?JSON.stringify(data,null,2):null,tm);

      done();
    });
  });*/

	/*it('should publish post', function(done) {
    (new GooglePlusPage({
      _id: '531f0bd012ebb43c72b7e049',
      uid: '108087756774527107581',
      token: 'XXX',
      secret: 'XXX'
    })).insertWithMedia({"access":{"items":[{"type":"public"}]},"object":{"attachments":[{"objectType":"article","displayName":"Your Tech Questions & Our Answers + Tech News 4/26/14 – 84","content":"We discuss all the tech news from the past week, select the Geek Pick Of The Week, elaborate on the ?Big Tech Question/Topic Of The Week? and share your \"help!\" questions and input. This Week: Google Encrypts Gmail end to end, Apple TV adds channels, Netflix price increase?, Exploit of ?Jailbroken? Iphones, IOS 7.1.1 arrives, SIRI on Apple TV, Apple continues to make plenty of money, Windows 8.1 gets a Start Menu in August 2014, OS X security upd...","url":"http://www.blogtalkradio.com/prestwickcomputergeek/2014/04/26/your-tech-questions-our-answers-tech-news-42614-84","image":{"url":"https://lh4.googleusercontent.com/proxy/tXPeiLEp7hk0cMzVLE2hxBs-JTq0V6xmJsZ6YfDpD0LSuK652VK5xjOuLXhE5r8iEc84F3YxpUyQE17r5igpqKxb9Y0EbshirGke9tf4vXGrFMCsgb3q2RFGi8TEpHJXPiUlP_wO5DB7gA=w120-h120","type":"image/jpeg","height":120,"width":120},"fullImage":{"url":"http://cdn.btrcdn.com/pics/hostpics/fe9ce393-f045-470e-ba31-860db790ed50_blogtalkradio.jpg","type":"image/jpeg"}}],"content":"*Join us on BlogTalkRadio Live - Saturday 4/26/14 -12:30 PM - **http://prestwickcomputer.com** - Prestwick Computer Geek Radio Show.* Your Questions & Our Answers. Question/Topic of the Week - Malware and Anti-Virus Software #fg"}},'http://cdn.btrcdn.com/pics/hostpics/fe9ce393-f045-470e-ba31-860db790ed50_blogtalkradio.jpg',
    function(err, data, tm) {

      console.log('XXX',err?JSON.stringify(err,null,2):null,data?JSON.stringify(data,null,2):null,tm);

      done();
    });
  });*/

	/*it('should publish post', function(done) {
    (new GooglePlusPage({
      _id: '531f0bd012ebb43c72b7e049',
      uid: '108087756774527107581',
      token: 'XXX',
      secret: 'XXX'
    })).insert({
      "object":{"content":"*Medium, well done*\n\nThis essay by +Anil Dash about +Medium http://goo.gl/bZbZrl complements +Mike Elgan 's recent thoughts http://goo.gl/KKSS0W about why Google+ is a great blogging platform. The best, says Mike.\n\nI don't think you can call one platform or another the best for blogging. The most you can say is that a particular platform is best for a particular person at a particular time. For me, here and now, Google+ is best. \n\nMedium is best for the blogger who wants to be free from the tyranny of having to keep to a regular posting schedule, according to my reading of Dash's post.\n\nDash quotes blogging pioneer +Dave Winer 's definition of blogging http://goo.gl/gK7qIx as the \"unedited voice of a person.\" That's true in spirit. I've known a couple of bloggers who've hired editors. But even in those cases, the blogger is in charge, whereas in journalism the editor is in charge.\n\nAnother characteristic which has been fundamental to blogging from the beginning -- although not essential to it -- is the reverse chronological order of posts. And that presentation contains an implicit promise to keep updating regularly. When we see a blog that hasn't been updated in months or years, we say that blog is dead. The same is not true in the case of an old-school website that collects a few essays together.\n\nMedium is not the best blogging platform for me here and now. I'm still an old-school blogger. And when I say old-school I mean _old._ 20th Century. Before the advent of professional blogs like Gawker. My posts here are unedited _even by me,_ they're just thoughts tossed off quickly and links to interesting or entertaining content I've found elsewhere. That is the opposite of what blogging has evolved into for most practitioners, but it suits me.\n\n*What Medium Is* http://goo.gl/bZbZrl\n\nWiner's essay about the nature of blogging is worth reading. http://goo.gl/gK7qIx It's from 2007, which makes it a historical artifact by internet standards. Blogging has changed a lot since then. Back then bloggers owned their own platforms. Nowadays, that's the exception. Nowadays, people blog on platforms owned by others: Facebook, Tumblr, Google+, Medium.\n\nAlso: Why is Google+ best for me? Because I get great conversation on many of my posts. That's all there is to it. The same is true of Facebook for me, so I write content to Google+ and syndicate to Facebook using +Friends+Me . That's less true of Tumblr, but a couple of people I respect read me there -- Dash is one of them -- and it's easy enough for me to syndicate there (using F+M) so I do. \n\nI get the least traction of all nowadays on Twitter. For me, the quality of content and conversation on Twitter has deteriorated rapidly recently, and I can see I might even abandon it in 2014 for all but professional purposes. That's remarkable because I was a Twitter fanatic from 2007 -- which is near the beginning -- to last year or this year.\n\n_Image from Mike Licht, NotionsCapital.com on Flickr_ http://goo.gl/bDGsPX\n\n#Google #Google+ #Medium #blogging #ttfl"}
    },
    function(err, data, tm) {

      console.log('XXX',err?JSON.stringify(err,null,2):null,data?JSON.stringify(data,null,2):null,tm);

      done();
    });
  });*/
	/*it('should publish post reply', function(done) {
    (new GooglePlusPage({
      _id: '531f0bd012ebb43c72b7e049',
      uid: '108087756774527107581',
      token: 'XXX',
      secret: 'XXX'
    })).insertComment('z13uspa4snfkg5ik2223wvapjmqiurj2a', {
      "object":{"originalContent":"test"}
    },
    function(err, data, tm) {

      console.log('XXX',err?JSON.stringify(err,null,2):null,data?JSON.stringify(data,null,2):null,tm);

      done();
    }, 'id,actor,published,object');
  });*/
});
