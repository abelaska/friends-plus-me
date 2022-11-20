"use strict";

process.env.NODE_ENV = "test";

var expect = require("chai").expect,
	utils = require(__dirname + "/../src/lib/utils");

describe("utils", function () {
	require("chai").config.includeStack = true;

	it("should prepare text", function () {
		expect(
			utils.prepareText(
				"Steve Denning reveals how clueless he is about Google+... again! Pro tip: If&hellip;",
			),
		).to.eq(
			"Steve Denning reveals how clueless he is about Google+... again! Pro tip: If…",
		);
	});

	it("should replace autocompleted input", function () {
		expect(
			utils.replaceAutocompletedInputWithValue(
				'<input class="autocompleted autocompleted-person" type="button" value="+Uber" />',
				true,
			),
		).to.eq("Uber");
		expect(
			utils.replaceAutocompletedInputWithValue(
				'<input class="autocompleted autocompleted-person" type="button" value="+Uber" />',
			),
		).to.eq("+Uber");

		expect(
			utils.replaceAutocompletedInputWithValue(
				'<input class="autocompleted autocompleted-person" type="button" value="+Uber Aber" />',
				true,
			),
		).to.eq("Uber Aber");
		expect(
			utils.replaceAutocompletedInputWithValue(
				'<input class="autocompleted autocompleted-person" type="button" value="+Uber Aber" />',
			),
		).to.eq("+Uber Aber");

		expect(
			utils.replaceAutocompletedInputWithValue(
				'<input class="autocompleted autocompleted-person" value="+Uber Aber"  type="button" ></input>',
				true,
			),
		).to.eq("Uber Aber");
		expect(
			utils.replaceAutocompletedInputWithValue(
				'<input class="autocompleted autocompleted-person" value="+Uber Aber"   type="button" ></input>',
			),
		).to.eq("+Uber Aber");

		expect(
			utils.replaceAutocompletedInputWithUid(
				'<p><input class="autocompleted autocompleted-person" type="button" value="+Alois Běla&scaron;ka" data-uid="106808796125435447680" /></p>',
				"@",
			),
		).to.eq("<p>@106808796125435447680</p>");
		expect(
			utils.replaceAutocompletedInputWithUid(
				'<p><input class="autocompleted autocompleted-person" type="button" value="+Alois Běla&scaron;ka" data-uid="106808796125435447680" />  a <input class="autocompleted autocompleted-person" type="button" value="+Alois Běla&scaron;ka" data-uid="106808796125435447680" /> </p>',
				"@",
			),
		).to.eq("<p>@106808796125435447680  a @106808796125435447680 </p>");

		expect(
			utils.replaceAutocompletedInputWithValue(
				'<p><input class="autocompleted autocompleted-person" type="button" value="+Alois Běla&scaron;ka" data-uid="106808796125435447680" /> <input class="autocompleted autocompleted-hashtag" type="button" value="#hashtag" /></p>',
			),
		).to.eq("<p>+Alois B&#x11B;la&#x161;ka #hashtag</p>");
		expect(
			utils.replaceAutocompletedInputWithValue(
				'<p><input class="autocompleted autocompleted-person" type="button" value="+Alois Běla&scaron;ka" data-uid="106808796125435447680" /> <input class="autocompleted autocompleted-hashtag" type="button" value="#hashtag" /></p>',
				true,
			),
		).to.eq("<p>Alois B&#x11B;la&#x161;ka #hashtag</p>");

		expect(
			utils.deformatGoogleHtml(
				utils.replaceAutocompletedInputWithValue(
					utils.replaceAutocompletedInputWithUid(
						'<p><input class="autocompleted autocompleted-person" type="button" value="+Comcast" data-uid="114174040870847107996" />&nbsp;reportedly influenced a decision to withdraw&nbsp;+Hulu for sale, which could raise regulatory eyebrows.&nbsp;</p>',
						"+",
					),
				),
			),
		).to.eq(
			"+114174040870847107996 reportedly influenced a decision to withdraw +Hulu for sale, which could raise regulatory eyebrows.",
		);
	});

	it("should shorten ObjectId", function () {
		expect(utils.shortObjectId("51bf23b42872db1073000010")).to.eq("51bf23b4");
		expect(utils.shortObjectId("51c82721feb8d1f47e00023f")).to.eq("51c82721");
	});

	it("should replace mentions with oid", function () {
		expect(
			utils.replaceProfLinksWithOid(
				'<span class="proflinkWrapper"><span class="proflinkPrefix">+</span><a class="proflink" href="https://plus.google.com/105037104815911535953" oid="105037104815911535953">Ade Oshineye</a></span>',
			),
		).to.eq("+105037104815911535953");
		expect(
			utils.replaceProfLinksWithOid(
				'<span class="proflinkWrapper"><span class="proflinkPrefix">+</span><a class="proflink" href="https://plus.google.com/108487783243149848473" oid="108487783243149848473">Koen De Paus</a></span>',
			),
		).to.eq("+108487783243149848473");
	});

	it("should deformat text with mentions", function () {
		expect(
			utils.deformatGoogleHtml(
				'Hi <span class="proflinkWrapper"><span class="proflinkPrefix">+</span><a class="proflink" href="https://plus.google.com/105037104815911535953" oid="105037104815911535953">Ade Oshineye</a></span> <span class="proflinkWrapper"><span class="proflinkPrefix">+</span><a class="proflink" href="https://plus.google.com/109716647623830091721" oid="109716647623830091721">Gus Class</a></span> thanks for the help with the recent G+ release problem.<br />I would like to ask you guys if it would be possible to establish some closer relationship with G+ team regarding releases, API changes and future plans. All Google+ users will benefit from it. I am willing to put some extra time into whatever can come out of it.<br />What do you think?\ufeff',
			),
		).to.eq(
			"Hi +105037104815911535953 +109716647623830091721 thanks for the help with the recent G+ release problem.\nI would like to ask you guys if it would be possible to establish some closer relationship with G+ team regarding releases, API changes and future plans. All Google+ users will benefit from it. I am willing to put some extra time into whatever can come out of it.\nWhat do you think?",
		);
	});

	it("should deformat text", function () {
		expect(
			utils.deformatGoogleHtml(
				"<i>underline</i> <del>crossed</del> <b>bold</b> test3 <a class='ot-hashtag' href='https://plus.google.com/s/%23f'>#f</a>",
			),
		).to.eq("_underline_ -crossed- *bold* test3 #f");
		expect(
			utils.deformatGoogleHtml(
				"<i>underline</i><del>crossed</del><b>bold</b>test3<a class='ot-hashtag' href='https://plus.google.com/s/%23f'>#f</a>",
			),
		).to.eq("_underline_-crossed-*bold*test3#f");
		expect(utils.deformatGoogleHtml("<i>u</i><br /><del>d</del>")).to.eq(
			"_u_\n-d-",
		);
		expect(utils.deformatGoogleHtml("a<br/>b")).to.eq("a\nb");
		expect(utils.deformatGoogleHtml("a< br / >b")).to.eq("a\nb");
		expect(utils.deformatGoogleHtml("a< br/ >b")).to.eq("a\nb");
		expect(utils.deformatGoogleHtml("a<br>b")).to.eq("a\nb");
		expect(utils.deformatGoogleHtml("a< br >b")).to.eq("a\nb");

		expect(
			utils.deformatGoogleHtml(
				"<p><i>underline</i> <del>crossed</del> <b>bold</b> </p><p>test3 <a class='ot-hashtag' href='https://plus.google.com/s/%23f'>#f</a></p>",
			),
		).to.eq("_underline_ -crossed- *bold* \ntest3 #f");
		expect(
			utils.deformatGoogleHtml(
				"<p><i>underline</i><del>crossed</del><b>bold</b></p><p>test3<a class='ot-hashtag' href='https://plus.google.com/s/%23f'>#f</a></p>",
			),
		).to.eq("_underline_-crossed-*bold*\ntest3#f");
		expect(
			utils.deformatGoogleHtml("<p><i>u</i><br /></p><p><del>d</del></p>"),
		).to.eq("_u_\n\n-d-");
		expect(utils.deformatGoogleHtml("<p>a<br/></p><p>b</p>")).to.eq("a\n\nb");
		expect(utils.deformatGoogleHtml("<p>a< br / ></p><p>b</p>")).to.eq(
			"a\n\nb",
		);
		expect(utils.deformatGoogleHtml("<p>a< br/ ></p><p>b</p>")).to.eq("a\n\nb");
		expect(utils.deformatGoogleHtml("<p>a<br></p><p>b</p>")).to.eq("a\n\nb");
		expect(utils.deformatGoogleHtml("<p>a< br ></p><p>b</p>")).to.eq("a\n\nb");

		expect(
			utils.deformatGoogleHtml(
				"<b>&quot;When your house is burning down, you should brush your teeth.&quot;</b>",
			),
		).to.eq(
			'*"When your house is burning down, you should brush your teeth."*',
		);
	});

	it("should fix profile link", function () {
		var html =
				'<b>We Cannot Forget September 11</b><br /><br />&gt; <i>I wonder what those brave passengers, those who wrestled with the hijackers and forced the plane into a Pennsylvania field, would think if they could see their country now? What would be on the minds of those valiant police officers and fire fighters? Or those poor people who just went to their office that day, never to come home again?</i><br /><br />&gt; <i>It&#39;s doubtful anyone envisioned a nation where Americans&#39; communications were captured, surveilled, and stored, where a journalist is jailed for linking to a website, or authorities track residents&#39; travel habits in order to gain access to their devices&#39; data. It&#39;s extremely doubtful anyone thought red-blooded Americans would allow this to happen.</i><br /><br />&gt; <i>But we did. And it will continue until we the people vote to stop it.</i><br /><br />A powerful post from <span class="proflinkWrapper"><span class="proflinkPrefix">+</span><a href="https://plus.google.com/116432249404417912714" class="proflink" oid="116432249404417912714">Alison Diana</a></span> on <span class="proflinkWrapper"><span class="proflinkPrefix">+</span><a href="https://plus.google.com/105535716614289559703" class="proflink" oid="105535716614289559703">Internet Evolution</a></span> <br /><br /> <a class="ot-hashtag" href="https://plus.google.com/s/%23politics">#politics</a>   <a class="ot-hashtag" href="https://plus.google.com/s/%23ie">#ie</a>   <a class="ot-hashtag" href="https://plus.google.com/s/%23september11">#september11</a>',
			expected =
				'<b>We Cannot Forget September 11</b><br /><br />&gt; <i>I wonder what those brave passengers, those who wrestled with the hijackers and forced the plane into a Pennsylvania field, would think if they could see their country now? What would be on the minds of those valiant police officers and fire fighters? Or those poor people who just went to their office that day, never to come home again?</i><br /><br />&gt; <i>It&#39;s doubtful anyone envisioned a nation where Americans&#39; communications were captured, surveilled, and stored, where a journalist is jailed for linking to a website, or authorities track residents&#39; travel habits in order to gain access to their devices&#39; data. It&#39;s extremely doubtful anyone thought red-blooded Americans would allow this to happen.</i><br /><br />&gt; <i>But we did. And it will continue until we the people vote to stop it.</i><br /><br />A powerful post from <a href="https://plus.google.com/116432249404417912714">Alison Diana</a> on <a href="https://plus.google.com/105535716614289559703">Internet Evolution</a> <br /><br /> <a class="ot-hashtag" href="https://plus.google.com/s/%23politics">#politics</a>   <a class="ot-hashtag" href="https://plus.google.com/s/%23ie">#ie</a>   <a class="ot-hashtag" href="https://plus.google.com/s/%23september11">#september11</a>';
		expect(utils.fixProfLinks(html)).to.eq(expected);
	});

	it("should fix profile link 2", function () {
		var html =
				'<b>Apple&#39;s new iPhones: Built for business</b><br /><br />IT departments will find plenty to love about the new iPhones and new version of iOS launched by Apple this week.<br /><br />The new hardware and software have plenty of new features that will make them more useful and secure for business users.<br /><br />My latest on <span class="proflinkWrapper"><span class="proflinkPrefix">+</span><a href="https://plus.google.com/105535716614289559703" class="proflink" oid="105535716614289559703">Internet Evolution</a></span> <a href="http://goo.gl/HZIMwm" class="ot-anchor" rel="nofollow">http://goo.gl/HZIMwm</a><br /><br /> <a class="ot-hashtag" href="https://plus.google.com/s/%23Apple">#Apple</a>   <a class="ot-hashtag" href="https://plus.google.com/s/%23iPhone">#iPhone</a>   <a class="ot-hashtag" href="https://plus.google.com/s/%23mobile">#mobile</a>   <a class="ot-hashtag" href="https://plus.google.com/s/%23ie">#ie</a>',
			expected =
				'<b>Apple&#39;s new iPhones: Built for business</b><br /><br />IT departments will find plenty to love about the new iPhones and new version of iOS launched by Apple this week.<br /><br />The new hardware and software have plenty of new features that will make them more useful and secure for business users.<br /><br />My latest on <a href="https://plus.google.com/105535716614289559703">Internet Evolution</a> <a href="http://goo.gl/HZIMwm" class="ot-anchor" rel="nofollow">http://goo.gl/HZIMwm</a><br /><br /> <a class="ot-hashtag" href="https://plus.google.com/s/%23Apple">#Apple</a>   <a class="ot-hashtag" href="https://plus.google.com/s/%23iPhone">#iPhone</a>   <a class="ot-hashtag" href="https://plus.google.com/s/%23mobile">#mobile</a>   <a class="ot-hashtag" href="https://plus.google.com/s/%23ie">#ie</a>';
		expect(utils.fixProfLinks(html)).to.eq(expected);
	});

	it("should remove + from names 1", function () {
		expect(utils.replacePlusFromNames()).to.eq(undefined);
		expect(utils.replacePlusFromNames(null)).to.eq(null);
		expect(utils.replacePlusFromNames("")).to.eq("");
		expect(utils.replacePlusFromNames("F+M")).to.eq("F+M");
		expect(utils.replacePlusFromNames("_+M")).to.eq("_+M");
		expect(utils.replacePlusFromNames("1+M")).to.eq("1+M");
		expect(utils.replacePlusFromNames("+M")).to.eq("M");
	});

	it("should remove + from names 2", function () {
		expect(utils.replacePlusFromNames("+Merry Anna")).to.eq("Merry Anna");
		expect(utils.replacePlusFromNames("+Merry Anna ")).to.eq("Merry Anna ");
		expect(utils.replacePlusFromNames("+Merry Anna text")).to.eq(
			"Merry Anna text",
		);
		expect(utils.replacePlusFromNames("+Merry Anna text ")).to.eq(
			"Merry Anna text ",
		);
	});

	it("should remove + from names 3", function () {
		expect(utils.replacePlusFromNames(" +Merry Anna")).to.eq(" Merry Anna");
		expect(utils.replacePlusFromNames(" +Merry Anna ")).to.eq(" Merry Anna ");
		expect(utils.replacePlusFromNames(" +Merry Anna text")).to.eq(
			" Merry Anna text",
		);
		expect(utils.replacePlusFromNames(" +Merry Anna text ")).to.eq(
			" Merry Anna text ",
		);
	});

	it("should remove + from names 4", function () {
		expect(utils.replacePlusFromNames("text +Merry Anna")).to.eq(
			"text Merry Anna",
		);
		expect(utils.replacePlusFromNames("text +Merry Anna ")).to.eq(
			"text Merry Anna ",
		);
		expect(utils.replacePlusFromNames("text +Merry Anna text")).to.eq(
			"text Merry Anna text",
		);
		expect(utils.replacePlusFromNames("text +Merry Anna text ")).to.eq(
			"text Merry Anna text ",
		);
	});

	it("should remove + from names 5", function () {
		expect(utils.replacePlusFromNames("\t +Merry Anna")).to.eq("\t Merry Anna");
		expect(utils.replacePlusFromNames("\t +Merry Anna ")).to.eq(
			"\t Merry Anna ",
		);
		expect(utils.replacePlusFromNames("\t +Merry Anna text")).to.eq(
			"\t Merry Anna text",
		);
		expect(utils.replacePlusFromNames("\t +Merry Anna text ")).to.eq(
			"\t Merry Anna text ",
		);
	});

	it("should remove + from names 6", function () {
		expect(utils.replacePlusFromNames("\t+Merry Anna")).to.eq("\tMerry Anna");
		expect(utils.replacePlusFromNames("\t+Merry Anna ")).to.eq("\tMerry Anna ");
		expect(utils.replacePlusFromNames("\t+Merry Anna text")).to.eq(
			"\tMerry Anna text",
		);
		expect(utils.replacePlusFromNames("\t+Merry Anna text ")).to.eq(
			"\tMerry Anna text ",
		);
	});

	it("should remove + from names 7", function () {
		expect(utils.replacePlusFromNames("\t+Merry Anna +Tommy Fock")).to.eq(
			"\tMerry Anna Tommy Fock",
		);
		expect(utils.replacePlusFromNames("\t+Merry Anna +Tommy Fock ")).to.eq(
			"\tMerry Anna Tommy Fock ",
		);
		expect(utils.replacePlusFromNames("\t+Merry Anna +Tommy Fock text")).to.eq(
			"\tMerry Anna Tommy Fock text",
		);
		expect(utils.replacePlusFromNames("\t+Merry Anna +Tommy Fock text ")).to.eq(
			"\tMerry Anna Tommy Fock text ",
		);
	});

	it("should remove + from names 8", function () {
		expect(utils.replacePlusFromNames("\t+Merry Anna +Tommy Fock +")).to.eq(
			"\tMerry Anna Tommy Fock +",
		);
		expect(utils.replacePlusFromNames("\t+Merry Anna +Tommy Fock + ")).to.eq(
			"\tMerry Anna Tommy Fock + ",
		);
		expect(
			utils.replacePlusFromNames("\t+Merry Anna +Tommy Fock + text"),
		).to.eq("\tMerry Anna Tommy Fock + text");
		expect(
			utils.replacePlusFromNames("\t+Merry Anna +Tommy Fock + text "),
		).to.eq("\tMerry Anna Tommy Fock + text ");
	});

	it("should remove + from names 9", function () {
		expect(utils.replacePlusFromNames("\t+2Merry Anna +_Tommy Fock +")).to.eq(
			"\t2Merry Anna _Tommy Fock +",
		);
		expect(utils.replacePlusFromNames("\t+2Merry Anna +_Tommy Fock + ")).to.eq(
			"\t2Merry Anna _Tommy Fock + ",
		);
		expect(
			utils.replacePlusFromNames("\t+2Merry Anna +_Tommy Fock + text"),
		).to.eq("\t2Merry Anna _Tommy Fock + text");
		expect(
			utils.replacePlusFromNames("\t+2Merry Anna +_Tommy Fock + text "),
		).to.eq("\t2Merry Anna _Tommy Fock + text ");
	});

	it("should remove + from names 10", function () {
		expect(utils.replacePlusFromNames("+Merry +Anna")).to.eq("Merry Anna");
		expect(utils.replacePlusFromNames("+Merry +Anna ")).to.eq("Merry Anna ");
	});

	/*
  it('should fix the google url', function(){
    expect(utils.fixGoogleUrl('/photos/117903011098040166012/albums/5887244226808287905?authkey=XXX')).to.eq('https://plus.google.com/photos/117903011098040166012/albums/5887244226808287905?authkey=XXX');
  });

  it('should not fix the google url', function(){
    expect(utils.fixGoogleUrl('https://plus.google.com/photos/117903011098040166012/albums/5887244226808287905?authkey=XXX')).to.eq('https://plus.google.com/photos/117903011098040166012/albums/5887244226808287905?authkey=XXX');
  });

  it('should fix the google url', function(){
    expect(utils.fixGoogleUrl('event/x')).to.eq('https://plus.google.com/event/x');
  });

  it('should not fix the google url', function(){
    expect(utils.fixGoogleUrl('')).to.eq('');
  });

  it('should is true', function(){
    var obj = { x: 'a' };
    expect(utils.is(obj.x)).to.eq(true);
  });

  it('should is false', function(){
    var obj = {};
    expect(utils.is(obj.x)).to.eq(false);
  });

  it('should is not true', function(){
    var obj = { x: 'a' };
    expect(utils.isNot(obj.x)).to.eq(false);
  });

  it('should is not false', function(){
    var obj = {};
    expect(utils.isNot(obj.x)).to.eq(true);
  });

  it('should is empty string true', function(){
    expect(utils.isEmptyString({x:''}.x)).to.eq(true);
    expect(utils.isEmptyString({}.x)).to.eq(true);
  });

  it('should is empty string false', function(){
    expect(utils.isEmptyString({x:'a'}.x)).to.eq(false);
  });

  it('should is not empty string true', function(){
    expect(utils.isNotEmptyString({x:'a'}.x)).to.eq(true);
  });

  it('should is not empty string false', function(){
    expect(utils.isNotEmptyString({x:''}.x)).to.eq(false);
    expect(utils.isNotEmptyString({}.x)).to.eq(false);
  });

  it('should concat one string', function(){
    expect(utils.concatSentences('a')).to.eq('a');
    expect(utils.concatSentences('')).to.eq('');
    expect(utils.concatSentences(null)).to.eq('');
    expect(utils.concatSentences(undefined)).to.eq('');
  });

  it('should concat two strings', function(){
    expect(utils.concatSentences('a', 'b')).to.eq('a (b)');
    expect(utils.concatSentences('a', '')).to.eq('a');
    expect(utils.concatSentences('a', null)).to.eq('a');
    expect(utils.concatSentences('a', undefined)).to.eq('a');
  });

  it('should clone object', function(){
    var o = utils.clone({'a' : 'b'});
    expect(o).not.toBeNull();
    expect(o['a']).toBeDefined();
    expect(o['a']).to.eq('b');
  });

  var imageUrls = [
    ['https://somewhere.com/photo.jpg',
     'https://somewhere.com/photo.jpg'],
    ['https://lh3.googleusercontent.com/-M3WKAGelJVI/UeWpewK6R5I/AAAAAAACv2U/EU4WIAvDqHY/photo.jpg',
     'https://lh3.googleusercontent.com/-M3WKAGelJVI/UeWpewK6R5I/AAAAAAACv2U/EU4WIAvDqHY/s0/photo.jpg'],
    ['https://lh4.googleusercontent.com/-6pqnM7LSRTQ/UeWk-wEnkpI/AAAAAAACv2M/PT6rI_gILHE/photo.jpg',
     'https://lh4.googleusercontent.com/-6pqnM7LSRTQ/UeWk-wEnkpI/AAAAAAACv2M/PT6rI_gILHE/s0/photo.jpg'],
    ['https://lh3.googleusercontent.com/-MDAeIcxN3eo/UeWEIOyVpkI/AAAAAAACvo4/6gtgTap34I8/photo.jpg',
     'https://lh3.googleusercontent.com/-MDAeIcxN3eo/UeWEIOyVpkI/AAAAAAACvo4/6gtgTap34I8/s0/photo.jpg'],
    ['https://lh6.googleusercontent.com/-v0k-j73d_s8/UeRncQN4qwI/AAAAAAACv10/RAbSHG4kC9Y/photo.jpg',
     'https://lh6.googleusercontent.com/-v0k-j73d_s8/UeRncQN4qwI/AAAAAAACv10/RAbSHG4kC9Y/s0/photo.jpg'],
    ['https://lh5.googleusercontent.com/-uQFzAl6Q5uw/UeQ2sBk8RiI/AAAAAAACv3U/oRBCGZ44pR8/photo.jpg',
     'https://lh5.googleusercontent.com/-uQFzAl6Q5uw/UeQ2sBk8RiI/AAAAAAACv3U/oRBCGZ44pR8/s0/photo.jpg'],
    ['https://lh5.googleusercontent.com/-_vFi46VRCq0/UdbBpa1l3RI/AAAAAAABZ6A/UQTeWYWl13U/photo.jpg',
     'https://lh5.googleusercontent.com/-_vFi46VRCq0/UdbBpa1l3RI/AAAAAAABZ6A/UQTeWYWl13U/s0/photo.jpg'],
    ['https://lh3.googleusercontent.com/-qEoGrnmb1d8/UeF_y0xmwEI/AAAAAAACvM8/N59RKN9F7bA/photo.jpg',
     'https://lh3.googleusercontent.com/-qEoGrnmb1d8/UeF_y0xmwEI/AAAAAAACvM8/N59RKN9F7bA/s0/photo.jpg'],
    ['https://lh3.googleusercontent.com/-BRe9oAfj9vw/UeFjEP6BzcI/AAAAAAACv3M/DMGVFfLLzSs/photo.jpg',
     'https://lh3.googleusercontent.com/-BRe9oAfj9vw/UeFjEP6BzcI/AAAAAAACv3M/DMGVFfLLzSs/s0/photo.jpg'],
    ['https://lh3.googleusercontent.com/-ZzaYYxPlVsE/UejrNe0pzYI/AAAAAAACwMI/wPdBiwZfVuQ/w506-h750/IMG_9265.jpg',
     'https://lh3.googleusercontent.com/-ZzaYYxPlVsE/UejrNe0pzYI/AAAAAAACwMI/wPdBiwZfVuQ/s0/IMG_9265.jpg'],
    ['https://lh3.googleusercontent.com/-ZzaYYxPlVsE/UejrNe0pzYI/AAAAAAACwMI/wPdBiwZfVuQ/s0-d/IMG_9265.jpg',
     'https://lh3.googleusercontent.com/-ZzaYYxPlVsE/UejrNe0pzYI/AAAAAAACwMI/wPdBiwZfVuQ/s0/IMG_9265.jpg'],
    ['https://lh5.googleusercontent.com/-2IOatVoggCY/UeggZJ4GUeI/AAAAAAACwLc/NkeHOWaNDSI/w506-h750/IMG_2588-1v2%2Bcopy.jpg',
     'https://lh5.googleusercontent.com/-2IOatVoggCY/UeggZJ4GUeI/AAAAAAACwLc/NkeHOWaNDSI/s0/IMG_2588-1v2%2Bcopy.jpg'],
    ['https://lh5.googleusercontent.com/-2IOatVoggCY/UeggZJ4GUeI/AAAAAAACwLc/NkeHOWaNDSI/s0-d/IMG_2588-1v2%2Bcopy.jpg',
     'https://lh5.googleusercontent.com/-2IOatVoggCY/UeggZJ4GUeI/AAAAAAACwLc/NkeHOWaNDSI/s0/IMG_2588-1v2%2Bcopy.jpg'],
    ['https://lh5.googleusercontent.com/-kD11IreIp0I/UefibtlEhDI/AAAAAAACwKs/Ri4G_wqBnBg/w506-h750/IMG_2369%2Bcopy.jpg',
     'https://lh5.googleusercontent.com/-kD11IreIp0I/UefibtlEhDI/AAAAAAACwKs/Ri4G_wqBnBg/s0/IMG_2369%2Bcopy.jpg'],
    ['https://lh5.googleusercontent.com/-kD11IreIp0I/UefibtlEhDI/AAAAAAACwKs/Ri4G_wqBnBg/s0-d/IMG_2369%2Bcopy.jpg',
     'https://lh5.googleusercontent.com/-kD11IreIp0I/UefibtlEhDI/AAAAAAACwKs/Ri4G_wqBnBg/s0/IMG_2369%2Bcopy.jpg'],
    ['https://lh3.googleusercontent.com/-drz9xXFSrng/UecMUIzSI7I/AAAAAAACwJQ/h1ImhcKMOaY/w506-h750/IMG_6518-as-Smart-Object-1.jpg',
     'https://lh3.googleusercontent.com/-drz9xXFSrng/UecMUIzSI7I/AAAAAAACwJQ/h1ImhcKMOaY/s0/IMG_6518-as-Smart-Object-1.jpg'],
    ['https://lh3.googleusercontent.com/-drz9xXFSrng/UecMUIzSI7I/AAAAAAACwJQ/h1ImhcKMOaY/s0-d/IMG_6518-as-Smart-Object-1.jpg',
     'https://lh3.googleusercontent.com/-drz9xXFSrng/UecMUIzSI7I/AAAAAAACwJQ/h1ImhcKMOaY/s0/IMG_6518-as-Smart-Object-1.jpg'],
    ['https://lh6.googleusercontent.com/-qnvPhvU9HNg/UebmHMwOK9I/AAAAAAACwII/jUCYtOEq2NA/w506-h750/IMG_3308%2Bcopy.jpg',
     'https://lh6.googleusercontent.com/-qnvPhvU9HNg/UebmHMwOK9I/AAAAAAACwII/jUCYtOEq2NA/s0/IMG_3308%2Bcopy.jpg'],
    ['https://lh6.googleusercontent.com/-qnvPhvU9HNg/UebmHMwOK9I/AAAAAAACwII/jUCYtOEq2NA/s0-d/IMG_3308%2Bcopy.jpg',
     'https://lh6.googleusercontent.com/-qnvPhvU9HNg/UebmHMwOK9I/AAAAAAACwII/jUCYtOEq2NA/s0/IMG_3308%2Bcopy.jpg'],
    ['https://lh4.googleusercontent.com/-vuD8I8MqH80/UebObWpjNYI/AAAAAAACwHI/qho3OEf5Zm0/w506-h750/IMG_2164%25252520copy.jpg',
     'https://lh4.googleusercontent.com/-vuD8I8MqH80/UebObWpjNYI/AAAAAAACwHI/qho3OEf5Zm0/s0/IMG_2164%25252520copy.jpg'],
    ['https://lh4.googleusercontent.com/-vuD8I8MqH80/UebObWpjNYI/AAAAAAACwHI/qho3OEf5Zm0/s0-d/IMG_2164%25252520copy.jpg',
     'https://lh4.googleusercontent.com/-vuD8I8MqH80/UebObWpjNYI/AAAAAAACwHI/qho3OEf5Zm0/s0/IMG_2164%25252520copy.jpg'],
    ['https://lh4.googleusercontent.com/-matX2SPg27M/UeWzbOUDrII/AAAAAAACv8M/URTCuFE20JM/w506-h750/IMG_8046-copy.jpg',
     'https://lh4.googleusercontent.com/-matX2SPg27M/UeWzbOUDrII/AAAAAAACv8M/URTCuFE20JM/s0/IMG_8046-copy.jpg'],
    ['https://lh4.googleusercontent.com/-matX2SPg27M/UeWzbOUDrII/AAAAAAACv8M/URTCuFE20JM/s0-d/IMG_8046-copy.jpg',
     'https://lh4.googleusercontent.com/-matX2SPg27M/UeWzbOUDrII/AAAAAAACv8M/URTCuFE20JM/s0/IMG_8046-copy.jpg'],
    ['https://lh6.googleusercontent.com/-tPf2mXSmSrY/UeWw5p7evSI/AAAAAAACvrw/iQjDczbu2-E/w506-h750/IMG_1814%25252520copy.jpg',
     'https://lh6.googleusercontent.com/-tPf2mXSmSrY/UeWw5p7evSI/AAAAAAACvrw/iQjDczbu2-E/s0/IMG_1814%25252520copy.jpg'],
    ['https://lh6.googleusercontent.com/-tPf2mXSmSrY/UeWw5p7evSI/AAAAAAACvrw/iQjDczbu2-E/s0-d/IMG_1814%25252520copy.jpg',
     'https://lh6.googleusercontent.com/-tPf2mXSmSrY/UeWw5p7evSI/AAAAAAACvrw/iQjDczbu2-E/s0/IMG_1814%25252520copy.jpg'],
    ['https://lh3.googleusercontent.com/-cx4-H90XgeE/Ud8uBn9dRKI/AAAAAAACu6o/3dbOT9NOLUU/w125-h125/IMG_3932%2Bcopy.jpg',
     'https://lh3.googleusercontent.com/-cx4-H90XgeE/Ud8uBn9dRKI/AAAAAAACu6o/3dbOT9NOLUU/s0/IMG_3932%2Bcopy.jpg'],
    ['https://lh3.googleusercontent.com/-cx4-H90XgeE/Ud8uBn9dRKI/AAAAAAACu6o/3dbOT9NOLUU/s900/IMG_3932%2Bcopy.jpg',
     'https://lh3.googleusercontent.com/-cx4-H90XgeE/Ud8uBn9dRKI/AAAAAAACu6o/3dbOT9NOLUU/s0/IMG_3932%2Bcopy.jpg'],
    ['https://lh6.googleusercontent.com/-8UU5uPn7D7g/UdkqlLSQAEI/AAAAAAACuRM/brQUkzG_TaM/w125-h125/IMG_0120-as-Smart-Object-1.jpg',
     'https://lh6.googleusercontent.com/-8UU5uPn7D7g/UdkqlLSQAEI/AAAAAAACuRM/brQUkzG_TaM/s0/IMG_0120-as-Smart-Object-1.jpg'],
    ['https://lh6.googleusercontent.com/-8UU5uPn7D7g/UdkqlLSQAEI/AAAAAAACuRM/brQUkzG_TaM/s1150/IMG_0120-as-Smart-Object-1.jpg',
     'https://lh6.googleusercontent.com/-8UU5uPn7D7g/UdkqlLSQAEI/AAAAAAACuRM/brQUkzG_TaM/s0/IMG_0120-as-Smart-Object-1.jpg'],
    ['https://lh3.googleusercontent.com/-M3WKAGelJVI/UeWpewK6R5I/AAAAAAACv2U/EU4WIAvDqHY/w506-h750/photo.jpg',
     'https://lh3.googleusercontent.com/-M3WKAGelJVI/UeWpewK6R5I/AAAAAAACv2U/EU4WIAvDqHY/s0/photo.jpg'],
    ['https://lh4.googleusercontent.com/-6pqnM7LSRTQ/UeWk-wEnkpI/AAAAAAACv2M/PT6rI_gILHE/w506-h750/photo.jpg',
     'https://lh4.googleusercontent.com/-6pqnM7LSRTQ/UeWk-wEnkpI/AAAAAAACv2M/PT6rI_gILHE/s0/photo.jpg'],
    ['https://lh3.googleusercontent.com/-MDAeIcxN3eo/UeWEIOyVpkI/AAAAAAACvo4/6gtgTap34I8/w506-h750/photo.jpg',
     'https://lh3.googleusercontent.com/-MDAeIcxN3eo/UeWEIOyVpkI/AAAAAAACvo4/6gtgTap34I8/s0/photo.jpg'],
    ['https://lh3.googleusercontent.com/-fLdHgQ4A2cI/UeVEv0iYczI/AAAAAAAAJI4/stJOY-AnGkg/w506-h750/SomersetPoppyfields.jpg',
     'https://lh3.googleusercontent.com/-fLdHgQ4A2cI/UeVEv0iYczI/AAAAAAAAJI4/stJOY-AnGkg/s0/SomersetPoppyfields.jpg'],
    ['https://lh3.googleusercontent.com/-fLdHgQ4A2cI/UeVEv0iYczI/AAAAAAAAJI4/stJOY-AnGkg/s0-d/SomersetPoppyfields.jpg',
     'https://lh3.googleusercontent.com/-fLdHgQ4A2cI/UeVEv0iYczI/AAAAAAAAJI4/stJOY-AnGkg/s0/SomersetPoppyfields.jpg'],
    ['https://lh6.googleusercontent.com/-E-IZCBsIp9Y/UeV86dFsOkI/AAAAAAACvgE/E0ljS3ycbDI/w506-h750/IMG_1578.jpg',
     'https://lh6.googleusercontent.com/-E-IZCBsIp9Y/UeV86dFsOkI/AAAAAAACvgE/E0ljS3ycbDI/s0/IMG_1578.jpg'],
    ['https://lh6.googleusercontent.com/-E-IZCBsIp9Y/UeV86dFsOkI/AAAAAAACvgE/E0ljS3ycbDI/s0-d/IMG_1578.jpg',
     'https://lh6.googleusercontent.com/-E-IZCBsIp9Y/UeV86dFsOkI/AAAAAAACvgE/E0ljS3ycbDI/s0/IMG_1578.jpg'],
    ['https://lh6.googleusercontent.com/-TUpEOU6sPJc/UeTwnZ2_qnI/AAAAAAACvek/SpI41nCrY40/w506-h750/IMG_0691%2Bcopy.jpg',
     'https://lh6.googleusercontent.com/-TUpEOU6sPJc/UeTwnZ2_qnI/AAAAAAACvek/SpI41nCrY40/s0/IMG_0691%2Bcopy.jpg'],
    ['https://lh6.googleusercontent.com/-TUpEOU6sPJc/UeTwnZ2_qnI/AAAAAAACvek/SpI41nCrY40/s0-d/IMG_0691%2Bcopy.jpg',
     'https://lh6.googleusercontent.com/-TUpEOU6sPJc/UeTwnZ2_qnI/AAAAAAACvek/SpI41nCrY40/s0/IMG_0691%2Bcopy.jpg'],
    ['https://lh5.googleusercontent.com/-_isC2i9tdoU/UeTrNd6J-mI/AAAAAAACvd8/zu2aHDjq1L4/w506-h750/IMG_1493%2Bcopy.jpg',
     'https://lh5.googleusercontent.com/-_isC2i9tdoU/UeTrNd6J-mI/AAAAAAACvd8/zu2aHDjq1L4/s0/IMG_1493%2Bcopy.jpg'],
    ['https://lh5.googleusercontent.com/-_isC2i9tdoU/UeTrNd6J-mI/AAAAAAACvd8/zu2aHDjq1L4/s0-d/IMG_1493%2Bcopy.jpg',
     'https://lh5.googleusercontent.com/-_isC2i9tdoU/UeTrNd6J-mI/AAAAAAACvd8/zu2aHDjq1L4/s0/IMG_1493%2Bcopy.jpg'],
    ['https://lh6.googleusercontent.com/-v0k-j73d_s8/UeRncQN4qwI/AAAAAAACv10/RAbSHG4kC9Y/w506-h750/photo.jpg',
     'https://lh6.googleusercontent.com/-v0k-j73d_s8/UeRncQN4qwI/AAAAAAACv10/RAbSHG4kC9Y/s0/photo.jpg'],
    ['https://lh5.googleusercontent.com/-uQFzAl6Q5uw/UeQ2sBk8RiI/AAAAAAACv3U/oRBCGZ44pR8/w506-h750/photo.jpg',
     'https://lh5.googleusercontent.com/-uQFzAl6Q5uw/UeQ2sBk8RiI/AAAAAAACv3U/oRBCGZ44pR8/s0/photo.jpg'],
    ['https://lh4.googleusercontent.com/-5YDYhVeUrTw/UeOfGjd55vI/AAAAAAACvX0/MYB4eOGGxDI/w506-h750/Fullscreen%2Bcapture%2B15072013%2B080340.bmp.jpg',
     'https://lh4.googleusercontent.com/-5YDYhVeUrTw/UeOfGjd55vI/AAAAAAACvX0/MYB4eOGGxDI/s0/Fullscreen%2Bcapture%2B15072013%2B080340.bmp.jpg'],
    ['https://lh4.googleusercontent.com/-5YDYhVeUrTw/UeOfGjd55vI/AAAAAAACvX0/MYB4eOGGxDI/s0-d/Fullscreen%2Bcapture%2B15072013%2B080340.bmp.jpg',
     'https://lh4.googleusercontent.com/-5YDYhVeUrTw/UeOfGjd55vI/AAAAAAACvX0/MYB4eOGGxDI/s0/Fullscreen%2Bcapture%2B15072013%2B080340.bmp.jpg'],
    ['https://lh4.googleusercontent.com/-JqXr8mBzh4I/UeMxbrYYoyI/AAAAAAACvVo/ePrQCHe16xg/w506-h750/IMG_5403%2Bcopy.jpg',
     'https://lh4.googleusercontent.com/-JqXr8mBzh4I/UeMxbrYYoyI/AAAAAAACvVo/ePrQCHe16xg/s0/IMG_5403%2Bcopy.jpg'],
    ['https://lh4.googleusercontent.com/-JqXr8mBzh4I/UeMxbrYYoyI/AAAAAAACvVo/ePrQCHe16xg/s0-d/IMG_5403%2Bcopy.jpg',
     'https://lh4.googleusercontent.com/-JqXr8mBzh4I/UeMxbrYYoyI/AAAAAAACvVo/ePrQCHe16xg/s0/IMG_5403%2Bcopy.jpg'],
    ['https://lh3.googleusercontent.com/-rnI96dvtbyE/UeHIj8HwYSI/AAAAAAACvKE/8jy7csIiH4o/w506-h750/IMG_9052%2Bcopy-001.jpg',
     'https://lh3.googleusercontent.com/-rnI96dvtbyE/UeHIj8HwYSI/AAAAAAACvKE/8jy7csIiH4o/s0/IMG_9052%2Bcopy-001.jpg'],
    ['https://lh3.googleusercontent.com/-rnI96dvtbyE/UeHIj8HwYSI/AAAAAAACvKE/8jy7csIiH4o/s0-d/IMG_9052%2Bcopy-001.jpg',
     'https://lh3.googleusercontent.com/-rnI96dvtbyE/UeHIj8HwYSI/AAAAAAACvKE/8jy7csIiH4o/s0/IMG_9052%2Bcopy-001.jpg'],
    ['https://lh5.googleusercontent.com/-_vFi46VRCq0/UdbBpa1l3RI/AAAAAAABZ6A/UQTeWYWl13U/w506-h750/photo.jpg',
     'https://lh5.googleusercontent.com/-_vFi46VRCq0/UdbBpa1l3RI/AAAAAAABZ6A/UQTeWYWl13U/s0/photo.jpg'],
    ['https://lh6.googleusercontent.com/-kmyWj74HK50/UeG2wQNXWkI/AAAAAAACvJY/3g4Avz4YVYo/w506-h750/IMG_2183%2Bcopy.jpg',
     'https://lh6.googleusercontent.com/-kmyWj74HK50/UeG2wQNXWkI/AAAAAAACvJY/3g4Avz4YVYo/s0/IMG_2183%2Bcopy.jpg'],
    ['https://lh6.googleusercontent.com/-kmyWj74HK50/UeG2wQNXWkI/AAAAAAACvJY/3g4Avz4YVYo/s0-d/IMG_2183%2Bcopy.jpg',
     'https://lh6.googleusercontent.com/-kmyWj74HK50/UeG2wQNXWkI/AAAAAAACvJY/3g4Avz4YVYo/s0/IMG_2183%2Bcopy.jpg'],
    ['https://lh3.googleusercontent.com/-qEoGrnmb1d8/UeF_y0xmwEI/AAAAAAACvM8/N59RKN9F7bA/w506-h750/photo.jpg',
     'https://lh3.googleusercontent.com/-qEoGrnmb1d8/UeF_y0xmwEI/AAAAAAACvM8/N59RKN9F7bA/s0/photo.jpg'],
    ['https://lh3.googleusercontent.com/-BRe9oAfj9vw/UeFjEP6BzcI/AAAAAAACv3M/DMGVFfLLzSs/w506-h750/photo.jpg',
     'https://lh3.googleusercontent.com/-BRe9oAfj9vw/UeFjEP6BzcI/AAAAAAACv3M/DMGVFfLLzSs/s0/photo.jpg'],
    ['https://lh5.googleusercontent.com/-AP1cGmVZRto/UeFVhLGI37I/AAAAAAACvGk/8CvZwQIxpuo/w506-h750/photo.jpg',
     'https://lh5.googleusercontent.com/-AP1cGmVZRto/UeFVhLGI37I/AAAAAAACvGk/8CvZwQIxpuo/s0/photo.jpg'],
    ['https://lh5.googleusercontent.com/-AP1cGmVZRto/UeFVhLGI37I/AAAAAAACvGk/8CvZwQIxpuo/s0-d/photo.jpg',
     'https://lh5.googleusercontent.com/-AP1cGmVZRto/UeFVhLGI37I/AAAAAAACvGk/8CvZwQIxpuo/s0/photo.jpg'],
    ['https://lh4.googleusercontent.com/-bRM2rA-4ulE/UeFIsu9cN5I/AAAAAAACvFc/hVj2-fVlYN4/w506-h750/IMG_2701v3.jpg',
     'https://lh4.googleusercontent.com/-bRM2rA-4ulE/UeFIsu9cN5I/AAAAAAACvFc/hVj2-fVlYN4/s0/IMG_2701v3.jpg'],
    ['https://lh4.googleusercontent.com/-bRM2rA-4ulE/UeFIsu9cN5I/AAAAAAACvFc/hVj2-fVlYN4/s0-d/IMG_2701v3.jpg',
     'https://lh4.googleusercontent.com/-bRM2rA-4ulE/UeFIsu9cN5I/AAAAAAACvFc/hVj2-fVlYN4/s0/IMG_2701v3.jpg'],
    ['https://lh5.googleusercontent.com/-FPLzdciUnLU/UeFC78dXqMI/AAAAAAACvEM/LWc_Bmnntq0/w506-h750/IMG_4710-copy-2.jpg',
     'https://lh5.googleusercontent.com/-FPLzdciUnLU/UeFC78dXqMI/AAAAAAACvEM/LWc_Bmnntq0/s0/IMG_4710-copy-2.jpg'],
    ['https://lh5.googleusercontent.com/-FPLzdciUnLU/UeFC78dXqMI/AAAAAAACvEM/LWc_Bmnntq0/s0-d/IMG_4710-copy-2.jpg',
     'https://lh5.googleusercontent.com/-FPLzdciUnLU/UeFC78dXqMI/AAAAAAACvEM/LWc_Bmnntq0/s0/IMG_4710-copy-2.jpg'],
    ['https://lh4.googleusercontent.com/-w36QodatA3I/UeB8IFIdWmI/AAAAAAACvCs/Psu6GWLVV5E/w506-h750/IMG_8107-1-as-Smart-Object-1.jpg',
     'https://lh4.googleusercontent.com/-w36QodatA3I/UeB8IFIdWmI/AAAAAAACvCs/Psu6GWLVV5E/s0/IMG_8107-1-as-Smart-Object-1.jpg'],
    ['https://lh4.googleusercontent.com/-w36QodatA3I/UeB8IFIdWmI/AAAAAAACvCs/Psu6GWLVV5E/s0-d/IMG_8107-1-as-Smart-Object-1.jpg',
     'https://lh4.googleusercontent.com/-w36QodatA3I/UeB8IFIdWmI/AAAAAAACvCs/Psu6GWLVV5E/s0/IMG_8107-1-as-Smart-Object-1.jpg'],
    ['https://lh4.googleusercontent.com/-nUgWaSTkoy4/UeBLzByYIaI/AAAAAAACvBQ/1hcJm0ZyKyM/w506-h750/photo.jpg',
     'https://lh4.googleusercontent.com/-nUgWaSTkoy4/UeBLzByYIaI/AAAAAAACvBQ/1hcJm0ZyKyM/s0/photo.jpg'],
    ['https://lh4.googleusercontent.com/-nUgWaSTkoy4/UeBLzByYIaI/AAAAAAACvBQ/1hcJm0ZyKyM/s0-d/photo.jpg',
     'https://lh4.googleusercontent.com/-nUgWaSTkoy4/UeBLzByYIaI/AAAAAAACvBQ/1hcJm0ZyKyM/s0/photo.jpg'],
    ['https://lh5.googleusercontent.com/-pCRjAqR3jsU/UeA0YbnX_EI/AAAAAAACvAA/2GmbIJMc2YU/w506-h750/IMG_8594.jpg',
     'https://lh5.googleusercontent.com/-pCRjAqR3jsU/UeA0YbnX_EI/AAAAAAACvAA/2GmbIJMc2YU/s0/IMG_8594.jpg'],
    ['https://lh5.googleusercontent.com/-pCRjAqR3jsU/UeA0YbnX_EI/AAAAAAACvAA/2GmbIJMc2YU/s0-d/IMG_8594.jpg',
     'https://lh5.googleusercontent.com/-pCRjAqR3jsU/UeA0YbnX_EI/AAAAAAACvAA/2GmbIJMc2YU/s0/IMG_8594.jpg'],
    ['https://lh4.googleusercontent.com/-NiEOppaV5aM/Uehpz-4Ce8I/AAAAAAAAFeU/ObO__CdiGkY/w506-h750/choke.jpg',
     'https://lh4.googleusercontent.com/-NiEOppaV5aM/Uehpz-4Ce8I/AAAAAAAAFeU/ObO__CdiGkY/s0/choke.jpg'],
    ['https://lh4.googleusercontent.com/-NiEOppaV5aM/Uehpz-4Ce8I/AAAAAAAAFeU/ObO__CdiGkY/s0-d/choke.jpg',
     'https://lh4.googleusercontent.com/-NiEOppaV5aM/Uehpz-4Ce8I/AAAAAAAAFeU/ObO__CdiGkY/s0/choke.jpg'],
    ['https://lh6.googleusercontent.com/-1zjQXd8fhzg/UehujcFEo6I/AAAAAAAAhKw/c2hPa-1DfBI/w506-h750/glovetest.jpg',
     'https://lh6.googleusercontent.com/-1zjQXd8fhzg/UehujcFEo6I/AAAAAAAAhKw/c2hPa-1DfBI/s0/glovetest.jpg'],
    ['https://lh6.googleusercontent.com/-1zjQXd8fhzg/UehujcFEo6I/AAAAAAAAhKw/c2hPa-1DfBI/s0-d/glovetest.jpg',
     'https://lh6.googleusercontent.com/-1zjQXd8fhzg/UehujcFEo6I/AAAAAAAAhKw/c2hPa-1DfBI/s0/glovetest.jpg'],
    ['https://lh5.googleusercontent.com/proxy/AQg6gFxN-5inVH8eu3u-w-lyVsEU7UHNJ6ovPrqT6W4Zh7LDv3_e43Cuj2vndPpf4_iOTNTktCP2zb-TZ1l4-Fynd0T3_zGjhpOuLPZolX6SyByyt7zELPWTANttwV-oVHSKFMizGXG-kj7k_Md_4ZEXNg6Ocm5sPEa9eseDhhPuhTGhj3x2_g=w125-h125',
     'https://lh5.googleusercontent.com/proxy/AQg6gFxN-5inVH8eu3u-w-lyVsEU7UHNJ6ovPrqT6W4Zh7LDv3_e43Cuj2vndPpf4_iOTNTktCP2zb-TZ1l4-Fynd0T3_zGjhpOuLPZolX6SyByyt7zELPWTANttwV-oVHSKFMizGXG-kj7k_Md_4ZEXNg6Ocm5sPEa9eseDhhPuhTGhj3x2_g=s0'],
    ['https://lh3.googleusercontent.com/proxy/ogo38Za25kINBGCRNJZkE_J2SAxzB19jW-MfSWoEQh-jjdm_dvQqbwDpkbYe1llngHnAvvkGlONA2wh6ZMdTX3dsvcqUu_C64YdDm34Cyw=w506-h284-n',
     'https://lh3.googleusercontent.com/proxy/ogo38Za25kINBGCRNJZkE_J2SAxzB19jW-MfSWoEQh-jjdm_dvQqbwDpkbYe1llngHnAvvkGlONA2wh6ZMdTX3dsvcqUu_C64YdDm34Cyw=s0'],
    ['https://lh4.googleusercontent.com/proxy/znqzmmZ6YkbHz3CUEzjJZva9vYfhSLIyrw_jnWk8zIFN6_z4WoOSZKsaHvi53jUSFWT9k1Mkv2oEztupPBQWoVJjP6PnMRF39wFJ=w379-h379-n',
     'https://lh4.googleusercontent.com/proxy/znqzmmZ6YkbHz3CUEzjJZva9vYfhSLIyrw_jnWk8zIFN6_z4WoOSZKsaHvi53jUSFWT9k1Mkv2oEztupPBQWoVJjP6PnMRF39wFJ=s0'],
    ['https://lh3.googleusercontent.com/proxy/gKoe6isoV15mwxP7wabz7Vg9Ihm6L_9-Pfq-OVyptxQHLS0PtTmoBxNCDg53PyQVzo7e5NFDgoBqrOQXYNs5fGK7aURmBogRLnDP=w506-h284-n',
     'https://lh3.googleusercontent.com/proxy/gKoe6isoV15mwxP7wabz7Vg9Ihm6L_9-Pfq-OVyptxQHLS0PtTmoBxNCDg53PyQVzo7e5NFDgoBqrOQXYNs5fGK7aURmBogRLnDP=s0'],
    ['https://lh5.googleusercontent.com/proxy/g39mblcJLqrSsm-fUUxzOQ5VREpizFQTkVVdCFEp1E4MBk-zzyKn5DXmqlYgg25Mo7ttDy1T1Tyq1vS2C8yJTWgI0qRw80UJCRN9=w125-h125',
     'https://lh5.googleusercontent.com/proxy/g39mblcJLqrSsm-fUUxzOQ5VREpizFQTkVVdCFEp1E4MBk-zzyKn5DXmqlYgg25Mo7ttDy1T1Tyq1vS2C8yJTWgI0qRw80UJCRN9=s0'],
    ['https://lh4.googleusercontent.com/proxy/OYlzVd84IKWqm4ZviJKWsIuEm_uDAgX-yMWx2BQa9ObUZ9ZkqwKUKznKaT_v_nsvrk4UrnHf5ncEmqmZ4D4EXNuqQmJaDz_IYi9dNzSHNBTxRZZ2V0Lrz14THXQKcjZ5XAaKT-GnbUmXPqY3ZEEuPLoHDpE=w125-h125',
     'https://lh4.googleusercontent.com/proxy/OYlzVd84IKWqm4ZviJKWsIuEm_uDAgX-yMWx2BQa9ObUZ9ZkqwKUKznKaT_v_nsvrk4UrnHf5ncEmqmZ4D4EXNuqQmJaDz_IYi9dNzSHNBTxRZZ2V0Lrz14THXQKcjZ5XAaKT-GnbUmXPqY3ZEEuPLoHDpE=s0'],
    ['https://lh3.googleusercontent.com/proxy/iemX6kVaBe_AoIesb9lVN1qn3SVgv17YD9THonp0peh3lJuepx3Sd421DzXzJaF9u0E0u6dt7zD2NYHFIl_s1Hi8KiwVpdE9xM5af9q6wYuAI4SFnsmrH3TU1fBX2CfJdtJExsNYcA=w125-h125',
     'https://lh3.googleusercontent.com/proxy/iemX6kVaBe_AoIesb9lVN1qn3SVgv17YD9THonp0peh3lJuepx3Sd421DzXzJaF9u0E0u6dt7zD2NYHFIl_s1Hi8KiwVpdE9xM5af9q6wYuAI4SFnsmrH3TU1fBX2CfJdtJExsNYcA=s0'],
    ['https://lh5.googleusercontent.com/proxy/SK1FNO72C6TaUVKR35s9Aslb_sVti7Tq_UvLrr-ch80QqPppl52s2ykuk8Zlvodk89lAy2Zf7wrkJy9gYa4067NpDA=w125-h125',
     'https://lh5.googleusercontent.com/proxy/SK1FNO72C6TaUVKR35s9Aslb_sVti7Tq_UvLrr-ch80QqPppl52s2ykuk8Zlvodk89lAy2Zf7wrkJy9gYa4067NpDA=s0'],
    ['https://lh3.googleusercontent.com/proxy/SijoXcgCDV8WFvLnlDTrlJal9xsRods21D02Cnyl0R66TlQCa3LYKzJ3OmOG6dXo2d54FsCOooMMtmBSkamV=w125-h125',
     'https://lh3.googleusercontent.com/proxy/SijoXcgCDV8WFvLnlDTrlJal9xsRods21D02Cnyl0R66TlQCa3LYKzJ3OmOG6dXo2d54FsCOooMMtmBSkamV=s0'],
    ['https://lh6.googleusercontent.com/proxy/iVUhf6sd1zA7yDlvK5ssWOQbxHSWQWoUn7ZP3lydbnHSPwvqKIKzqnw3CYxBiO4dAakmO-2XOmR3cK4Vmb-cbo2EnY2eUDJO3VARCGiXxbbm4EPyYRBlA50y_WXrBFtQYdAFNnB_ZOAVNUIL726-pyB3FWWviS4fM_bq1z0R7nIz9KiSIx-wLgre28LO6iDE7mqM4IC7OutRaZTUmB_NPA=w125-h125',
     'https://lh6.googleusercontent.com/proxy/iVUhf6sd1zA7yDlvK5ssWOQbxHSWQWoUn7ZP3lydbnHSPwvqKIKzqnw3CYxBiO4dAakmO-2XOmR3cK4Vmb-cbo2EnY2eUDJO3VARCGiXxbbm4EPyYRBlA50y_WXrBFtQYdAFNnB_ZOAVNUIL726-pyB3FWWviS4fM_bq1z0R7nIz9KiSIx-wLgre28LO6iDE7mqM4IC7OutRaZTUmB_NPA=s0'],
    ['https://lh5.googleusercontent.com/proxy/bxRlCFIsIOzXTvfKHdDRQGnVtno22PpYoJ0kOru-puBmDpVwD7iXMI_4hODH-pJ1npoA0nEvHx2gS1JJO4B5FeORVZisVijVkwmFEvQ=w125-h125',
     'https://lh5.googleusercontent.com/proxy/bxRlCFIsIOzXTvfKHdDRQGnVtno22PpYoJ0kOru-puBmDpVwD7iXMI_4hODH-pJ1npoA0nEvHx2gS1JJO4B5FeORVZisVijVkwmFEvQ=s0'],
    ['https://lh6.googleusercontent.com/proxy/7gVRsPDFGmFpwLz_jzO2Lxxcb89oY9pIOIhBudh5KWyFmsJSF3mu5Wr0VJyG2YroZTHboXXvlhcKBMrGZNzn6-ixyo9GfpIX-IudEl8LEmvxCjIA5cGTlQAhcfdyJHVplOMPmsOVChqlWXi8RrQb9wRyeBW0efQadeOI4qO2k1vlUvjyM-rcXHo-F5prnyvLMsGBFHU=w125-h125',
     'https://lh6.googleusercontent.com/proxy/7gVRsPDFGmFpwLz_jzO2Lxxcb89oY9pIOIhBudh5KWyFmsJSF3mu5Wr0VJyG2YroZTHboXXvlhcKBMrGZNzn6-ixyo9GfpIX-IudEl8LEmvxCjIA5cGTlQAhcfdyJHVplOMPmsOVChqlWXi8RrQb9wRyeBW0efQadeOI4qO2k1vlUvjyM-rcXHo-F5prnyvLMsGBFHU=s0'],
    ['https://lh6.googleusercontent.com/proxy/2ebMy2I45P3h5RkRd6I6DNz4of6WsmJq4zV3e0h_PEij-iz4tsiWGNWkO80OdW3e2T_oZjRYPmJM5hm6WHDSy3Jz9FfNAM3wesicAX4Hu0GRObuc9zXR2-uB8J46cr9YiOOf9u7GrzsXimNOI5YvcA=w125-h125',
     'https://lh6.googleusercontent.com/proxy/2ebMy2I45P3h5RkRd6I6DNz4of6WsmJq4zV3e0h_PEij-iz4tsiWGNWkO80OdW3e2T_oZjRYPmJM5hm6WHDSy3Jz9FfNAM3wesicAX4Hu0GRObuc9zXR2-uB8J46cr9YiOOf9u7GrzsXimNOI5YvcA=s0'],
    ['https://lh6.googleusercontent.com/proxy/HE-j2p_LRD0qjgF8aHRihYPEz_6phwVL1hYaze8lxTdBOZ0yXcnHJk546dp7ZHYEl88x_fwuAAsdZv1nRL41B29mcfQ_D9tliCc7zx_WzMZBcypr7Xob-CY=w125-h125',
     'https://lh6.googleusercontent.com/proxy/HE-j2p_LRD0qjgF8aHRihYPEz_6phwVL1hYaze8lxTdBOZ0yXcnHJk546dp7ZHYEl88x_fwuAAsdZv1nRL41B29mcfQ_D9tliCc7zx_WzMZBcypr7Xob-CY=s0'],
    ['https://lh6.googleusercontent.com/proxy/oMfXdS-u_biAIieLAakDnSEcCRrSpgBUTudkG8e_GkOqCYd__0Z0etoo9MOuBkNKqopZWXObE5W7qpCOwtcQec2Xi0bjBw=w125-h125',
     'https://lh6.googleusercontent.com/proxy/oMfXdS-u_biAIieLAakDnSEcCRrSpgBUTudkG8e_GkOqCYd__0Z0etoo9MOuBkNKqopZWXObE5W7qpCOwtcQec2Xi0bjBw=s0'],
    ['https://lh4.googleusercontent.com/proxy/ZrVhtQPs202cYrpAkGt8UFgtJgAq00H6UFbw0HkDa_xgdu9unZAV0zYmbUO9kRpAxFVUkp9kZDdd6b4NkXR8JPw4JpvCT7-okeR4B4tHZTogTIk_FVEzS7GELu8=w125-h125',
     'https://lh4.googleusercontent.com/proxy/ZrVhtQPs202cYrpAkGt8UFgtJgAq00H6UFbw0HkDa_xgdu9unZAV0zYmbUO9kRpAxFVUkp9kZDdd6b4NkXR8JPw4JpvCT7-okeR4B4tHZTogTIk_FVEzS7GELu8=s0'],
    ['https://lh5.googleusercontent.com/proxy/RMhb9eBz323kCg5xmfG3_u657yxhuB-Ty0iVn9MLtJ17gDEu22wBHxcUUIDEj3cizx9wgJGkvYNuTEq9jMFR7B13bMRPbxbdw6hpFUjdn_WddHqvwXMnldyKvg=w125-h125',
     'https://lh5.googleusercontent.com/proxy/RMhb9eBz323kCg5xmfG3_u657yxhuB-Ty0iVn9MLtJ17gDEu22wBHxcUUIDEj3cizx9wgJGkvYNuTEq9jMFR7B13bMRPbxbdw6hpFUjdn_WddHqvwXMnldyKvg=s0'],
    ['https://lh4.googleusercontent.com/proxy/JkiGD28W230mPdAyi-A63WhxMOmgbPs5SDfmOogaMWL1FkQfL46DqR8gHG2J4MM5Za84EjPFmCv-BhxmGhwmyzfsq8aSUa9uyG3We7Dw5A=w506-h284-n',
     'https://lh4.googleusercontent.com/proxy/JkiGD28W230mPdAyi-A63WhxMOmgbPs5SDfmOogaMWL1FkQfL46DqR8gHG2J4MM5Za84EjPFmCv-BhxmGhwmyzfsq8aSUa9uyG3We7Dw5A=s0'],
    ['https://lh3.googleusercontent.com/proxy/PO2p-dCezRy0U6NLlUIGauVffJ5uvVsEgu2lqTCg93x6_MQ146oEpdg75OTcwC0TOyXXsJzwga06PZu_0XyjsDjLiFHIn611yHERjg9P-SM_M0n8SbBZXf9KEDKivNwcF4vFUFjzwZeCQCWH=w125-h125',
     'https://lh3.googleusercontent.com/proxy/PO2p-dCezRy0U6NLlUIGauVffJ5uvVsEgu2lqTCg93x6_MQ146oEpdg75OTcwC0TOyXXsJzwga06PZu_0XyjsDjLiFHIn611yHERjg9P-SM_M0n8SbBZXf9KEDKivNwcF4vFUFjzwZeCQCWH=s0'],
    ['https://lh4.googleusercontent.com/proxy/wrFMLI9vHeQxXygLonvkoSL1LVxlD9wNLrEzEqsohBnyZvgqgiciWUOeSCkgvNm-RxRDSBdTxfbu7PRcRlqwpGxrX-bBcCZxzQTGqx4Ne20Goeyo8ollLHtwV98069VgKLKcHJwxddNVGJGMgEyq5StAab3RyR0QDchrY0uH=w125-h125',
     'https://lh4.googleusercontent.com/proxy/wrFMLI9vHeQxXygLonvkoSL1LVxlD9wNLrEzEqsohBnyZvgqgiciWUOeSCkgvNm-RxRDSBdTxfbu7PRcRlqwpGxrX-bBcCZxzQTGqx4Ne20Goeyo8ollLHtwV98069VgKLKcHJwxddNVGJGMgEyq5StAab3RyR0QDchrY0uH=s0'],
    ['https://lh3.googleusercontent.com/proxy/L-MnX5AIx8eKHYFivcspFPwtJO9oXSeRQJpiWLAlHWqKVB7rhCv6Icf5YLuMw6raEgz08dX1E-ZBts4Bb6JPkAaUtPMpP4KTFYSXF6dG2r1FK6lcia1TSN8JkO4z6Og79NT-GGA-Bs4lu8xtMt8my4_Tx-4YQWnriVK5jS6O-pfgVVIK=w125-h125',
     'https://lh3.googleusercontent.com/proxy/L-MnX5AIx8eKHYFivcspFPwtJO9oXSeRQJpiWLAlHWqKVB7rhCv6Icf5YLuMw6raEgz08dX1E-ZBts4Bb6JPkAaUtPMpP4KTFYSXF6dG2r1FK6lcia1TSN8JkO4z6Og79NT-GGA-Bs4lu8xtMt8my4_Tx-4YQWnriVK5jS6O-pfgVVIK=s0']
  ];

  it('should fix image urls', function() {
    imageUrls.forEach(function(urls) {
      expect(utils.getImageUrl({
        image: {
          url: urls[0]
        }
      })).to.eq(urls[1]);
    });
  });

  /*it('should check remote image file size', function(done) {
    utils.fetchRemoteImageFileSize('https://lh3.googleusercontent.com/-pMCdkDli-CY/UY1fVmWr71I/AAAAAAAAGK8/B_n31al9Z48/s0-d/IMG_20130508_170541.jpg', function(contentLength, contentType) {
      expect(contentLength).to.eq(1408632);
      expect(contentType).to.eq('image/jpeg');
      done();
    });
  });

  it('should check remote image file size - smaller s4096', function(done) {
    utils.fetchRemoteImageFileSize('https://lh3.googleusercontent.com/-pMCdkDli-CY/UY1fVmWr71I/AAAAAAAAGK8/B_n31al9Z48/s4096/IMG_20130508_170541.jpg', function(contentLength, contentType) {
      expect(contentLength).to.eq(570545);
      expect(contentType).to.eq('image/jpeg');
      done();
    });
  });

  it('should tmieout check remote image file size', function(done) {
    utils.fetchRemoteImageFileSize('https://lh3.googleusercontent.com/-pMCdkDli-CY/UY1fVmWr71I/AAAAAAAAGK8/B_n31al9Z48/s0-d/IMG_20130508_170541.jpg', function(contentLength, contentType) {
      expect(contentLength).to.eq(-1);
      expect(contentType).not.toBeDefined();
      done();
    }, 1);
  });

  it('should return the same remote image', function(done) {
    utils.urlImageWithLimitedSize('http://static.friendsplus.me/images/logo-80x80.png', 10*1024, function(uri) {
      expect(uri).to.eq('http://static.friendsplus.me/images/logo-80x80.png');
      done();
    });
  });

  it('should work for not existing remote image', function(done) {
    utils.urlImageWithLimitedSize('http://static.friendsplus.me/images/non-existing-image-file.png', 10*1024, function(uri) {
      expect(uri).to.eq('http://static.friendsplus.me/images/non-existing-image-file.png');
      done();
    });
  });

  it('should get smaller remote image with max. file size 1 MB', function(done) {
    utils.urlImageWithLimitedSize('https://lh3.googleusercontent.com/-pMCdkDli-CY/UY1fVmWr71I/AAAAAAAAGK8/B_n31al9Z48/s0-d/IMG_20130508_170541.jpg', 1*1024*1024, function(uri) {
      expect(uri).to.eq('https://lh3.googleusercontent.com/-pMCdkDli-CY/UY1fVmWr71I/AAAAAAAAGK8/B_n31al9Z48/s4096/IMG_20130508_170541.jpg');
      done();
    });
  });
  it('should get smaller remote image with max. file size 1 MB', function(done) {
    utils.urlImageWithLimitedSize('https://lh6.googleusercontent.com/-5l5rpSLiZGA/Ueuod-T3bFI/AAAAAAAAHwY/_AKW1U99YRM/s0/photo.jpg', 1*1024*1024, function(uri) {
      expect(uri).to.eq('https://lh6.googleusercontent.com/-5l5rpSLiZGA/Ueuod-T3bFI/AAAAAAAAHwY/_AKW1U99YRM/s1024/photo.jpg');
      done();
    });
  });

  it('should get smaller remote image with max. file size 300 KB', function(done) {
    utils.urlImageWithLimitedSize('https://lh3.googleusercontent.com/-pMCdkDli-CY/UY1fVmWr71I/AAAAAAAAGK8/B_n31al9Z48/s0-d/IMG_20130508_170541.jpg', 300*1024, function(uri) {
      expect(uri).to.eq('https://lh3.googleusercontent.com/-pMCdkDli-CY/UY1fVmWr71I/AAAAAAAAGK8/B_n31al9Z48/s1024/IMG_20130508_170541.jpg');
      done();
    });
  });

  it('should get smaller remote image with max. file size 10 KB', function(done) {
    utils.urlImageWithLimitedSize('https://lh3.googleusercontent.com/-pMCdkDli-CY/UY1fVmWr71I/AAAAAAAAGK8/B_n31al9Z48/s0-d/IMG_20130508_170541.jpg', 10*1024, function(uri) {
      expect(uri).to.eq('https://lh3.googleusercontent.com/-pMCdkDli-CY/UY1fVmWr71I/AAAAAAAAGK8/B_n31al9Z48/s1024/IMG_20130508_170541.jpg');
      done();
    });
  });*/
});
