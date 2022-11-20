const { States } = require('@fpm/constants');
const { oauth, scopes } = require('../utils/oauth');
const { args, method, rateLimit } = require('../utils/http');
const { pagePosts } = require('../utils/post');
const { fetchQueueTeamForWrite } = require('../utils/access');

module.exports = [
  method('GET'),
  args('queue'),
  oauth(),
  scopes('admin', 'queues', 'queues.write'),
  rateLimit(),
  async req => {
    const { query, user, deps: { accountManager } } = req;

    const { dbTeam, dbQueue, error: queueError } = await fetchQueueTeamForWrite({ query, user });
    if (queueError) {
      return queueError;
    }

    // accountManager.removeAccount(dbTeam, dbQueue, user, (err, updatedProfile) => {
    //   if (err) {
    //     return res.status(500).send({
    //       error: {
    //         message: `Failed to remove queue ${account._id.toString()} from team ${profile._id.toString()}`
    //       }
    //     });
    //   }
    //   return res.status(200).send({
    //     user: {
    //       accounts: secureAccounts(updatedProfile.accounts),
    //       routes: updatedProfile.routes,
    //       profiles: updatedProfile.profiles
    //     }
    //   });
    // });

    const deleted = false;

    return { ok: true, deleted };
  }
];
