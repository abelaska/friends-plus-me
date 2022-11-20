const { oauth, scopes, isEmailVisibleByScope } = require('../utils/oauth');
const { args, method, rateLimit } = require('../utils/http');
const { listQueues } = require('../utils/queue');
const { fetchTeamForRead } = require('../utils/access');

module.exports = [
  method('GET'),
  args('team'),
  oauth(),
  scopes('admin', 'queues', 'queues.read'),
  rateLimit(),
  async req => {
    const { query, user } = req;

    const { dbTeam, error } = await fetchTeamForRead({ user, query, full: true });
    if (error) {
      return error;
    }

    const isEmailVisible = isEmailVisibleByScope(req);

    const queues = await listQueues({ user, dbTeam, isEmailVisible });

    return { ok: true, queues };
  }
];
