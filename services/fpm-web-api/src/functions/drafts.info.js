const { oauth, scopes, isEmailVisibleByScope } = require('../utils/oauth');
const { args, method, rateLimit } = require('../utils/http');
const { fetchDraftForRead } = require('../utils/access');
const { transformDbPost, enhancePostsUsers, postsToDrafts } = require('../utils/post');

module.exports = [
  method('GET'),
  args('draft'),
  oauth(),
  scopes('admin', 'drafts', 'drafts.read'),
  rateLimit(),
  async req => {
    const { query, user } = req;

    const { dbPost, error } = await fetchDraftForRead({ query, user });
    if (error) {
      return error;
    }

    const posts = [await transformDbPost({ dbPost })];
    const draft = postsToDrafts(await enhancePostsUsers({ posts, isEmailVisible: isEmailVisibleByScope(req) }))[0];

    return { ok: true, draft };
  }
];
