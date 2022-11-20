const { ObjectId } = require('@fpm/db');
const { States } = require('@fpm/constants');
const { oauth, scopes } = require('../utils/oauth');
const { createError } = require('../utils/error');
const { method, rateLimit } = require('../utils/http');
const { timelinePagingFuture } = require('../utils/paging');
const { pagePosts, pagePostsNg } = require('../utils/post');
const { fetchTeam } = require('../utils/team');
const { fetchQueueTeamForRead } = require('../utils/access');

module.exports = [
  method('GET'),
  oauth(),
  scopes('admin', 'posts', 'posts.read'),
  rateLimit(),
  timelinePagingFuture({ daysIntoFuture: 30 }),
  async req => {
    const { query, user } = req;
    const queueId = ObjectId.isValid(query.queue) && query.queue;
    const teamId = ObjectId.isValid(query.team) && query.team;

    let dbTeam;
    let dbQueue;
    let listQueues;

    if (queueId) {
      const { error: queueError, ...queueOther } = await fetchQueueTeamForRead({ user, query });
      if (queueError) {
        return queueError;
      }
      dbTeam = queueOther.dbTeam;
      dbQueue = queueOther.dbQueue;
      listQueues = [dbQueue];
    } else if (teamId) {
      dbTeam = await fetchTeam(teamId);
      if (!dbTeam) {
        return createError('team_not_found');
      }
      listQueues = dbTeam.canUserManageProfile(user)
        ? dbTeam.accounts
        : dbTeam.accounts.filter(a => dbTeam.canUserManageAccount(user, a));
    } else {
      return createError('missing_arg', "Missing arguments: 'team' or 'queue'");
    }

    const isMember = user.memberOfProfiles.indexOf(dbTeam._id.toString()) > -1;
    if (!isMember) {
      return createError('access_denied');
    }

    const isNg: Boolean = listQueues.reduce((r, q) => r || !!q.ng, false);

    const { posts, latest, has_more } = isNg
      ? await pagePostsNg({
          req,
          query: {
            _id: { $in: listQueues.map(q => q._id) }
          },
          dbSortDirection: -1
        })
      : await pagePosts({
          req,
          query: {
            aid: { $in: listQueues.map(q => q._id) },
            state: { $ne: States.post.draft.code }
          },
          dbSortField: 'publishAt',
          dbSortDirection: -1
        });

    return { ok: true, latest, has_more, posts };
  }
];
