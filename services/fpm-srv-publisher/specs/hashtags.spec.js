'use strict';

process.env.NODE_ENV = 'test';

var expect = require('chai').expect,
    utils = require(__dirname+'/../src/lib/utils'),
    hashtags = require(__dirname+'/../src/lib/hashtags');

describe('hashtags', function(){

  require('chai').config.includeStack = true;

  it('should extract hashtags', function(){
    expect(hashtags.extractHashtags('#fb #ab-c #cd.e'))
    .to.eql(['fb','ab','cd']);
  });

  it('should remove no hashtag', function(){
    expect(hashtags.removeControlHashtags('text text'))
    .to.eq('text text');
  });

  it('should remove one hashtag', function(){
    expect(hashtags.removeControlHashtags('#fb', ['fb']))
    .to.eq('');
  });

  it('should remove right hashtag with text', function(){
    expect(hashtags.removeControlHashtags('a #fb', ['fb']))
    .to.eq('a');
  });

  it('should remove left hashtag with text', function(){
    expect(hashtags.removeControlHashtags('#fb a', ['fb']))
    .to.eq('a');
  });

  it('should remove left hashtag with text and other hashtags', function(){
    expect(hashtags.removeControlHashtags('#fb a #xx', ['fb']))
    .to.eq('a #xx');
  });

  it('should remove right hashtag with text and other hashtags', function(){
    expect(hashtags.removeControlHashtags('a #xx #fb', ['fb']))
    .to.eq('a #xx');
  });

  it('should not remove two close hashtags', function(){
    expect(hashtags.removeControlHashtags('#fb#fb', ['fb']))
    .to.eq('#fb#fb');
  });

  it('should not remove all control hashtags', function(){
    expect(hashtags.removeControlHashtags('#fb#fba #fbtest #haha\n#ft #ftl #fb and #fb\t#fbtest2 #fba #fb hu #tf #tw #l #fb #fb #tw #ltf #tfl #tlf #flt #ftl #tf #tl #t #ft #fl #f #lft #lt #lf #l', ['fb','tw','ltf','tfl','tlf','flt','ftl','tf','tl','t','ft','fl','f','lft','lt','lf','l']))
    .to.eq('#fb#fba #fbtest #haha\n and #fbtest2 #fba hu');
  });

  it('should not remove all control hashtags from HTML 1', function(){
    expect(hashtags.removeControlHashtagsHtml('<a class="ot-hashtag" href="https://plus.google.com/s/%23ft">#ft</a>  <br>---<br>George Carlin - Arrogance of mankind', ['ft']))
    .to.eq('<br>---<br>George Carlin - Arrogance of mankind');
  });

  it('should not remove all control hashtags from HTML with nofollow 1', function(){
    expect(hashtags.removeControlHashtagsHtml('<a rel="nofollow" class="ot-hashtag" href="https://plus.google.com/s/%23ft">#ft</a>  <br>---<br>George Carlin - Arrogance of mankind', ['ft']))
    .to.eq('<br>---<br>George Carlin - Arrogance of mankind');
  });

  it('should not remove all control hashtags from HTML 2', function(){
    expect(hashtags.removeControlHashtagsHtml('Jazz hands!<br /> <br /> <br /><a rel=\"nofollow\" class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23Caveman\">#Caveman</a> <a rel=\"nofollow\" class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23dinosaur\">#dinosaur</a> <a rel=\"nofollow\" class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23movies\">#movies</a> <a rel=\"nofollow\" class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23GIFs\">#GIFs</a> <a rel=\"nofollow\" class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23FromTumblr\">#FromTumblr</a>\ufeff', ['FromTumblr']))
    .to.eq('Jazz hands!<br /> <br /> <br /><a rel="nofollow" class="ot-hashtag" href="https://plus.google.com/s/%23Caveman">#Caveman</a> <a rel="nofollow" class="ot-hashtag" href="https://plus.google.com/s/%23dinosaur">#dinosaur</a> <a rel="nofollow" class="ot-hashtag" href="https://plus.google.com/s/%23movies">#movies</a> <a rel="nofollow" class="ot-hashtag" href="https://plus.google.com/s/%23GIFs">#GIFs</a>');
  });

  it('should extract hashtags', function(){
    expect(hashtags.extractHashtags(utils.prepareText('Jazz hands!<br /> <br /> <br /><a rel=\"nofollow\" class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23Caveman\">#Caveman</a> <a rel=\"nofollow\" class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23dinosaur\">#dinosaur</a> <a rel=\"nofollow\" class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23movies\">#movies</a> <a rel=\"nofollow\" class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23GIFs\">#GIFs</a> <a rel=\"nofollow\" class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23FromTumblr\">#FromTumblr</a>\ufeff')))
    .to.eql(['caveman','dinosaur','movies','gifs','fromtumblr']);
  });

  it('should not remove all control hashtags from TEXT 1', function(){
    expect(hashtags.removeControlHashtags(utils.prepareText('Jazz hands!<br /> <br /> <br /><a rel=\"nofollow\" class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23Caveman\">#Caveman</a> <a rel=\"nofollow\" class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23dinosaur\">#dinosaur</a> <a rel=\"nofollow\" class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23movies\">#movies</a> <a rel=\"nofollow\" class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23GIFs\">#GIFs</a> <a rel=\"nofollow\" class=\"ot-hashtag\" href=\"https://plus.google.com/s/%23FromTumblr\">#FromTumblr</a>\ufeff'), ['FromTumblr'].concat(['ns','nq','plusonly','noshare'])))
    .to.eq('Jazz hands!\n \n \n#Caveman #dinosaur #movies #GIFs');
  });

  it('should not remove all control hashtags from HTML 3', function(){
    expect(hashtags.removeControlHashtagsHtml('things are about to change  <a rel="nofollow" class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23thewalkingdead\'>#thewalkingdead</a>  <br><br> <a rel="nofollow" class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23f\'>#f</a>   <a rel="nofollow" class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23tb\'>#tb</a>   <a rel="nofollow" class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23nq\'>#nq</a>  ', ['f','tb']))
    .to.eq('things are about to change  <a rel="nofollow" class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23thewalkingdead\'>#thewalkingdead</a>  <br><br>       <a rel="nofollow" class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23nq\'>#nq</a>');
  });

  it('should not remove all control hashtags from HTML with nofollow 2', function(){
    expect(hashtags.removeControlHashtagsHtml(' #ft   <a rel="nofollow" class="ot-hashtag" href="https://plus.google.com/s/%23ft">#ft</a>  <br>---<br>George Carlin - Arrogance of mankind', ['ft']))
    .to.eq('#ft     <br>---<br>George Carlin - Arrogance of mankind');
  });

  it('should not remove all control hashtags from annotation', function(){
    expect(hashtags.removeControlHashtagsHtml('things are about to change  <a class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23thewalkingdead\'>#thewalkingdead</a>  <br><br> <a class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23f\'>#f</a>   <a class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23tb\'>#tb</a>   <a class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23nq\'>#nq</a>  ', ['f','tb','nq']))
    .to.eq('things are about to change  <a class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23thewalkingdead\'>#thewalkingdead</a>  <br><br>');
  });

  it('should not remove all control hashtags from annotation with nofollow', function(){
    expect(hashtags.removeControlHashtagsHtml('things are about to change  <a rel="nofollow" class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23thewalkingdead\'>#thewalkingdead</a>  <br><br> <a rel="nofollow" class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23f\'>#f</a>   <a rel="nofollow" class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23tb\'>#tb</a>   <a rel="nofollow" class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23nq\'>#nq</a>  ', ['f','tb','nq']))
    .to.eq('things are about to change  <a rel="nofollow" class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23thewalkingdead\'>#thewalkingdead</a>  <br><br>');
  });

  it('should not remove all control hashtags from annotation 2', function(){
    expect(hashtags.removeControlHashtagsHtml('things are about to change  <a class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23thewalkingdead\'>#thewalkingdead</a>  <br><br> <a class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23f\'>#f</a>   <a class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23tb\'>#tb</a>   <a class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23nq\'>#nq</a>  ', ['f','tb']))
    .to.eq('things are about to change  <a class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23thewalkingdead\'>#thewalkingdead</a>  <br><br>       <a class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23nq\'>#nq</a>');
  });

  it('should not remove all control hashtags from annotation with nofollow 2', function(){
    expect(hashtags.removeControlHashtagsHtml('things are about to change  <a rel="nofollow" class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23thewalkingdead\'>#thewalkingdead</a>  <br><br> <a rel="nofollow" class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23f\'>#f</a>   <a rel="nofollow" class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23tb\'>#tb</a>   <a rel="nofollow" class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23nq\'>#nq</a>  ', ['f','tb']))
    .to.eq('things are about to change  <a rel="nofollow" class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23thewalkingdead\'>#thewalkingdead</a>  <br><br>       <a rel="nofollow" class=\'ot-hashtag\' href=\'https://plus.google.com/s/%23nq\'>#nq</a>');
  });

  it('should extract hashtags', function(){
    var activity = require('../payloads/bugs/unknown-hashtag.json').activity,
        msg = utils.concatSentences(activity.annotation, activity.object.content);
    expect(hashtags.extractHashtags(msg)).to.eql(['ygp','nq']);
  });
});