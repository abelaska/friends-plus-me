const { oauth, scopes, isEmailVisibleByScope } = require('../utils/oauth');
const { args, method, rateLimit } = require('../utils/http');
const { infoTeam } = require('../utils/team');
const { fetchTeamForRead } = require('../utils/access');
const { isTrue } = require('../utils/text');

module.exports = [
  method('GET'),
  args('team'),
  oauth(),
  scopes('admin', 'teams', 'teams.read'),
  rateLimit(),
  async req => {
    const { query, user } = req;

    const { dbTeam, error } = await fetchTeamForRead({ user, query, full: true });
    if (error) {
      return error;
    }

    const excludeMembers = isTrue(query.exclude_members);
    const excludeQueues = isTrue(query.exclude_queues);
    const isEmailVisible = isEmailVisibleByScope(req);

    const team = await infoTeam({ user, dbTeam, isEmailVisible, excludeQueues, excludeMembers });

    return { ok: true, team };
  }
];
