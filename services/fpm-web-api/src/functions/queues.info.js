const { oauth, scopes, isEmailVisibleByScope } = require('../utils/oauth');
const { args, method, rateLimit } = require('../utils/http');
const { isTrue } = require('../utils/text');
const { infoQueue } = require('../utils/queue');
const { fetchQueueTeamForRead } = require('../utils/access');

module.exports = [
  method('GET'),
  args('queue'),
  oauth(),
  scopes('admin', 'queues', 'queues.read'),
  rateLimit(),
  async req => {
    const { query, user } = req;

    const full = isTrue(query.full || 'false');

    const { dbTeam, error: queueError } = await fetchQueueTeamForRead({ query, user });
    if (queueError) {
      return queueError;
    }

    const isEmailVisible = isEmailVisibleByScope(req);
    const queue = await infoQueue({ user, dbTeam, isEmailVisible, full });

    return { ok: true, queue };
  }
];
