// eslint-disable-next-line import/no-extraneous-dependencies
const test = require('ava');
const PostConvertor = require('../PostConvertor');

test('should identify video', t => {
  const p = new PostConvertor({}, {}, {});
  t.truthy(p._isVideoUrl('https://youtu.be/huRVCqOyDcU'));
  t.truthy(p._isVideoUrl('https://www.youtube.com/embed/huRVCqOyDcU'));
  t.truthy(p._isVideoUrl('https://www.youtube.com/watch?v=huRVCqOyDcU'));
  t.truthy(p._isVideoUrl('https://youtu.be/huRVCqOyDcU?x=y'));
  t.truthy(p._isVideoUrl('https://www.youtube.com/embed/huRVCqOyDcU?x=y'));
  t.truthy(p._isVideoUrl('https://www.youtube.com/watch?v=huRVCqOyDcU&x=y'));
  t.truthy(
    p._isVideoUrl('https://www.youtube.com/attribution_link?a=PTDtNAayU4w&u=/watch?v%3DIRdrt8nPyy8%26feature%3Dshare')
  );
  t.truthy(p._isVideoUrl('https://youtu.be/attribution_link?a=PTDtNAayU4w&u=/watch?v%3DIRdrt8nPyy8%26feature%3Dshare'));
  t.falsy(p._isVideoUrl());
  t.falsy(p._isVideoUrl(null));
  t.falsy(p._isVideoUrl(''));
  t.falsy(p._isVideoUrl('https://root.cz/huRVCqOyDcU'));
  t.falsy(p._isVideoUrl('https://www.root.cz/embed/huRVCqOyDcU'));
  t.falsy(p._isVideoUrl('https://www.root.cz/watch?v=huRVCqOyDcU'));
});

test('should identify youtube video', t => {
  const p = new PostConvertor({}, {}, {});
  t.truthy(p._isYoutubeVideoUrl('https://youtu.be/huRVCqOyDcU'));
  t.truthy(p._isYoutubeVideoUrl('https://www.youtube.com/embed/huRVCqOyDcU'));
  t.truthy(p._isYoutubeVideoUrl('https://www.youtube.com/watch?v=huRVCqOyDcU'));
  t.truthy(p._isYoutubeVideoUrl('https://youtu.be/huRVCqOyDcU?x=y'));
  t.truthy(p._isYoutubeVideoUrl('https://www.youtube.com/embed/huRVCqOyDcU?x=y'));
  t.truthy(p._isYoutubeVideoUrl('https://www.youtube.com/watch?v=huRVCqOyDcU&x=y'));
  t.truthy(
    p._isYoutubeVideoUrl(
      'https://www.youtube.com/attribution_link?a=PTDtNAayU4w&u=/watch?v%3DIRdrt8nPyy8%26feature%3Dshare'
    )
  );
  t.truthy(
    p._isYoutubeVideoUrl('https://youtu.be/attribution_link?a=PTDtNAayU4w&u=/watch?v%3DIRdrt8nPyy8%26feature%3Dshare')
  );
  t.falsy(p._isYoutubeVideoUrl());
  t.falsy(p._isYoutubeVideoUrl(null));
  t.falsy(p._isYoutubeVideoUrl(''));
  t.falsy(p._isYoutubeVideoUrl('https://root.cz/huRVCqOyDcU'));
  t.falsy(p._isYoutubeVideoUrl('https://www.root.cz/embed/huRVCqOyDcU'));
  t.falsy(p._isYoutubeVideoUrl('https://www.root.cz/watch?v=huRVCqOyDcU'));
});
