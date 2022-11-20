const { States } = require('@fpm/constants');
const { oauth, scopes } = require('../utils/oauth');
const { method, args, rateLimit } = require('../utils/http');
const { timelinePagingHistory } = require('../utils/paging');
const { postsToDrafts, pagePosts } = require('../utils/post');
const { isUserRoleContributor } = require('../utils/team');
const { fetchTeamForRead } = require('../utils/access');

module.exports = [
  method('GET'),
  args('team'),
  oauth(),
  scopes('admin', 'drafts', 'drafts.read'),
  rateLimit(),
  timelinePagingHistory(),
  async req => {
    const { query, user } = req;

    const { dbTeam, error } = await fetchTeamForRead({ user, query });
    if (error) {
      return error;
    }

    const postsQuery = {
      pid: dbTeam._id,
      state: States.post.draft.code
    };

    // contributor has access only to its own drafts
    if (isUserRoleContributor({ user, dbTeam })) {
      postsQuery.createdBy = user._id;
    }

    const { posts, latest, has_more } = await pagePosts({
      req,
      query: postsQuery,
      dbSortField: 'modifiedAt',
      dbSortDirection: -1
    });
    const drafts = postsToDrafts(posts);

    return { ok: true, latest, has_more, drafts };
  }
];
