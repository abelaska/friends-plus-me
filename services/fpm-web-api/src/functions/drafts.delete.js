const { oauth, scopes } = require('../utils/oauth');
const { args, method, rateLimit } = require('../utils/http');
const { deletePost } = require('../utils/post');
const { fetchDraftForWrite } = require('../utils/access');

module.exports = [
  method('GET'),
  args('draft'),
  oauth(),
  scopes('admin', 'drafts', 'drafts.write'),
  rateLimit(),
  async req => {
    const { query, user } = req;

    const { dbPost, error } = await fetchDraftForWrite({ query, user });
    if (error) {
      return error;
    }

    const deleted = await deletePost(dbPost._id);

    return { ok: true, deleted };
  }
];
