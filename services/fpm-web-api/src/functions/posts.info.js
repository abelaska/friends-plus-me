const { oauth, scopes, isEmailVisibleByScope } = require('../utils/oauth');
const { args, method, rateLimit } = require('../utils/http');
const { transformDbPost, enhancePostsUsers } = require('../utils/post');
const { fetchQueueTeamForRead, fetchPostForRead } = require('../utils/access');

module.exports = [
  method('GET'),
  args('post'),
  oauth(),
  scopes('admin', 'posts', 'posts.read'),
  rateLimit(),
  async req => {
    const { query, user } = req;

    const { dbPost, error: postError } = await fetchPostForRead({ user, query });
    if (postError) {
      return postError;
    }

    const { error: queueError } = await fetchQueueTeamForRead({
      user,
      query: { queue: dbPost.aid.toString() }
    });
    if (queueError) {
      return queueError;
    }

    const isEmailVisible = isEmailVisibleByScope(req);

    const posts = [await transformDbPost({ dbPost })];
    const post = (await enhancePostsUsers({ isEmailVisible, posts }))[0];

    return { ok: true, post };
  }
];
