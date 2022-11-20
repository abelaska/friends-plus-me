const { oauth, scopes, isEmailVisibleByScope } = require('../utils/oauth');
const { method, rateLimit } = require('../utils/http');
const { listTeams } = require('../utils/team');
const { isTrue } = require('../utils/text');

module.exports = [
  method('GET'),
  oauth(),
  scopes('admin', 'teams', 'teams.read'),
  rateLimit(),
  async req => {
    const { query, user } = req;

    const excludeMembers = isTrue(query.exclude_members);
    const excludeQueues = isTrue(query.exclude_queues);
    const isEmailVisible = isEmailVisibleByScope(req);

    const teams = await listTeams({ user, excludeMembers, excludeQueues, isEmailVisible });

    return { ok: true, teams };
  }
];
