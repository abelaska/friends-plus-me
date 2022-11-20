/* eslint no-case-declarations: "off" */
const { oauth, scopes } = require('../utils/oauth');
const { createError } = require('../utils/error');
const { args, method, rateLimit, extractScheduleArgs } = require('../utils/http');
const { unix } = require('../utils/time');
const { scheduleAndSavePost } = require('../utils/scheduling');
const { mapPostState, transformDbPost, enhancePostsUsers } = require('../utils/post');
const { fetchPostForWrite, fetchQueueTeamForSchedule } = require('../utils/access');

module.exports = [
  method('GET'),
  args('post'),
  oauth(),
  scopes('admin', 'posts', 'posts.schedule'),
  rateLimit(),
  async req => {
    const { query, user, deps: { postScheduler, queueManager } } = req;

    const {
      schedule,
      publishAt,
      repeat,
      repeatCount,
      repeatInterval,
      repeatIntervalUnit,
      error: scheduleArgsError
    } = extractScheduleArgs({ query });
    if (scheduleArgsError) {
      return scheduleArgsError;
    }

    const { dbPost, error: postError } = await fetchPostForWrite({ user, query });
    if (postError) {
      return postError;
    }
    if (mapPostState(dbPost) !== 'scheduled') {
      return createError('invalid_post_state');
    }

    const { dbQueue, error: queueError } = await fetchQueueTeamForSchedule({
      user,
      skipQueueSize: true,
      query: { queue: dbPost.aid.toString() }
    });
    if (queueError) {
      return queueError;
    }

    if (repeat && !dbQueue.ng) {
      return createError('invalid_request', `Queue ${dbQueue._id.toString()} do not support repeat publishing`);
    }

    dbPost.modified = unix(new Date());
    dbPost.modifiedBy = user._id;

    await scheduleAndSavePost({
      dbPost,
      dbQueue,
      schedule,
      publishAt,
      repeatCount,
      repeatInterval,
      repeatIntervalUnit,
      postScheduler,
      queueManager,
      isReschedule: true
    });

    const posts = [await transformDbPost({ dbPost })];
    const post = (await enhancePostsUsers({ posts }))[0];

    return { ok: true, post };
  }
];
