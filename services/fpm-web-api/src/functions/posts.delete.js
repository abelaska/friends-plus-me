const { oauth, scopes } = require('../utils/oauth');
const { args, method, rateLimit } = require('../utils/http');
const { deletePost } = require('../utils/post');
const { fetchQueueTeamForWrite, fetchPostForWrite } = require('../utils/access');

module.exports = [
  method('GET'),
  args('post'),
  oauth(),
  scopes('admin', 'posts', 'posts.write'),
  rateLimit(),
  async req => {
    const { query, user } = req;

    const { dbPost, error: postError } = await fetchPostForWrite({ user, query });
    if (postError) {
      return postError;
    }

    const { error: queueError } = await fetchQueueTeamForWrite({ user, query: { queue: dbPost.aid.toString() } });
    if (queueError) {
      return queueError;
    }

    const deleted = await deletePost(dbPost._id);

    return { ok: true, deleted };
  }
];
