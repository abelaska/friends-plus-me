// eslint-disable-next-line import/no-extraneous-dependencies
const test = require('ava');
const { extractYoutubeVideoId } = require('../youtube');

test('should extract youtube video id', t => {
  t.is(extractYoutubeVideoId('https://youtu.be/huRVCqOyDcU'), 'huRVCqOyDcU');
  t.is(extractYoutubeVideoId('https://www.youtube.com/embed/huRVCqOyDcU'), 'huRVCqOyDcU');
  t.is(extractYoutubeVideoId('https://www.youtube.com/watch?v=huRVCqOyDcU'), 'huRVCqOyDcU');
  t.is(extractYoutubeVideoId('https://youtu.be/huRVCqOyDcU?x=y'), 'huRVCqOyDcU');
  t.is(extractYoutubeVideoId('https://www.youtube.com/embed/huRVCqOyDcU?x=y'), 'huRVCqOyDcU');
  t.is(extractYoutubeVideoId('https://www.youtube.com/watch?v=huRVCqOyDcU&x=y'), 'huRVCqOyDcU');
  t.is(extractYoutubeVideoId(), undefined);
  t.is(extractYoutubeVideoId(null), undefined);
  t.is(extractYoutubeVideoId(''), undefined);
  t.is(extractYoutubeVideoId('https://root.cz/huRVCqOyDcU'), undefined);
  t.is(extractYoutubeVideoId('https://www.root.cz/embed/huRVCqOyDcU'), undefined);
  t.is(extractYoutubeVideoId('https://www.root.cz/watch?v=huRVCqOyDcU'), undefined);
  t.is(
    extractYoutubeVideoId(
      'https://www.youtube.com/attribution_link?a=PTDtNAayU4w&u=/watch?v%3DIRdrt8nPyy8%26feature%3Dshare'
    ),
    'IRdrt8nPyy8'
  );
  t.is(
    extractYoutubeVideoId('https://youtu.be/attribution_link?a=PTDtNAayU4w&u=/watch?v%3DIRdrt8nPyy8%26feature%3Dshare'),
    'IRdrt8nPyy8'
  );
});
