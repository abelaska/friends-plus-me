const { States } = require('@fpm/constants');
const { oauth, scopes } = require('../utils/oauth');
const { args, method, rateLimit } = require('../utils/http');
const { timelinePagingHistory } = require('../utils/paging');
const { pagePosts } = require('../utils/post');
const { fetchQueueTeamForRead } = require('../utils/access');

module.exports = [
  method('GET'),
  args('queue'),
  oauth(),
  scopes('admin', 'queues', 'queues.history'),
  rateLimit(),
  timelinePagingHistory(),
  async req => {
    const { query, user } = req;

    const { dbQueue, error: queueError } = await fetchQueueTeamForRead({ query, user });
    if (queueError) {
      return queueError;
    }

    const { posts, latest, has_more } = await pagePosts({
      req,
      query: {
        aid: dbQueue._id,
        state: { $gt: States.post.draft.code }
      },
      dbSortField: 'completedAt',
      dbSortDirection: -1
    });

    return { ok: true, latest, has_more, posts };
  }
];
