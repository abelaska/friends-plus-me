const log = require('@fpm/logging').default;
const { QueueInvalidSchedulerError } = require('@fpm/queue');
const { oauth, scopes } = require('../utils/oauth');
const { createError } = require('../utils/error');
const { args, method, json, sanitizeBody, rateLimit } = require('../utils/http');
const { updateQueueScheduling, rescheduleQueuePosts, enhanceQueuesUsers, transformDbQueue } = require('../utils/queue');
const { validateTimezone, validateSchedulingType, convertSchedules, convertCounts } = require('../utils/scheduling');
const { validateBody } = require('../utils/validations');
const { fetchQueueTeamForWrite } = require('../utils/access');

module.exports = [
  method('POST'),
  args('queue'),
  json(),
  validateBody(),
  oauth(),
  scopes('admin', 'queues', 'queues.write'),
  rateLimit(),
  sanitizeBody(),
  async req => {
    const { query, user, deps: { postScheduler, queueManager } } = req;

    const { dbQueue, error: queueError } = await fetchQueueTeamForWrite({ query, user });
    if (queueError) {
      return queueError;
    }

    const timezone = (req.body.timezone && validateTimezone(req.body.timezone)) || undefined;
    const type = (req.body.type && validateSchedulingType(req.body.type.toLowerCase())) || undefined;
    const schedules = (type && req.body.schedules && convertSchedules(req.body.schedules)) || undefined;
    const delay = (type && req.body.delay) || undefined;
    let counts = (type && req.body.counts && convertCounts(req.body.counts)) || undefined;

    if (type === 'counts') {
      const weekPosts = (counts || []).reduce((r, v) => r + v, 0);
      if (counts.length !== 7 || weekPosts === 0) {
        counts = [10, 10, 10, 10, 10, 10, 10];
      }
    }

    try {
      await updateQueueScheduling({ queueManager, dbQueue, timezone, type, schedules, delay, counts });
    } catch (error) {
      if (error instanceof QueueInvalidSchedulerError) {
        return createError('invalid_request', error.message);
      }
      throw error;
    }

    const queue = await transformDbQueue({ dbQueue });

    await enhanceQueuesUsers({ queues: [queue] });

    // do not wait for queue posts reschedule, process async in the background
    if (!dbQueue.ng) {
      rescheduleQueuePosts({ dbQueue, postScheduler, queueManager })
        .then(() => {})
        .catch(error => {
          log.error(`Failed to reschedule posts for queue ${dbQueue._id.toString()}`, {
            message: error.toString(),
            error
          });
        });
    }

    return { ok: true, queue };
  }
];
